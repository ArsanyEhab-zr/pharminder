/**
 * Live Global Medication & RxCUI Resolution Service
 * Exclusively powered by the National Institutes of Health (NIH) / National Library of Medicine (NLM):
 * 1. NIH RxTerms REST API: https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=
 * 2. NIH RxNav REST API:   https://rxnav.nlm.nih.gov/REST/rxcui.json
 *
 * Zero hardcoded mock drug lists. Every medication search and RxCUI resolution queries live NIH endpoints.
 */

export const NIH_RXTERMS_ENDPOINT =
  'https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search'

export const NIH_RXNAV_BASE = 'https://rxnav.nlm.nih.gov/REST'

const searchCache = new Map()
const rxcuiCache = new Map()

/**
 * Extracts a stored RxCUI from a medication object or formatted description string.
 * Supports both a native `rxcui` column and `[RxCUI:12345]` metadata tags stored in `description` or `category`.
 */
export function extractRxCui(medOrString) {
  if (!medOrString) return null

  if (typeof medOrString === 'object') {
    if (medOrString.rxcui && /^\d+$/.test(String(medOrString.rxcui).trim())) {
      return String(medOrString.rxcui).trim()
    }
    if (
      medOrString.ingredientRxcui &&
      /^\d+$/.test(String(medOrString.ingredientRxcui).trim())
    ) {
      return String(medOrString.ingredientRxcui).trim()
    }
    const combinedText = [
      medOrString.description,
      medOrString.category,
      medOrString.name,
    ]
      .filter(Boolean)
      .join(' ')
    const match = combinedText.match(/\[?RxCUI:\s*(\d+)\]?/i)
    if (match?.[1]) return match[1]
    return null
  }

  if (typeof medOrString === 'string') {
    const match = medOrString.match(/\[?RxCUI:\s*(\d+)\]?/i)
    if (match?.[1]) return match[1]
  }

  return null
}

/**
 * Formats a medication description so that the RxCUI is always persisted in Supabase
 * even if the remote PostgreSQL `medications` table only has standard text columns.
 */
export function formatDescriptionWithRxCui(rxcui, baseDescription = '') {
  const cleanDesc = String(baseDescription || '')
    .replace(/\[RxCUI:\s*\d+\]\s*/gi, '')
    .trim()
  if (!rxcui) return cleanDesc || 'NIH RxTerms Global Formulary Medication'
  return `[RxCUI:${rxcui}] ${cleanDesc || 'NIH RxTerms Global Formulary Medication'}`
}

/**
 * Cleans NIH RxTerms display name (e.g. "metFORMIN (Oral Pill)" -> "Metformin")
 */
export function formatRxTermsDisplayName(rawDisplay = '') {
  const withoutRoute = String(rawDisplay || '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .trim()
  if (!withoutRoute) return rawDisplay
  return withoutRoute
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Extracts clean active ingredient name from a medication display string
 * e.g. "Warfarin 5mg (Oral Tablet)" -> "warfarin"
 * e.g. "Amoxicillin 500 mg Cap" -> "amoxicillin"
 */
export function extractBaseIngredientName(rawMedName = '') {
  if (!rawMedName || typeof rawMedName !== 'string') return ''
  return rawMedName
    .replace(/\[RxCUI:\s*\d+\]/gi, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(
      /\b\d+(\.\d+)?\s*(mg|mcg|ug|g|ml|l|iu|meq|%|unt|actuation|dose|puffs?)\b/gi,
      ' '
    )
    .replace(
      /\b(tab|tabs|cap|caps|tablet|tablets|capsule|capsules|oral|pill|pills|sublingual|extended|release|delayed|chewable|injection|injectable|intravenous|solution|suspension|syrup|cream|ointment|gel|patch|spray|drops|inhaler|film|coated|effervescent|disintegrating|er|xr|sr|cr|dr)\b/gi,
      ' '
    )
    .replace(/[^a-zA-Z\s/-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Fetch helper with AbortController timeout so external clinical APIs never stall the UI.
 */
async function fetchJsonWithTimeout(url, timeoutMs = 4500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Resolves the Concept Unique Identifier (RxCUI), active generic ingredients (tty=IN+MIN),
 * and NIH RxClass pharmacological classes for any medication name using live NIH RxNav APIs.
 *
 * @param {string|object} medInput Medication object or drug name string
 * @param {string} [overrideSearchName] Optional pre-normalized generic name (e.g. from BRAND_AND_SYNONYM_MAP)
 * @returns {Promise<{
 *   rxcui: string|null,
 *   ingredientRxcui: string|null,
 *   ingredientName: string,
 *   ingredients: string[],
 *   rxClasses: string[]
 * }>}
 */
export async function resolveDrugRxCui(medInput, overrideSearchName = '') {
  const existingRxcui = extractRxCui(medInput)
  const rawName =
    typeof medInput === 'object'
      ? medInput?.cleanName || medInput?.baseName || medInput?.name || ''
      : String(medInput || '')

  const baseIngredient =
    (overrideSearchName && extractBaseIngredientName(overrideSearchName)) ||
    extractBaseIngredientName(rawName)
  const firstWord = baseIngredient.split(/\s+/)[0]?.toLowerCase() || ''
  const cacheKey = `${baseIngredient.toLowerCase()}|${existingRxcui || ''}`

  if (rxcuiCache.has(cacheKey)) {
    return rxcuiCache.get(cacheKey)
  }

  let resolvedRxcui = existingRxcui || null
  let ingredientRxcui =
    (typeof medInput === 'object' && medInput?.ingredientRxcui) || null
  let ingredientName = baseIngredient || rawName
  const ingredientsSet = new Set()
  const rxClassesSet = new Set()

  if (baseIngredient) {
    baseIngredient
      .split(/[/+,]/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length >= 3)
      .forEach((part) => ingredientsSet.add(part))
  }

  try {
    // 1. If we don't have an RxCUI yet, query live NIH RxNav /REST/rxcui.json
    if (!resolvedRxcui && baseIngredient) {
      const exactJson = await fetchJsonWithTimeout(
        `${NIH_RXNAV_BASE}/rxcui.json?name=${encodeURIComponent(baseIngredient)}&search=2`
      )
      const idList = exactJson?.idGroup?.rxnormId
      if (Array.isArray(idList) && idList.length > 0) {
        resolvedRxcui = String(idList[0])
      }
    }

    // 2. Fallback to NIH RxNav approximateTerm.json if multi-word, brand, or salt form
    if (!resolvedRxcui && (baseIngredient || firstWord)) {
      const queryTerm = baseIngredient || firstWord
      const approxJson = await fetchJsonWithTimeout(
        `${NIH_RXNAV_BASE}/approximateTerm.json?term=${encodeURIComponent(queryTerm)}&maxEntries=3`
      )
      const candidates = approxJson?.approximateGroup?.candidate
      if (Array.isArray(candidates) && candidates.length > 0) {
        resolvedRxcui = String(candidates[0].rxcui)
      }
    }

    // 3. Fallback to NIH RxTerms search if still unresolved
    if (!resolvedRxcui && firstWord) {
      const rxTermsJson = await fetchJsonWithTimeout(
        `${NIH_RXTERMS_ENDPOINT}?terms=${encodeURIComponent(firstWord)}&ef=RXCUIS,SXDG_RXCUI&maxList=1`
      )
      const ef = rxTermsJson?.[2] || {}
      const rxcuiArr = ef.RXCUIS?.[0]
      const sxdg = ef.SXDG_RXCUI?.[0]
      if (Array.isArray(rxcuiArr) && rxcuiArr.length > 0) {
        resolvedRxcui = String(rxcuiArr[0])
      } else if (sxdg) {
        resolvedRxcui = String(sxdg)
      }
    }

    // 4. Resolve base active ingredient(s) (tty=IN+MIN) from RxNav so product-level and brand names map to exact generic IN(s)
    if (resolvedRxcui) {
      const relatedJson = await fetchJsonWithTimeout(
        `${NIH_RXNAV_BASE}/rxcui/${encodeURIComponent(resolvedRxcui)}/related.json?tty=IN+MIN`
      )
      const conceptGroups = relatedJson?.relatedGroup?.conceptGroup || []
      for (const group of conceptGroups) {
        const props = group?.conceptProperties
        if (Array.isArray(props) && props.length > 0) {
          if (!ingredientRxcui) {
            ingredientRxcui = String(props[0].rxcui)
          }
          if (props[0].name && (group.tty === 'IN' || !ingredientName)) {
            ingredientName = props[0].name
          }
          props.forEach((prop) => {
            if (prop?.name) {
              prop.name
                .split(/[/,]/)
                .map((s) => s.trim().toLowerCase())
                .filter((s) => s.length >= 3)
                .forEach((p) => ingredientsSet.add(p))
            }
          })
        }
      }

      // 5. Resolve NIH RxClass pharmacological classes (ATC / EPC / VA) for universal class mapping
      const classTargetRxcui = ingredientRxcui || resolvedRxcui
      const rxClassJson = await fetchJsonWithTimeout(
        `${NIH_RXNAV_BASE}/rxclass/class/byRxcui.json?rxcui=${encodeURIComponent(classTargetRxcui)}`
      )
      const classInfos = rxClassJson?.rxclassMinConceptList?.rxclassMinConcept || []
      classInfos.forEach((cls) => {
        if (cls?.className) {
          rxClassesSet.add(cls.className.toLowerCase())
        }
      })
    }
  } catch (err) {
    console.warn('NIH RxNav RxCUI resolution error:', err.message)
  }

  const finalResult = {
    rxcui: resolvedRxcui || ingredientRxcui || null,
    ingredientRxcui: ingredientRxcui || resolvedRxcui || null,
    ingredientName: ingredientName || baseIngredient || rawName,
    ingredients: [...ingredientsSet],
    rxClasses: [...rxClassesSet],
  }

  if (finalResult.rxcui || finalResult.ingredients.length > 0) {
    rxcuiCache.set(cacheKey, finalResult)
  }

  return finalResult
}

/**
 * Queries the live NIH ClinicalTables RxTerms v3 API for global medications.
 * Returns exclusivamente live API results along with their official RxCUIs.
 *
 * @param {string} searchTerm
 * @param {number} maxList
 * @returns {Promise<Array>} Array of live NIH RxTerms medication objects with RxCUI
 */
export async function searchGlobalMedications(searchTerm, maxList = 12) {
  const trimmed = (searchTerm || '').trim()
  if (!trimmed || trimmed.length < 2) {
    return []
  }

  const cacheKey = `${trimmed.toLowerCase()}::${maxList}`
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)
  }

  const url = `${NIH_RXTERMS_ENDPOINT}?terms=${encodeURIComponent(
    trimmed
  )}&ef=STRENGTHS_AND_FORMS,RXCUIS,DISPLAY_NAME_SYNONYM,SXDG_RXCUI&maxList=${maxList}`

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`NIH RxTerms API returned HTTP ${response.status}`)
  }

  const payload = await response.json()
  // Format: [totalCount, codeArray, extraFieldsObj, displayStringsArray]
  const codeArray = payload?.[1] || []
  const extraFields = payload?.[2] || {}
  const displayList = payload?.[3] || []
  const strengthsList = extraFields.STRENGTHS_AND_FORMS || []
  const rxcuisList = extraFields.RXCUIS || []
  const sxdgRxcuiList = extraFields.SXDG_RXCUI || []
  const synonymsList = extraFields.DISPLAY_NAME_SYNONYM || []

  const parsedResults = []

  displayList.forEach((row, index) => {
    const rawName = Array.isArray(row) ? row[0] : String(row || '')
    const cleanBaseName = formatRxTermsDisplayName(rawName)
    const routeMatch = rawName.match(/\(([^)]+)\)/)
    const routeLabel = routeMatch ? routeMatch[1] : 'Oral Formulation'
    const strengths = Array.isArray(strengthsList[index]) ? strengthsList[index] : []
    const strengthRxcuis = Array.isArray(rxcuisList[index]) ? rxcuisList[index] : []
    const sxdgRxcui = sxdgRxcuiList[index] ? String(sxdgRxcuiList[index]) : null
    const conceptCode = codeArray[index] ? String(codeArray[index]) : null
    const synonyms = Array.isArray(synonymsList[index])
      ? synonymsList[index].join(', ')
      : ''

    // Build map of strength -> specific RxCUI
    const strengthToRxcuiMap = {}
    strengths.forEach((str, sIdx) => {
      if (strengthRxcuis[sIdx]) {
        strengthToRxcuiMap[str.trim()] = String(strengthRxcuis[sIdx])
      }
    })

    const primaryStrength = strengths[0] ? strengths[0].trim() : ''
    const primaryRxcui =
      (strengthRxcuis[0] && String(strengthRxcuis[0])) ||
      sxdgRxcui ||
      conceptCode ||
      null

    const fullMedName = primaryStrength
      ? `${cleanBaseName} (${primaryStrength})`
      : cleanBaseName

    parsedResults.push({
      id: `rxterms-${primaryRxcui || index}-${cleanBaseName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')}`,
      name: fullMedName,
      cleanName: cleanBaseName,
      baseName: cleanBaseName,
      rxcui: primaryRxcui,
      ingredientRxcui: sxdgRxcui || primaryRxcui,
      strengthToRxcuiMap,
      strengths: strengths.slice(0, 8),
      availableStrengths: strengths.slice(0, 8),
      dosage_form: primaryStrength || routeLabel,
      category: synonyms
        ? `Brand/Synonym: ${synonyms}`
        : `NIH RxTerms (${routeLabel})`,
      description: formatDescriptionWithRxCui(
        primaryRxcui,
        `NIH RxTerms Formulary • ${rawName}`
      ),
      isGlobalApi: true,
      source: 'NIH RxTerms API',
    })
  })

  searchCache.set(cacheKey, parsedResults)
  return parsedResults
}

/**
 * Persists a medication and its resolved RxCUI into Supabase `public.medications`.
 * Attempts to write to `rxcui` column if present in schema, and always embeds `[RxCUI:xxxx]`
 * in `description` so the RxCUI is guaranteed to be stored in Supabase without schema errors.
 */
export async function upsertMedicationWithRxCui(client, medObj) {
  const medName = (medObj.name || '').trim()
  if (!medName) throw new Error('Medication name is required')

  // Ensure RxCUI is resolved before saving to Supabase
  let rxcui = extractRxCui(medObj)
  if (!rxcui) {
    const resolved = await resolveDrugRxCui(medObj)
    rxcui = resolved.rxcui
  }

  const formattedDescription = formatDescriptionWithRxCui(
    rxcui,
    medObj.description || `NIH RxTerms Global Medication (${medName})`
  )
  const category = medObj.category || 'NIH RxTerms Formulary'
  const dosageForm = medObj.dosage_form || 'Oral Tablet / Capsule'

  // Check if medication already exists in public.medications
  const { data: existingMed } = await client
    .from('medications')
    .select('*')
    .ilike('name', medName)
    .maybeSingle()

  if (existingMed?.id) {
    const existingRxcui = extractRxCui(existingMed)
    if (!existingRxcui && rxcui) {
      // Update existing row so its RxCUI is stored in Supabase
      const { data: updatedMed } = await client
        .from('medications')
        .update({
          description: formattedDescription,
        })
        .eq('id', existingMed.id)
        .select()
        .maybeSingle()

      return {
        ...(updatedMed || existingMed),
        rxcui: rxcui || existingRxcui,
      }
    }
    return {
      ...existingMed,
      rxcui: existingRxcui || rxcui,
    }
  }

  // Try inserting with `rxcui` column first; if the remote table doesn't have an `rxcui` column,
  // fallback immediately to standard columns with `[RxCUI:...]` in `description`.
  if (rxcui) {
    const { data: insertedWithCol, error: colErr } = await client
      .from('medications')
      .insert({
        name: medName,
        rxcui: String(rxcui),
        description: formattedDescription,
        category,
        dosage_form: dosageForm,
      })
      .select()
      .maybeSingle()

    if (!colErr && insertedWithCol) {
      return { ...insertedWithCol, rxcui: String(rxcui) }
    }
  }

  const { data: insertedMed, error: insertErr } = await client
    .from('medications')
    .insert({
      name: medName,
      description: formattedDescription,
      category,
      dosage_form: dosageForm,
    })
    .select()
    .single()

  if (insertErr) throw insertErr

  return {
    ...insertedMed,
    rxcui: rxcui ? String(rxcui) : extractRxCui(insertedMed),
  }
}

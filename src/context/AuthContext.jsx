import React, { useEffect, useState, useCallback } from 'react'
import { AuthContext } from './auth-context'
import { supabase, supabaseAdmin } from '../lib/supabase'

const inferRoleFromUser = (u) => {
  if (!u) return null
  return u.user_metadata?.role || null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null
    try {
      const client = supabaseAdmin || supabase
      const { data, error: profileErr } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profileErr) {
        console.warn('Profile fetch note:', profileErr.message)
        return null
      }
      return data
    } catch (err) {
      console.warn('Could not fetch user profile:', err)
      return null
    }
  }, [])

  const syncUserProfile = useCallback(
    async (currentUser) => {
      if (!currentUser) {
        setProfile(null)
        setRole(null)
        return null
      }

      const fallbackRole = inferRoleFromUser(currentUser)
      const fallbackName =
        currentUser.user_metadata?.full_name ||
        currentUser.email?.split('@')[0] ||
        'User'

      if (fallbackRole) {
        setRole((prev) => prev || fallbackRole)
      }
      setProfile((prev) =>
        prev && prev.id === currentUser.id
          ? prev
          : {
              id: currentUser.id,
              role: fallbackRole,
              full_name: fallbackName,
              email: currentUser.email,
            }
      )

      try {
        let userProfile = await fetchProfile(currentUser.id)

        // Create profile from verified auth metadata ONLY if row doesn't exist yet and role is known
        if (!userProfile && fallbackRole) {
          const client = supabaseAdmin || supabase
          const { data: newProfile, error: upsertErr } = await client
            .from('profiles')
            .upsert({
              id: currentUser.id,
              role: fallbackRole,
              full_name: fallbackName,
              email: currentUser.email,
            })
            .select()
            .maybeSingle()

          if (!upsertErr && newProfile) {
            userProfile = newProfile
          }
        }

        if (userProfile) {
          setProfile(userProfile)
          setRole(userProfile.role || fallbackRole)
          return userProfile
        }
      } catch (err) {
        console.warn('Profile sync warning:', err)
      }

      return {
        id: currentUser.id,
        role: fallbackRole,
        full_name: fallbackName,
        email: currentUser.email,
      }
    },
    [fetchProfile]
  )

  useEffect(() => {
    let mounted = true

    // Hard timeout failsafe so loading state can NEVER hang the app
    const failsafeTimer = setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 2500)

    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
          error: sessionErr,
        } = await supabase.auth.getSession()

        if (sessionErr) {
          console.warn('Initial session check warning:', sessionErr.message)
        }

        if (mounted) {
          setSession(initialSession || null)
          const initialUser = initialSession?.user || null
          setUser(initialUser)

          if (initialUser) {
            setRole(inferRoleFromUser(initialUser))
            setLoading(false)
            syncUserProfile(initialUser)
          } else {
            setLoading(false)
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('Auth initialization error:', err)
          setError(err.message)
          setLoading(false)
        }
      } finally {
        clearTimeout(failsafeTimer)
        if (mounted) setLoading(false)
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return

      setSession(newSession || null)
      const nextUser = newSession?.user || null
      setUser(nextUser)

      if (nextUser) {
        setRole(inferRoleFromUser(nextUser))
        setLoading(false)
        setTimeout(() => {
          if (mounted) syncUserProfile(nextUser)
        }, 0)
      } else {
        setProfile(null)
        setRole(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(failsafeTimer)
      subscription?.unsubscribe()
    }
  }, [syncUserProfile])

  const signIn = async ({ email, password, expectedRole }) => {
    setError(null)
    setLoading(true)
    try {
      const normalizedEmail = (email || '').trim().toLowerCase()
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInErr) throw signInErr

      if (data?.user) {
        const userProfile = await syncUserProfile(data.user)
        const resolvedRole = userProfile?.role || data.user.user_metadata?.role

        if (expectedRole && resolvedRole && resolvedRole !== expectedRole) {
          await supabase.auth.signOut()
          setUser(null)
          setSession(null)
          setProfile(null)
          setRole(null)
          throw new Error(
            expectedRole === 'patient'
              ? 'Access restricted: Clinician accounts must sign in through the Doctor Portal.'
              : 'Access restricted: Patient accounts must sign in through the Patient Portal.'
          )
        }
      }

      return { data, error: null }
    } catch (err) {
      setError(err.message)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async ({
    email,
    password,
    fullName,
    role: requestedRole = 'patient',
    age = null,
    gender = null,
    specialty = '',
    licenseNumber = '',
  }) => {
    setError(null)
    setLoading(true)
    try {
      const normalizedEmail = (email || '').trim().toLowerCase()
      const cleanedName = (fullName || '').trim()
      if (!cleanedName || !normalizedEmail || !password) {
        throw new Error('Full name, email address, and password are required.')
      }

      const userMetadata = {
        full_name: cleanedName,
        role: requestedRole,
        ...(specialty?.trim() ? { specialty: specialty.trim() } : {}),
        ...(licenseNumber?.trim() ? { license_number: licenseNumber.trim() } : {}),
      }

      let authUser = null
      let activeSession = null

      if (supabaseAdmin) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        )
        if (existingUser) {
          throw new Error('An account with this email already exists. Please sign in instead.')
        }

        const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: userMetadata,
        })

        if (createErr) throw createErr
        authUser = createData?.user || null
      } else {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: userMetadata,
          },
        })

        if (signUpErr) throw signUpErr
        if (signUpData?.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
          throw new Error('An account with this email already exists. Please sign in instead.')
        }
        authUser = signUpData?.user || null
        activeSession = signUpData?.session || null
      }

      if (!authUser) {
        throw new Error('Failed to create user account.')
      }

      const dbClient = supabaseAdmin || supabase
      const { data: newProfile, error: profileErr } = await dbClient
        .from('profiles')
        .upsert({
          id: authUser.id,
          role: requestedRole,
          full_name: cleanedName,
          email: normalizedEmail,
        })
        .select()
        .maybeSingle()

      if (profileErr) {
        throw profileErr
      }

      if (newProfile) {
        setProfile(newProfile)
        setRole(newProfile.role)
      }

      // Initialize 100% clean, empty patients_data record for new patient accounts
      if (requestedRole === 'patient') {
        const parsedAge = age !== null && age !== '' ? parseInt(age, 10) : null
        await dbClient
          .from('patients_data')
          .upsert(
            {
              user_id: authUser.id,
              age: Number.isFinite(parsedAge) ? parsedAge : null,
              gender: gender ? gender.trim() : null,
              height: null,
              weight: null,
              chronic_diseases: [],
              family_history: null,
            },
            { onConflict: 'user_id' }
          )
      }

      if (!activeSession) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })

        if (signInErr) throw signInErr

        if (signInData?.user) {
          await syncUserProfile(signInData.user)
        }
        return { data: signInData, error: null }
      }

      await syncUserProfile(authUser)
      return { data: { user: authUser, session: activeSession }, error: null }
    } catch (err) {
      setError(err.message)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setError(null)
    setLoading(true)
    try {
      const { error: signOutErr } = await supabase.auth.signOut()
      if (signOutErr) throw signOutErr
      setUser(null)
      setSession(null)
      setProfile(null)
      setRole(null)
      return { error: null }
    } catch (err) {
      setError(err.message)
      return { error: err }
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = useCallback(async () => {
    if (user) {
      return await syncUserProfile(user)
    }
    return null
  }, [user, syncUserProfile])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

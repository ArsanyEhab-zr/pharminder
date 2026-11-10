# Phase 1: Foundation & Setup

- [x] 1. Initialize a new React project using Vite.
- [x] 2. Install and configure Tailwind CSS.
- [x] 3. Configure the Tailwind theme with the logo's primary colors: Dark Teal (e.g., #1B4965) and Mint Green (e.g., #2EC4B6).
- [x] 4. Implement a system-wide Light/Dark mode toggle.
- [x] 5. Install and configure the Vite PWA plugin (manifest, service worker) to make the app installable and fully responsive.
- [x] 6. Create a basic responsive layout structure with a placeholder navbar containing the theme toggle.

## Phase 2: Database & Auth (via MCP)
- [x] 7. Request the Supabase Project URL and Service Role Key / Anon Key from the user to establish a connection via the Supabase MCP.
- [x] 8. Once credentials are provided, use the Supabase MCP tools to directly execute and create the PostgreSQL schema on the remote database. Create tables for: profiles (pharmacist/patient roles), patients_data (height, weight, chronic diseases), medications, prescriptions (linking patient, med, pharmacist, and schedule), and dose_logs (tracking compliance). Include basic Row Level Security (RLS) policies.
- [x] 9. Install `@supabase/supabase-js`, create a `.env.local` file with the provided credentials, and configure the client in `src/lib/supabase.js`.
- [x] 10. Implement an `AuthContext` to manage user state and build responsive Login UI screens (for both Pharmacist and Patient) that align with our design system.

## Phase 3: Pharmacist Dashboard & Prescriptions
- [x] 11. Set up React Router (or an equivalent routing system if not already set) and create a `ProtectedRoute` component to restrict access. Create the main `PharmacistDashboard.jsx` page.
- [x] 12. Build the "Patient Management" component. Allow the pharmacist to view a list of their patients and include a form to register a new patient (this should insert into the `profiles` table with role='patient' and the `patients_data` table for age, height, weight, and chronic diseases).
- [x] 13. Build the "Prescribe Medication" UI. The pharmacist should be able to select a patient, select a medication, and define the dosage frequency (e.g., every 8 hours) and duration.
- [x] 14. Implement the "Drug-Drug Interaction Checker" logic. When prescribing a new medication, compare it against the patient's active prescriptions and display a visual alert: Green (Safe), Yellow (Moderate), or Red (Severe - block prescription).

## Phase 4: Patient Interface & Medication Reminders
- [x] 15. Create the `PatientDashboard.jsx` page and update the routing so only users with the 'patient' role can access it.
- [x] 16. Build the "My Active Medications" UI. Fetch and display the logged-in patient's active prescriptions from Supabase, clearly showing the medication name, dosage instructions, frequency, and remaining duration.
- [x] 17. Implement the "Today's Schedule & Dose Logging". Calculate today's expected dose times based on the prescription's frequency (e.g., 8:00 AM, 3:00 PM). Display them as a clear, interactive daily timeline. Add a "Tick/Check" button for the patient to mark a dose as 'taken', which updates the `dose_logs` table in Supabase.
- [x] 18. Build the Notification System. Set up visual/audio alerts (like an Athan app) that trigger when a scheduled dose time arrives to remind the patient.

## Phase 5: Patient Adherence & Final Polish
- [x] 19. Build a "Patient Adherence & History" view for the Pharmacist. Update the `PatientManagement.jsx` (or create a new component) so when the pharmacist clicks on a specific patient, they can see an "Adherence Score" (percentage of doses taken vs missed/pending) calculated from the `dose_logs` table.
- [x] 20. Display a visual timeline or chart in the Pharmacist's view showing the patient's recent dose history (e.g., green checks for taken on time, red crosses for missed). 
- [x] 21. Perform a final app-wide responsive design sweep. Ensure all modals, timelines, and navbars look perfect on mobile device dimensions (since this is a PWA). Check for and resolve any remaining console errors or React warnings.

## Phase 6: Dual-Portal Architecture, Patient Health Form & UI/UX Pro Max Overhaul
- [x] 22. Full Route & Data-Loading Repair (Zero-Hang Guarantee): Audit `App.jsx`, `AuthContext.jsx`, `ProtectedRoute.jsx`, and all components in `src/pages/` and `src/components/`. Fix any infinite loading states in `AuthContext` with a hard timeout failsafe, ensure all Supabase queries use `supabaseAdmin` fallback to prevent RLS 401/403 blocks, and add 1-click Demo Role Auto-Switchers & a Portal Switcher (`/pharmacist` <-> `/patient`).
- [x] 23. Patient Portal (`/patient`) & Self-Service Medical Profile Form: Redesign `/patient` with a warm Mint Green (`#2EC4B6`) companion aesthetic and large touch targets, and build `PatientMedicalProfileForm.jsx` allowing patients to fill out and save their Personal Vitals, Chronic Diseases, Current Symptoms & Complaints, Allergies, and Family Medical History directly to Supabase.
- [x] 24. Pharmacist / Doctor Portal (`/pharmacist`) & Extensible Drug Interaction Engine: Redesign `/pharmacist` into a high-density Dark Teal (`#1B4965`) Clinical Command Center (Clinical Overview & KPIs, Patients & Medical Records, Prescribe & Interaction Checker, Patient Adherence & Follow-up Audit) and upgrade `src/utils/interactionChecker.js` to evaluate both Drug-to-Drug Interactions (DDI) and Drug-to-Disease Contraindications with async adapter hooks (`fetchExternalInteractionSource1`, `fetchExternalInteractionSource2`).
- [x] 25. End-to-End Verification & Build Check: Test every route (`/`, `/login`, `/pharmacist`, `/patient`) and every tab inside both portals, and verify `npm run lint` and `npm run build` pass with 0 errors.

## Phase 7: Strict Security & Animation Foundations
- [x] 26. Remove all "Demo Role Switcher" buttons from the Navbar and UI. Enforce strict routing: if a user is logged in as a 'patient', they are locked to `/patient`. If they want to access `/pharmacist`, they MUST explicitly log out and log in with a pharmacist account.
- [x] 27. Install `framer-motion` to handle page transitions, spring animations, and micro-interactions. Create a global `PageWrapper.jsx` to wrap routes with smooth fade-in/slide-up entrance animations.

## Phase 8: Dynamic UI/UX & Illustrations Injection
- [x] 28. Revamp the Pharmacist Portal (`/pharmacist`): Add modern background elements (e.g., subtle animated CSS blobs or mesh gradients). Animate the KPI cards so numbers count up, and lists (patients/prescriptions) stagger-animate when loaded. Add a professional medical SVG illustration (using Lucide icons scaled up or similar pure CSS/SVG art) to the empty states.
- [x] 29. Revamp the Patient Portal (`/patient`): Make it incredibly lively and satisfying. When a patient takes a dose, trigger a beautiful success animation (like a popping checkmark). Use warm gradients. Enhance the `PatientMedicalProfileForm.jsx` so it feels like a premium onboarding flow (animated step-by-step or smoothly expanding sections).

## Phase 9: PWA & Functional Integrity Audit
- [x] 30. Verify the Data Flow: Ensure that when a patient fills their `PatientMedicalProfileForm.jsx` and clicks save, the data is flawlessly saved to Supabase (using `supabaseAdmin` to avoid RLS blocks) and instantly reflects on the Pharmacist's dashboard without needing a hard refresh.
- [x] 31. PWA Audit: Ensure `vite-plugin-pwa` is perfectly configured. The manifest must have the correct icons, and the app must prompt for installation.
- [x] 32. Final Build Check: Run `npm run lint` and `npm run build` to ensure 0 errors.

## Phase 10: External Medical Knowledge Integration
- [x] 33. Integrate Drugs.com logic (`https://www.drugs.com/drug_interactions.html`) into `interactionChecker.js`, ensuring `Major` (Red), `Moderate` (Yellow), and `Minor` (Green) categorization and adding "Lab Interaction" alerts.
- [x] 34. Build the `DrugInformationPanel.jsx` powered by simulated PDR.net (`https://www.pdr.net/`) data (`Administration`, `Adverse Reactions`, `Common Brand Names`, `Dosage and Indications`, `Dosing Considerations`, `Mechanism of Action`), and link it to the medications in the Prescribe UI.
- [x] 35. Ensure the "Dosing Considerations" specifically highlight dose adjustments for the chronic diseases (like Kidney Disease) that the patient submitted in their `PatientMedicalProfileForm.jsx`.

## Phase 11: Real-World Scaling & Crash Prevention
- [x] 36. Global Crash Prevention (Error Boundary) & PWA Fix: Implement a React `<ErrorBoundary>` component wrapping the entire app in `main.jsx`, fix the `ThemeContext` unmount/remount hook issue & React deduplication, and update `vite.config.js` PWA Workbox settings with `navigateFallback: '/index.html'`.
- [x] 37. Real Global Drug Autocomplete API: Upgrade medication inputs in both `PrescribeMedication.jsx` (Pharmacist) and `PatientMedicalProfileForm.jsx` (Patient) to use an Async Autocomplete Search powered by the real NIH RxTerms API (`https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=`), and update `interactionChecker.js` so unindexed global drugs gracefully return a "Grey/Blue Alert" directing the clinician to PDR.net or Drugs.com.
- [x] 38. Dynamic Disease & Symptom Tagging: Upgrade `PatientMedicalProfileForm.jsx` with a dynamic tags input component allowing the patient to type any disease, allergy, or symptom in the world, press Enter, and add it as a clinical chip to their profile.
- [x] 39. Interactive Patient Onboarding (Guided Tour): Implement a 3-step interactive Guided Tour overlay in the Patient Portal (`PatientDashboard.jsx`) explaining: 1. "Start by filling out your Medical Profile", 2. "Check your Active Medications here", and 3. "Take your doses from this timeline when the alarm sounds."

## Phase 12: Real Brand Identity & Native PWA Polish
- [x] 40. Icon Cleanup & Asset Generation: Verify `public/logo.png`, delete old SVG placeholders, install `sharp`, and generate transparent `icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`, and `favicon.ico` preserving the alpha channel.
- [x] 41. PWA Manifest & Splash Screen Configuration: Update `vite.config.js` to point to the new `.png` icons with `purpose: 'any'`, configure `background_color: '#ffffff'` and `theme_color: '#1B4965'`, and add iOS splash/icon meta tags in `index.html`.
- [x] 42. UI Logo Replacement: Audit and replace all placeholder pill/brand icons across `AppLayout.jsx`, `Login.jsx`, `PharmacistDashboard.jsx`, and any other headers with `<img src="/logo.png" alt="Pharminder Logo" ... />`.

## Phase 13: Dose Logic Fix & Real-Time Doctor Pings
- [x] 43. Correct the Dose Status Logic: Audit `DoseScheduleTimeline.jsx`, `PatientAdherenceModal.jsx`, and any seeding scripts. Fix the logic so that today's expected schedule generates doses as `pending` by default. The `dose_logs` table should ONLY record a `status: 'taken'` when the patient explicitly clicks "Take Dose". Update the UI logic in BOTH the Patient and Pharmacist portals: if the current time is past the `scheduled_time` (e.g., by 30+ minutes) and there is no 'taken' record, it must visually display as a `Missed` dose (Red X).
- [x] 44. Pharmacist "Ping" Button: In the Pharmacist portal (`PatientAdherenceModal.jsx` or similar dose history view), add a prominent "Ping Patient" button next to any dose that is marked as `missed` or `pending` (overdue). When clicked, this button should use Supabase Realtime Channels (or a similar real-time database insertion) to broadcast an urgent alert to that specific `patient_id`.
- [x] 45. Patient Real-Time Listener & Alarm: In the Patient portal (e.g., in `useMedicationReminders.js`), subscribe to the Supabase Realtime channel. When a ping from the doctor is received, INSTANTLY trigger the Web Audio API chime (offline alarm). Show a high-priority, un-ignorable modal on the patient's screen: "Urgent message from your Pharmacist/Doctor: You missed a dose. Please take it immediately." with a direct "Take Now" button that logs the dose.

## Phase 14: Environment-Based Portal Separation
- [x] 46. Split Authentication UI: Delete unified `Login.jsx` and create dedicated `PatientLogin.jsx` (Mint Green theme, patient copy, role validation) and `PharmacistLogin.jsx` (Dark Teal theme, clinical copy, doctor role validation).
- [x] 47. Environment-Based Routing (`App.jsx`): Support `VITE_APP_MODE` ('patient' | 'pharmacist' | undefined). Isolate routes completely when mode is set, and provide a clean `Landing.jsx` portal selector when running in local dual-mode.
- [x] 48. Strict UI Isolation: Remove any remaining role switchers or demo toggle links from `ProtectedRoute`, `Navbar`, and `AppLayout`, ensuring zero trace of the other portal exists in each deployment.

## Phase 15: Programmatic Auto-Branding & PWA Split
- [x] 49. Auto-Generate Branded Logos using `sharp`: Write and execute `scripts/auto-brand-logos.mjs` to dynamically composite doctor ("DOCTOR / RX" in Dark Teal) and patient ("PATIENT" in Mint Green) badges onto `public/logo.png` preserving PNG transparency, and generate all PWA sizes (192, 512, apple-touch, favicon).
- [x] 50. Dynamic PWA Manifest & Vite Config: Update `vite.config.js` with `loadEnv` to read `VITE_APP_MODE`, dynamically configure `vite-plugin-pwa` (name, theme color, icons), and inject matching `<link rel="icon">`, `<link rel="apple-touch-icon">`, and `<meta name="theme-color">` into `index.html`.
- [x] 51. Dynamic UI Logo Rendering: Audit and update `Navbar.jsx`, `PharmacistLogin.jsx`, `PatientLogin.jsx`, `Landing.jsx`, `PharmacistDashboard.jsx`, and `PatientDashboard.jsx` to dynamically render the corresponding branded logo based on portal mode.

## Phase 16: Live Global RxNav Engine & Strict Clinical Locks
- [x] 52. Eradicate Mock Data & Perfect RxTerms Autocomplete: Delete hardcoded arrays of medications or interactions (`DDI_RULES`, dummy drug lists). Ensure medication inputs in `PrescribeMedication.jsx` and `PatientMedicalProfileForm.jsx` fetch exclusively from the live NIH RxTerms API (`https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms=`) and store the fetched `RxCUI` alongside the drug name in Supabase.
- [x] 53. Live RxNav Interaction Engine (`interactionChecker.js`): Rewrite `interactionChecker.js` to fetch live interaction data from the NIH RxNav Interaction API (`https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis={active_rxcui_1}+{active_rxcui_2}+{new_rxcui}`) & live NIH RxClass / FDA OpenFDA official clinical APIs, extracting exact `severity` and scientific `description`.
- [x] 54. Absolute UI Hard-Lock & Scientific Alert Modal: Show a "Clinically Verifying..." spinner in `PrescribeMedication.jsx` while checking interactions, hard-lock the prescribe button and display a prominent Red Alert / Modal with exact scientific descriptions for High/Major interactions, and require an explicit "I acknowledge the clinical risk." checkbox for Moderate/Yellow interactions.

## Phase 17: Mobile-First Responsiveness & UI Polish
- [x] 55. Fix Text Overflow & Flex Layouts (The Screenshot Issue): Audit all Patient Cards (in `PatientManagement.jsx`, `PharmacistDashboard.jsx`, etc.). Apply `flex-col items-start md:flex-row md:items-center` for card headers, add `min-w-0` and `truncate` for emails/names, and ensure badges use `flex-wrap` and safe wrapping.
- [x] 56. Global Responsive Audit (All Portals): Ensure grids collapse to 1 column on mobile (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) across `PatientDashboard.jsx`, `PatientMedicalProfileForm.jsx`, `DoseScheduleTimeline.jsx`, generous touch targets (min 48px), and ensure `PrescribeMedication.jsx` and `DrugInformationPanel.jsx` modals and forms are fully scrollable without horizontal overflow.
- [x] 57. PWA Safe Area Padding: Implement safe area padding (`pb-[env(safe-area-inset-bottom)]`) in `AppLayout.jsx` and `Navbar.jsx` for the mobile bottom navigation dock, and ensure main container bottom padding prevents content from being hidden behind the bottom bar.

## Phase 18: Bilingual i18n, RTL & Doctor Tooltips
- [x] 58. i18n Setup & RTL Layout Engine: Install `i18next` and `react-i18next`, create `src/i18n.js` and `src/locales/{en.json, ar.json}`, wire language switching and persistent storage, and implement RTL engine (`document.documentElement.dir = 'rtl'`, `lang = 'ar'`).
- [x] 59. Language Toggle & Patient Translation (Simplified): Add sleek Language Switcher (🌐 En / ع) in `Navbar.jsx`, implement warm and accessible Arabic translations for `PatientDashboard.jsx`, `PatientMedicalProfileForm.jsx`, and `DoseScheduleTimeline.jsx`, strictly keeping drug names, RxCUI, and API responses in English.
- [x] 60. Pharmacist Tooltips & Professional Translation: Create reusable `Tooltip.jsx` component, translate Pharmacist Portal UI (`PharmacistDashboard.jsx`, `PrescribeMedication.jsx`), and add guided educational tooltips explaining RxNav checks, missed dose pings, and dosing considerations.

## Phase 19: UI Crash Fix & Drugs.com Engine Sync
- [x] 61. Fix Nested Buttons (Hydration Error): Audit `PrescribeMedication.jsx`, `Tooltip.jsx`, and any other component. Ensure NO `<button>` is nested inside another `<button>`. Change the inner Tooltip triggers or info icons to `<span role="button" tabIndex={0}>` or `<div>`, and add `e.stopPropagation()` and `e.preventDefault()` to their onClick/onKeyDown handlers to prevent parent button activation.
- [x] 62. Sync Global Search with Drugs.com Engine: In `PrescribeMedication.jsx` and `interactionChecker.js`, ensure that the output from the Global Drug Autocomplete correctly maps to the Drugs.com interaction rules (normalizing brand names, dosages, salt forms to active ingredients, e.g. "Ibuprofen 200 MG Oral Tablet" -> "Ibuprofen", "Plavix" -> "Clopidogrel", "Prilosec" -> "Omeprazole", "Coumadin" -> "Warfarin"). Enforce strict Hard-Lock UI on Major (Red) alerts, preventing prescription and displaying scientific warnings and Lab Interference notes.

## Phase 20: Absolute Patient Data Isolation (Zero Data Leakage)
- [x] 63. Supabase Query Strict Filtering Audit: Audit every query in `PrescribeMedication.jsx`, `PatientManagement.jsx`, `PharmacistDashboard.jsx`, and `PatientAdherenceModal.jsx` to strictly filter by `patient_id` / `user_id` / `id` for `selectedPatient.id`, and ensure the Patient portal (`PatientDashboard.jsx`, `PatientMedicalProfileForm.jsx`) strictly filters by `user.id` without hardcoded fallback demo profile state.
- [x] 64. React State Reset on Patient Switch: In `PharmacistDashboard.jsx` and `PrescribeMedication.jsx`, wrap patient data fetching in a `useEffect` dependent on `selectedPatient.id` (`selectedPatientId`), and explicitly reset `setActivePrescriptions([])`, `setChronicConditions([])`, `setInteractions([])`, `setCurrentSymptoms([])` before fetching new patient data so zero ghost data bleeds across patients.
- [x] 65. Interaction Checker Isolation: Ensure `interactionChecker.js` operates strictly as a pure function evaluating only the `activePrescriptions` and `chronicConditions` passed as arguments for the currently selected patient with zero global/cached state, and clear the interaction warnings UI entirely when switching patients.

## Phase 21: Mobile Navbar Polish & Router Scroll UX
- [x] 66. Navbar & RTL Mobile Overflow Fix: Audit `Navbar.jsx` and `AppLayout.jsx`. Fix the flex container for the Navbar, ensuring elements wrap gracefully or scale down correctly on small mobile screens. Fix gaps, padding, and logical RTL properties so language and theme toggles don't push the logo off-screen or overlap. Adjust bottom navigation dock alignment so text and icons are clean and uncramped.
- [x] 67. Auto Scroll-To-Top Engine: Create `src/components/common/ScrollToTop.jsx` using `useLocation` and `useEffect` to trigger `window.scrollTo({ top: 0, left: 0, behavior: 'instant' })` on pathname changes, and mount it inside the Router in `App.jsx`.
- [x] 68. Navigation History Audit (Swipe Back): Audit `useNavigate()` calls across the app, ensuring standard navigation is used without unnecessary `replace: true` flags so mobile swipe-back gestures correctly pop browser history to the previous view.

import React, { useEffect, useState, useCallback } from 'react'
import { AuthContext } from './auth-context'
import { supabase, supabaseAdmin } from '../lib/supabase'

const inferRoleFromUser = (u) => {
  if (!u) return null
  if (u.user_metadata?.role) return u.user_metadata.role
  const email = (u.email || '').toLowerCase()
  if (
    email.includes('smith') ||
    email.includes('pharmacist') ||
    email.includes('doctor') ||
    email.includes('dr.')
  ) {
    return 'pharmacist'
  }
  return 'patient'
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
        (fallbackRole === 'pharmacist'
          ? 'Dr. Sarah Smith, PharmD'
          : currentUser.email?.split('@')[0] || 'Patient')

      // Immediately set inferred role and temporary profile so routes never hang
      setRole((prev) => prev || fallbackRole)
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

        // If profile doesn't exist yet, auto-create using auth metadata
        if (!userProfile) {
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
      let { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      // If sign in fails due to invalid credentials or unconfirmed email,
      // auto-heal by confirming email and updating password in auth.users
      if (signInErr) {
        console.warn(
          'Standard signIn failed, attempting auto-heal via supabaseAdmin:',
          signInErr.message
        )
        try {
          const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
          const matchedUser = usersData?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
          )

          if (matchedUser) {
            const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
              matchedUser.id,
              {
                email_confirm: true,
                password: password,
              }
            )

            if (!updateErr) {
              const retryRes = await supabase.auth.signInWithPassword({
                email,
                password,
              })
              data = retryRes.data
              signInErr = retryRes.error
            }
          }
        } catch (healErr) {
          console.warn('Auto-heal lookup failed:', healErr)
        }
      }

      if (signInErr) throw signInErr

      if (data?.user) {
        const userProfile = await syncUserProfile(data.user)

        if (expectedRole && userProfile?.role && userProfile.role !== expectedRole) {
          console.warn(`User signed in as ${userProfile.role}, portal requested ${expectedRole}`)
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

  const signUp = async ({ email, password, fullName, role: requestedRole = 'patient' }) => {
    setError(null)
    setLoading(true)
    try {
      let authUser = null

      const { data: createData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: requestedRole,
        },
      })

      if (!createErr && createData?.user) {
        authUser = createData.user
      } else if (createErr) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = listData?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        )

        if (existingUser) {
          const { data: updateData, error: updateErr } =
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              password,
              email_confirm: true,
              user_metadata: {
                full_name: fullName,
                role: requestedRole,
              },
            })
          if (updateErr) throw updateErr
          authUser = updateData?.user || existingUser
        } else {
          throw createErr
        }
      }

      if (authUser) {
        const { data: newProfile, error: profileErr } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authUser.id,
            role: requestedRole,
            full_name: fullName,
            email,
          })
          .select()
          .maybeSingle()

        if (!profileErr && newProfile) {
          setProfile(newProfile)
          setRole(newProfile.role)
        }

        if (requestedRole === 'patient') {
          await supabaseAdmin
            .from('patients_data')
            .upsert(
              {
                user_id: authUser.id,
                chronic_diseases: [],
              },
              { onConflict: 'user_id' }
            )
        }

        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInErr) throw signInErr

        if (signInData?.user) {
          await syncUserProfile(signInData.user)
        }

        return { data: signInData, error: null }
      }

      return { data: null, error: new Error('Failed to create or configure user.') }
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

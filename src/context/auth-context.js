import { createContext } from 'react'

export const AuthContext = createContext({
  user: null,
  session: null,
  profile: null,
  role: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
})

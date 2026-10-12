import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const raw = localStorage.getItem('stockpilot_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [token, setToken] = useState(() => localStorage.getItem('stockpilot_token'))

  const persist = useCallback((authResponse) => {
    const { token: newToken, ...rest } = authResponse
    localStorage.setItem('stockpilot_token', newToken)
    localStorage.setItem('stockpilot_user', JSON.stringify(rest))
    setToken(newToken)
    setUser(rest)
  }, [])

  const login = useCallback(
    async (email, password) => {
      const response = await authApi.login({ email, password })
      persist(response)
      return response
    },
    [persist],
  )

  const register = useCallback(
    async (payload) => {
      const response = await authApi.register(payload)
      persist(response)
      return response
    },
    [persist],
  )

  const logout = useCallback(() => {
    localStorage.removeItem('stockpilot_token')
    localStorage.removeItem('stockpilot_user')
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, token, isAuthenticated: Boolean(token), login, register, logout }),
    [user, token, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

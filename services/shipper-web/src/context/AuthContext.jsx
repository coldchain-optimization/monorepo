import { createContext, useContext, useState, useCallback } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(false)

  const checkAuth = useCallback(async () => {
    if (!api.getToken()) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const data = await api.getProfile()
      setUser(data.user || data)
      try {
        const driverData = await api.getDriverProfile()
        setDriver(driverData.driver || null)
      } catch {
        setDriver(null)
      }
    } catch {
      api.clearToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const res = await api.login(email, password)
    setUser(res.user)
    try {
      const driverData = await api.getDriverProfile()
      setDriver(driverData.driver || null)
    } catch {
      setDriver(null)
    }
    return res
  }

  const signup = async (data) => {
    const res = await api.signup(data)
    setUser(res.user)
    return res
  }

  const logout = () => {
    api.clearToken()
    setUser(null)
    setDriver(null)
  }

  const refreshDriver = async () => {
    try {
      const driverData = await api.getDriverProfile()
      setDriver(driverData.driver || null)
    } catch {
      setDriver(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, driver, loading, login, signup, logout, checkAuth, refreshDriver }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be within AuthProvider')
  }
  return context
}

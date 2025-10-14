"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { getStoredUser } from "@/lib/auth"

interface User {
  id: string
  email?: string
  name?: string
}

interface AuthContextType {
  user: User | null
  login: (userData: User) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const userData = getStoredUser()
      if (userData) {
        setUser(userData)
      }
    } catch (error) {
      console.error("Error loading user from localStorage:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = (userData: User) => {
    setUser(userData)
    localStorage.setItem("user", JSON.stringify({ user: userData }))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

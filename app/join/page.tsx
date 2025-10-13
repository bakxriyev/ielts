"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"

export default function JoinPage() {
  const [step, setStep] = useState<"login" | "mock">("login")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [mockId, setMockId] = useState("")
  const { setUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    localStorage.clear()
    console.log("[v0] Cleared all localStorage data on join page entry")
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.target as HTMLFormElement)
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    if (!username || !password) {
      setError("Please enter both username and password")
      setIsLoading(false)
      return
    }

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
      const response = await fetch(`${API_BASE_URL}/auth/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError("Incorrect username or password")
        } else {
          setError("Login failed. Please try again.")
        }
        setIsLoading(false)
        return
      }

      const userData = await response.json()
      console.log("[v0] User logged in:", userData)

      localStorage.setItem("user", JSON.stringify(userData))
      localStorage.setItem("token", `join_token_${userData.id}`)
      setUser(userData)

      setStep("mock") // Move to next step
    } catch (err) {
      console.error("[v0] Error logging in:", err)
      setError("Failed to connect to server. Please try again later.")
    }

    setIsLoading(false)
  }

  const handleMockJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mockId.trim()) {
      setError("Please enter your Mock ID")
      return
    }
    setError("")
    router.push(`/mock/${mockId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <div className="sticky top-0 z-10 p-4 sm:p-6">
        <Button
          onClick={() => router.push("/")}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 hover:text-blue-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <main className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 sm:px-6 pb-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-3 sm:gap-6 mb-4 sm:mb-6">
              <Image src="/realieltsexam-logo.png" alt="REALIELTSEXAM" width={120} height={40} className="h-8 sm:h-10" />
              <div className="w-px h-6 sm:h-8 bg-white/30"></div>
              <Image src="/ielts-logo.png" alt="IELTS" width={100} height={40} className="h-6 sm:h-8" />
            </div>
          </div>

          <Card className="border-0 shadow-xl bg-white/10 backdrop-blur-md border border-white/20 mx-2 sm:mx-0">
            <CardHeader className="text-center pb-4 sm:pb-6">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-white">
                {step === "login" ? "Join Mock Test" : "Enter Mock ID"}
              </CardTitle>
              <CardDescription className="text-blue-100 text-sm sm:text-base">
                {step === "login"
                  ? "Enter your username and password to continue"
                  : "Now enter your Mock ID to join the test"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {step === "login" ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-white font-medium text-sm sm:text-base">
                      Username
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Enter your username"
                      className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white font-medium text-sm sm:text-base">
                      Password
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 sm:h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg mt-4 sm:mt-6"
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifying..." : "Continue"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleMockJoin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mockId" className="text-white font-medium text-sm sm:text-base">
                      Mock ID
                    </Label>
                    <Input
                      id="mockId"
                      name="mockId"
                      type="text"
                      placeholder="Enter your Mock ID"
                      value={mockId}
                      onChange={(e) => setMockId(e.target.value)}
                      className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-10 sm:h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg mt-4 sm:mt-6"
                  >
                    Join Mock Test
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"

export default function JoinPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { setUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Clear all localStorage data for a fresh start
    localStorage.clear()
    console.log("[v0] Cleared all localStorage data on join page entry")
  }, [])

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.target as HTMLFormElement)
    const userId = formData.get("userId") as string
    const mockId = formData.get("mockId") as string

    // Validate inputs
    if (!userId || !mockId) {
      setError("Please enter both User ID and Mock ID")
      setIsLoading(false)
      return
    }

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      console.log("[v0] Fetching user data for ID:", userId)

      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          setError("User ID not found. Please check your User ID and try again.")
        } else {
          setError("Failed to fetch user data. Please try again.")
        }
        setIsLoading(false)
        return
      }

      const userData = await response.json()
      console.log("[v0] Fetched user data:", userData)

      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(userData))
      localStorage.setItem("token", `join_token_${userId}`)

      // Set user in auth context
      setUser(userData)

      // Redirect to mock page
      router.push(`/mock/${mockId}`)
    } catch (err) {
      console.error("[v0] Error fetching user data:", err)
      setError("Failed to connect to server. Please check your connection and try again.")
    }

    setIsLoading(false)
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
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </div>

      <main className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 sm:px-6 pb-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-6">
              <Image
                src="/realieltsexam-logo.png"
                alt="REALIELTSEXAM Logo"
                width={120}
                height={40}
                className="h-8 sm:h-10 w-auto"
              />
              <div className="w-px h-6 sm:h-8 bg-white/30"></div>
              <Image src="/ielts-logo.png" alt="IELTS Logo" width={100} height={40} className="h-6 sm:h-8 w-auto" />
            </div>
          </div>

          <Card className="border-0 shadow-xl bg-white/10 backdrop-blur-md border border-white/20 mx-2 sm:mx-0">
            <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-white">Join Mock Test</CardTitle>
              <CardDescription className="text-blue-100 text-sm sm:text-base">
                Enter your User ID and Mock ID to join the test session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userId" className="text-white font-medium text-sm sm:text-base">
                    User ID
                  </Label>
                  <Input
                    id="userId"
                    name="userId"
                    type="text"
                    placeholder="Enter your User ID"
                    className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 text-sm sm:text-base"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mockId" className="text-white font-medium text-sm sm:text-base">
                    Mock ID
                  </Label>
                  <Input
                    id="mockId"
                    name="mockId"
                    type="text"
                    placeholder="Enter Mock ID"
                    className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 text-sm sm:text-base"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-10 sm:h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg mt-4 sm:mt-6 text-sm sm:text-base"
                  disabled={isLoading}
                >
                  {isLoading ? "Joining..." : "Join Mock Test"}
                </Button>
              </form>

              <div className="text-center pt-3 sm:pt-4">
                <p className="text-blue-100 text-sm sm:text-base">
                  Have an account?{" "}
                  <Link href="/login" className="text-blue-300 hover:text-blue-200 font-medium underline">
                    Login here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

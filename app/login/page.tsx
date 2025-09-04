"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { useAuth } from "../../contexts/auth-context"
import { loginUser, registerUser } from "@/lib/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const { setUser } = useAuth()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.target as HTMLFormElement)
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    const result = await loginUser(username, password)

    if (result.success && result.user) {
      setUser(result.user)
      router.push("/dashboard")
    } else {
      setError(result.message || "Login failed. Please try again.")
    }

    setIsLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    const result = await registerUser(name, email, username, password)

    if (result.success && result.user) {
      setUser(result.user)
      router.push("/dashboard")
    } else {
      setError(result.message || "Registration failed. Please try again.")
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
              <CardTitle className="text-xl sm:text-2xl font-semibold text-white">
                {isLogin ? "Login" : "Sign Up"}
              </CardTitle>
              <CardDescription className="text-blue-100 text-sm sm:text-base">
                {isLogin
                  ? "Enter your username and password below to log into your account"
                  : "Create your account to start taking IELTS mock tests"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {isLogin ? (
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
                      className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 text-sm sm:text-base"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-white font-medium text-sm sm:text-base">
                        Password
                      </Label>
                      <Link href="#" className="text-xs sm:text-sm text-blue-300 hover:text-blue-200">
                        Forgot password
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 pr-10 text-sm sm:text-base"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-10 sm:h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg mt-4 sm:mt-6 text-sm sm:text-base"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Login"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white font-medium text-sm sm:text-base">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 text-sm sm:text-base"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white font-medium text-sm sm:text-base">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 text-sm sm:text-base"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-white font-medium text-sm sm:text-base">
                      Username
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Username"
                      className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 text-sm sm:text-base"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-white font-medium text-sm sm:text-base">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className="h-10 sm:h-12 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-blue-400 pr-10 text-sm sm:text-base"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-10 sm:h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg mt-4 sm:mt-6 text-sm sm:text-base"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Sign Up"}
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

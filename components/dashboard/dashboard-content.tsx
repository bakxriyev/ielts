"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { PasswordModal } from "@/components/password-modal"
import { useAuth } from "@/contexts/auth-context"
import { Clock, User, Trophy, Phone, Home } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface MockTest {
  id: string
  title: string
  description: string
  duration: string
  exam_type: string
  password: string
  photo: string
}

export function DashboardContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [mockTests, setMockTests] = useState<MockTest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMock, setSelectedMock] = useState<MockTest | null>(null)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

  useEffect(() => {
    fetchMockTests()
  }, [])

  const fetchMockTests = async () => {
    try {
      setIsLoading(true)
      console.log("[v0] Fetching exam data from backend")

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
      const response = await fetch(`${API_BASE_URL}/exams`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Successfully fetched exam data:", data)

      const formattedTests = data.map((exam: any) => ({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        exam_type: exam.exam_type,
        password: exam.password,
        photo: exam.photo,
      }))

      setMockTests(formattedTests)
    } catch (error) {
      console.error("Failed to fetch mock tests:", error)
      const fallbackData = [
        {
          id: "1",
          title: "IELTS Academic Practice Test 1",
          description: "Complete practice test with all four sections",
          duration: "180",
          exam_type: "Academic",
          password: "mock123",
          photo: "/ielts-academic-test-book-and-computer.png",
        },
        {
          id: "2",
          title: "IELTS General Training Test 1",
          description: "General training practice test",
          duration: "180",
          exam_type: "General Training",
          password: "test456",
          photo: "/ielts-general-training-materials-and-laptop.png",
        },
      ]
      setMockTests(fallbackData)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMockTestClick = (mockTest: MockTest) => {
    setSelectedMock(mockTest)
    setIsPasswordModalOpen(true)
  }

  const handlePasswordSuccess = () => {
    if (selectedMock) {
      setIsPasswordModalOpen(false)
      router.push(`/mock/${selectedMock.id}`)
      setSelectedMock(null)
    }
  }

  const handleModalClose = () => {
    setIsPasswordModalOpen(false)
    setSelectedMock(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <nav className="border-b border-blue-800/30 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-3">
                <Image
                  src="/realieltsexam-logo.png"
                  alt="REALIELTSEXAM"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold text-white">REALIELTSEXAM</span>
              </Link>

              <div className="hidden md:flex items-center gap-6">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  href="/results"
                  className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors"
                >
                  <Trophy className="h-4 w-4" />
                  My Results
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  Contact
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-blue-300">Welcome, {user?.name || user?.username}!</span>
              <ThemeToggle />
              <Button
                variant="outline"
                onClick={logout}
                className="border-blue-600 text-blue-300 hover:bg-blue-600 hover:text-white bg-transparent"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-white mb-8 text-center">Available CD Mock Tests</h2>
          <p className="text-blue-300 text-center mb-12 text-lg">
            Choose a Computer Delivered IELTS mock test to practice
          </p>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse bg-slate-800/50 border-blue-800/30">
                  <CardContent className="p-6">
                    <div className="h-48 bg-slate-700 rounded mb-4"></div>
                    <div className="h-4 bg-slate-700 rounded mb-4"></div>
                    <div className="h-3 bg-slate-700 rounded mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockTests.map((test) => (
                <Card
                  key={test.id}
                  className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] bg-slate-800/50 border-blue-800/30 hover:border-blue-600/50 overflow-hidden"
                >
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={`http://localhost:3001/uploads/mock/${test.photo}`}
                      alt={test.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  </div>

                  <CardHeader>
                    <CardTitle className="text-lg text-white group-hover:text-blue-400 transition-colors">
                      {test.title}
                    </CardTitle>
                    <CardDescription className="text-blue-300 line-clamp-2">{test.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 text-sm text-blue-300">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {test.duration} min
                        </span>
                        {/* <Badge variant="outline" className="border-blue-600 text-blue-300">
                          {test.exam_type}
                        </Badge> */}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleMockTestClick(test)}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-300"
                    >
                      Start CD Mock Test
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-slate-900/90 border-t border-blue-800/30 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/realieltsexam-logo.png"
                  alt="REALIELTSEXAM"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold text-white">REALIELTSEXAM</span>
              </div>
              <p className="text-blue-300 mb-4">
                Professional Computer Delivered IELTS mock test platform designed to help you achieve your target score.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard" className="text-blue-300 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="text-blue-300 hover:text-white transition-colors">
                    Profile
                  </Link>
                </li>
                <li>
                  <Link href="/results" className="text-blue-300 hover:text-white transition-colors">
                    My Results
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/contact" className="text-blue-300 hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="text-blue-300 hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-blue-800/30 mt-8 pt-8 text-center">
            <p className="text-blue-300">© 2024 REALIELTSEXAM. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={handleModalClose}
        onSuccess={handlePasswordSuccess}
        correctPassword={selectedMock?.password || ""}
        examTitle={selectedMock?.title || ""}
      />
    </div>
  )
}

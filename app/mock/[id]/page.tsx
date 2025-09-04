"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "../../../components/ui/button"
import { Card, CardContent } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { ThemeToggle } from "../../../components/theme-toggle"
import { PasswordModal } from "../../../components/password-modal"
import { BookOpen, Headphones, PenTool, Play, AlertTriangle, ArrowLeft } from "lucide-react"
import { getStoredUser } from "@/lib/auth"
import { useCustomAlert } from "../../../components/custom-allert"
import { checkSectionCompletion } from "../../../lib/completed-cheker"
import Image from "next/image"
import Link from "next/link"

interface ExamSection {
  id: string
  name: string
  description: string
  duration: string
  icon: React.ReactNode
  questionsCount: number
  parts: number
  isCompleted?: boolean
}

interface ExamData {
  id: string
  exam_type: string
  title: string
  description: string
  duration: string
  photo: string | null
  listenings: Array<{
    id: string
    title: string
    description: string
    questions: Array<{
      id: string
      part: string
      question_text: string
      audio?: string
    }>
  }>
  readings: Array<{
    id: string
    passage_title: string
    passage_text: string
    questions: Array<{
      id: string
      part: string
      question_text: string
    }>
  }>
  writings: Array<{
    id: string
    part: string
    task_text: string
    task_image?: string
  }>
  password: string
}

const MockTestPage = () => {
  const params = useParams()
  const router = useRouter()
  const [examData, setExamData] = useState<ExamData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [completionStatus, setCompletionStatus] = useState<{ [key: string]: boolean }>({})
  const { showAlert, AlertComponent } = useCustomAlert()

  useEffect(() => {
    

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = "Are you sure you want to leave? Your test progress may be lost."
      return "Are you sure you want to leave? Your test progress may be lost."
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [params.id, router])

  const checkAllSectionsCompletion = async () => {
    const user = getStoredUser()
    if (!user?.id || !params.id) return

    try {
      const examId = Number.parseInt(params.id as string)
      const [readingCompleted, listeningCompleted, writingCompleted] = await Promise.all([
        checkSectionCompletion(user.id, examId, "reading"),
        checkSectionCompletion(user.id, examId, "listening"),
        checkSectionCompletion(user.id, examId, "writing"),
      ])

      setCompletionStatus({
        reading: readingCompleted,
        listening: listeningCompleted,
        writing: writingCompleted,
      })
    } catch (error) {
      console.error("Failed to check completion status:", error)
    }
  }

  const fetchExamData = async () => {
    try {
      setIsLoading(true)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
      const response = await fetch(`${API_BASE_URL}/exams/${params.id}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch exam data: ${response.status}`)
      }

      const data = await response.json()

      setExamData(data)
      await checkAllSectionsCompletion()
    } catch (error) {
      console.error("Failed to load exam data:", error)
      setError("Failed to load mock test data from server")
    } finally {
      setIsLoading(false)
    }
  }

  const createSections = (data: ExamData): ExamSection[] => {
    const sections: ExamSection[] = []

    if (data.readings && data.readings.length > 0) {
      sections.push({
        id: `reading_${data.id}`,
        name: "Reading",
        description: "Academic Reading Test",
        duration: "60 minutes",
        icon: <BookOpen />,
        questionsCount: data.readings.reduce((total, reading) => total + reading.questions.length, 0),
        parts: data.readings.length,
        isCompleted: completionStatus.reading,
      })
    }

    if (data.listenings && data.listenings.length > 0) {
      sections.push({
        id: `listening_${data.id}`,
        name: "Listening",
        description: "Academic Listening Test",
        duration: "30 minutes",
        icon: <Headphones />,
        questionsCount: data.listenings.reduce((total, listening) => total + listening.questions.length, 0),
        parts: data.listenings.length,
        isCompleted: completionStatus.listening,
      })
    }

    if (data.writings && data.writings.length > 0) {
      sections.push({
        id: `writing_${data.id}`,
        name: "Writing",
        description: "Academic Writing Test",
        duration: "60 minutes",
        icon: <PenTool />,
        questionsCount: data.writings.length,
        parts: data.writings.length,
        isCompleted: completionStatus.writing,
      })
    }

    return sections
  }

  const handlePasswordSuccess = () => {
    setIsAuthenticated(true)
    setShowPasswordModal(false)
  }

  const handlePasswordClose = () => {
    router.push("/join")
  }

  const handleStartSection = (sectionName: string, isCompleted: boolean) => {
    if (isCompleted) {
      showAlert({
        title: "Section Completed",
        message: `You have already completed the ${sectionName} section for this exam. You cannot retake it.`,
        type: "info",
      })
      return
    }

    router.push(`/test/${sectionName.toLowerCase()}/${params.id}`)
  }

  const getSectionImage = (sectionName: string) => {
    switch (sectionName.toLowerCase()) {
      case "reading":
        return "/realieltsexam-logo.png"
      case "listening":
        return "/realieltsexam-logo.png"
      case "writing":
        return "/realieltsexam-logo.png"
      default:
        return "/realieltsexam-logo.png"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-blue-300 text-lg">Loading mock test...</p>
        </div>
      </div>
    )
  }

  if (error || !examData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-white">Error Loading Mock Test</h1>
          <p className="text-blue-300 mb-6">{error}</p>
          <Button onClick={fetchExamData} className="bg-red-500 hover:bg-red-600 text-white">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const sections = createSections(examData)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <AlertComponent />

      <PasswordModal
        isOpen={showPasswordModal && !isAuthenticated}
        onClose={handlePasswordClose}
        onSuccess={handlePasswordSuccess}
        correctPassword={examData?.password || "mock123"}
        examTitle={examData?.title || "Mock Test"}
      />

      <nav className="border-b border-blue-800/30 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
            
              <div className="flex items-center gap-2 sm:gap-3">
                <Image
                  src="/realieltsexam-logo.png"
                  alt="REALIELTSEXAM"
                  width={24}
                  height={24}
                  className="sm:w-8 sm:h-8 rounded-lg"
                />
                <div>
                  <span className="text-sm sm:text-lg font-bold text-white">REALIELTSEXAM</span>
                  <div className="text-xs sm:text-sm text-blue-300 hidden sm:block">
                    Welcome, {getStoredUser()?.name || getStoredUser()?.username || "Test Taker"}
                  </div>
                  <div className="text-xs text-blue-400">ID: {getStoredUser()?.id || "Unknown"}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="sm:hidden text-right">
                <div className="text-xs text-white font-medium">
                  {getStoredUser()?.name || getStoredUser()?.username || "Test Taker"}
                </div>
                <div className="text-xs text-blue-400">ID: {getStoredUser()?.id || "Unknown"}</div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {isAuthenticated && (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <div className="mb-8 sm:mb-12">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 text-white px-2">{examData.title}</h1>
              <p className="text-base sm:text-lg text-blue-300 max-w-2xl mx-auto px-4">{examData.description}</p>
              <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-700/30 max-w-md mx-auto">
                <div className="text-sm text-blue-200">
                  <span className="font-medium">Test Taker:</span>{" "}
                  {getStoredUser()?.name || getStoredUser()?.username || "Unknown User"}
                </div>
                <div className="text-xs text-blue-300 mt-1">
                  <span className="font-medium">User ID:</span> {getStoredUser()?.id || "Unknown"}
                  {getStoredUser()?.email && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="font-medium">Email:</span> {getStoredUser()?.email}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 sm:mb-8 px-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Test Sections</h2>
              <div className="text-xs sm:text-sm text-blue-300">{sections.length} sections</div>
            </div>

            <div className="grid gap-4 sm:gap-8">
              {sections.map((section, index) => (
                <Card
                  key={section.id}
                  className={`group hover:shadow-2xl transition-all duration-300 border-0 backdrop-blur-sm hover:scale-[1.01] sm:hover:scale-[1.02] animate-fade-in border-blue-800/30 overflow-hidden cursor-pointer ${
                    section.isCompleted
                      ? "bg-green-800/30 hover:bg-green-800/40"
                      : "bg-slate-800/50 hover:bg-slate-800/60"
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => handleStartSection(section.name, section.isCompleted || false)}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
                      <div className="relative w-full h-32 sm:w-48 sm:h-32 overflow-hidden flex-shrink-0">
                        <Image
                          src={getSectionImage(section.name) || "/placeholder.svg"}
                          alt={`${section.name} Test`}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-r transition-all duration-300 ${
                            section.isCompleted
                              ? "from-green-600/20 to-emerald-600/20 group-hover:from-green-600/30 group-hover:to-emerald-600/30"
                              : "from-blue-600/20 to-indigo-600/20 group-hover:from-blue-600/30 group-hover:to-indigo-600/30"
                          }`}
                        />
                        {section.isCompleted && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-green-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium">
                              ✓ Completed
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 p-4 sm:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                            <div
                              className={`p-3 sm:p-4 rounded-2xl text-white group-hover:scale-110 transition-transform duration-300 self-start ${
                                section.isCompleted
                                  ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                  : "bg-gradient-to-r from-blue-500 to-indigo-500"
                              }`}
                            >
                              {section.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                                <h3 className="text-xl sm:text-2xl font-bold text-white">{section.name}</h3>
                                {section.isCompleted && (
                                  <Badge className="bg-green-600 text-white self-start">Completed</Badge>
                                )}
                              </div>
                              <div className="text-blue-300 mb-3 text-base sm:text-lg">{section.description}</div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm text-blue-400">
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  {section.parts} {section.parts === 1 ? "Part" : "Parts"}
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                  {section.duration}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-center sm:justify-end">
                            <Button
                              size="lg"
                              className={`w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 text-sm sm:text-base ${
                                section.isCompleted
                                  ? "bg-gray-600 hover:bg-gray-700 text-gray-300 cursor-not-allowed"
                                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                              }`}
                              disabled={section.isCompleted}
                            >
                              <Play className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                              {section.isCompleted ? "Completed" : "Start Test"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      )}

      <footer className="mt-12 sm:mt-20 border-t border-blue-800/30 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Image
                src="/realieltsexam-logo.png"
                alt="REALIELTSEXAM"
                width={20}
                height={20}
                className="sm:w-6 sm:h-6 rounded"
              />
              <span className="text-blue-300 font-medium text-sm sm:text-base">REALIELTSEXAM</span>
            </div>
            <div className="text-xs sm:text-sm text-blue-400 text-center">
              © 2024 REALIELTSEXAM. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}

export default MockTestPage

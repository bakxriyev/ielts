"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "../../../../../components/ui/button"
import { Input } from "../../../../../components/ui/input"
import { RadioGroup, RadioGroupItem } from "../../../../../components/ui//radio-group"
import { Label } from "../../../../../components/ui/label"
import { Timer } from "../../../../../components/timer"
import { ThemeToggle } from "../../../../../components/theme-toggle"
import { saveTestProgress, markSectionCompleted } from "../../../../../lib/test-strotage"
import { checkSectionCompletion } from "../../../../../lib/completed-cheker"
import { useAuth } from "../../../../../contexts/auth-context"
import { Wifi, Volume2, Settings, AlertTriangle } from "lucide-react"
import { useCustomAlert } from "../../../../../components/custom-allert"
import Link from "next/link"

interface Question {
  id: number
  reading_id: number
  part: string
  question_text: string
  options?: string[]
  correct_answers?: string[]
  photo?: string
}

interface Reading {
  id: string
  passage_title: string
  passage_text: string
  questions: Question[]
}

interface ReadingTestData {
  id: string
  title: string
  description: string
  readings: Reading[]
  duration: number
}

export default function ReadingTestPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [testData, setTestData] = useState<ReadingTestData | null>(null)
  const [currentPart, setCurrentPart] = useState(1)
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitLoading, setShowSubmitLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [expandedPart, setExpandedPart] = useState<number | null>(null)
  const { showAlert, AlertComponent } = useCustomAlert()

  const examId = params.examId as string

  useEffect(() => {
    const checkCompletion = async () => {
      if (!user?.id) {
        console.log("[v0] No user found, redirecting to login")
        router.push("/login")
        return
      }

      try {
        console.log("[v0] Checking reading completion for user:", user.id, "exam:", examId)
        const completed = await checkSectionCompletion(user.id, examId, "reading")

        if (completed) {
          console.log("[v0] Reading test already completed")
          setIsCompleted(true)
          setIsLoading(false)
          return
        }

        console.log("[v0] Reading test not completed, proceeding with test")
      } catch (error) {
        console.error("[v0] Error checking completion status:", error)
        // Continue with test if check fails
      }

      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault()
        showAlert({
          title: "Leave Test",
          description:
            "Are you sure you want to leave the test? Your progress will be saved, but the timer will continue running. You can return to continue where you left off.",
          type: "warning",
          confirmText: "Yes, Leave",
          cancelText: "No, Continue",
          onConfirm: () => {
            window.history.back()
          },
        })
      }

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        e.returnValue =
          "Are you sure you want to leave? Your test progress will be saved, but the timer will continue running."
        return "Are you sure you want to leave? Your test progress will be saved, but the timer will continue running."
      }

      window.addEventListener("beforeunload", handleBeforeUnload)
      window.addEventListener("popstate", handlePopState)
      fetchTestData()

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload)
        window.removeEventListener("popstate", handlePopState)
      }
    }

    checkCompletion()
  }, [examId, router, user])

  useEffect(() => {
    const interval = setInterval(() => {
      if (testData && timeRemaining !== null) {
        const timerKey = `timer_${examId}_reading`
        const answersKey = `answers_${examId}_reading`

        localStorage.setItem(timerKey, timeRemaining.toString())
        localStorage.setItem(answersKey, JSON.stringify(answers))

        saveTestProgress({
          mockTestId: examId,
          sectionId: "reading",
          answers,
          timeRemaining,
          completed: false,
        })
      }
    }, 5000) // Save every 5 seconds

    return () => clearInterval(interval)
  }, [answers, timeRemaining, testData, examId])

  const fetchTestData = async () => {
    try {
      setIsLoading(true)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
      console.log("[v0] Fetching reading test data from:", `${API_BASE_URL}/exams/${examId}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(`${API_BASE_URL}/exams/${examId}`, {
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Failed to fetch test data: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Received reading test data:", data)

      const transformedData: ReadingTestData = {
        id: data.id,
        title: data.title,
        description: data.description,
        readings: data.readings || [],
        duration: Number.parseInt(data.duration) || 60,
      }
      console.log("[v0] Transformed reading test data:", transformedData)
      setTestData(transformedData)

      const timerKey = `timer_${examId}_reading`
      const answersKey = `answers_${examId}_reading`

      const savedTime = localStorage.getItem(timerKey)
      const savedAnswers = localStorage.getItem(answersKey)

      if (savedTime && savedAnswers) {
        console.log("[v0] Loading saved progress:", { savedTime, savedAnswers })
        setTimeRemaining(Number.parseInt(savedTime))
        setAnswers(JSON.parse(savedAnswers))
      } else {
        const initialTime = 3600 // Always 1 hour for reading test
        console.log("[v0] Setting initial timer to 1 hour:", initialTime)
        setTimeRemaining(initialTime)
        localStorage.setItem(timerKey, initialTime.toString())
      }
    } catch (error) {
      console.error("Failed to fetch reading test data:", error)

      if (timeRemaining === null) {
        console.log("[v0] Setting fallback timer to 1 hour due to error")
        setTimeRemaining(3600) // 60 minutes fallback
      }

      setTestData({
        id: examId,
        title: "Reading Test",
        description: "IELTS Reading Test",
        readings: [],
        duration: 60,
      })

      showAlert({
        title: "Connection Error",
        description: "Unable to load test data. Please check your internet connection and try again.",
        type: "error",
        confirmText: "Retry",
        showCancel: true,
        cancelText: "Continue Offline",
        onConfirm: () => fetchTestData(),
        onCancel: () => {
          // Continue with fallback data
        },
      })
    } finally {
      console.log("[v0] Setting loading to false")
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (questionId: number, answer: any) => {
    const newAnswers = {
      ...answers,
      [questionId]: answer,
    }
    setAnswers(newAnswers)

    const answersKey = `answers_${examId}_reading`
    localStorage.setItem(answersKey, JSON.stringify(newAnswers))

    submitSingleAnswer(questionId, answer)
  }

  const submitSingleAnswer = async (questionId: number, answer: string) => {
    if (!user?.id) return

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
      await fetch(`${API_BASE_URL}/reading-answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          questionId: questionId,
          examId: Number.parseInt(examId),
          answer: answer,
        }),
      })
    } catch (error) {
      console.error("Failed to save answer:", error)
    }
  }

  const handleSubmit = async () => {
    if (isSubmitted || isSubmitting || showSubmitLoading || !user?.id) {
      return
    }

    showAlert({
      title: "Submit Test",
      description: "Are you sure you want to submit your test? This action cannot be undone.",
      type: "warning",
      confirmText: "Yes, Submit",
      cancelText: "No, Continue",
      onConfirm: async () => {
        setIsSubmitted(true)
        setIsSubmitting(true)
        setShowSubmitLoading(true)

        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
          const answerPromises = Object.entries(answers).map(([questionId, answer]) =>
            fetch(`${API_BASE_URL}/reading-answers`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: user.id,
                questionId: Number.parseInt(questionId),
                examId: Number.parseInt(examId),
                answer: answer,
              }),
            }),
          )

          await Promise.all(answerPromises)

          localStorage.removeItem(`timer_${examId}_reading`)
          localStorage.removeItem(`answers_${examId}_reading`)

          markSectionCompleted(examId, "reading")

          setTimeout(() => {
            router.push(`/mock/${examId}`)
          }, 2000)
        } catch (error) {
          console.error("Failed to submit reading test:", error)
          setIsSubmitted(false)
          setIsSubmitting(false)
          setShowSubmitLoading(false)

          showAlert({
            title: "Error Occurred",
            description: "Failed to submit test. Please try again.",
            type: "error",
            confirmText: "Retry",
            showCancel: false,
            onConfirm: () => {
              // Reset states to allow retry
            },
          })
        }
      },
    })
  }

  const getAllQuestions = () => {
    return testData?.readings.flatMap((reading) => reading.questions) || []
  }

  const getQuestionsByPart = (part: number) => {
    const partName = `part${part}`
    return getAllQuestions().filter((q) => q.part === partName)
  }

  const getAvailableParts = () => {
    const allQuestions = getAllQuestions()
    const parts = new Set(allQuestions.map((q) => q.part))
    return Array.from(parts)
      .map((part) => Number.parseInt(part.replace("part", "")))
      .sort()
  }

  const getCurrentReading = () => {
    return testData?.readings[0] // Use first reading as it contains all questions
  }

  const isQuestionAnswered = (questionId: number) => {
    return answers[questionId] !== undefined && answers[questionId] !== ""
  }

  const scrollToQuestion = (questionId: number) => {
    const element = document.getElementById(`question-${questionId}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const getAnsweredCount = () => {
    return Object.keys(answers).filter(
      (key) => answers[Number.parseInt(key)] !== undefined && answers[Number.parseInt(key)] !== "",
    ).length
  }

  const getTotalQuestions = () => {
    return getAllQuestions().length
  }

  const handleTimeUpdate = (newTime: number) => {
    setTimeRemaining(newTime)
    const timerKey = `timer_${examId}_reading`
    localStorage.setItem(timerKey, newTime.toString())
  }

  const jumpToQuestion = (questionId: number) => {
    const question = getAllQuestions().find((q) => q.id === questionId)
    if (question) {
      const partNumber = Number.parseInt(question.part.replace("part", ""))
      setCurrentPart(partNumber)
      setTimeout(() => {
        scrollToQuestion(questionId)
      }, 100)
    }
  }

  const getGlobalQuestionNumber = (question: Question) => {
    const allQuestions = getAllQuestions()
    return allQuestions.findIndex((q) => q.id === question.id) + 1
  }

  const getQuestionsForBottomNav = (partIndex: number) => {
    const partQuestions = getQuestionsByPart(partIndex + 1)
    return partQuestions.map((q) => ({
      ...q,
      globalNumber: getGlobalQuestionNumber(q),
    }))
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Authentication Required</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Please log in to access the test.</p>
          <Link href="/login">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">Go to Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-green-200 dark:border-green-700">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Test Completed</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You have already completed this reading test. You cannot retake a completed test.
          </p>
          <Link href={`/mock/${examId}`}>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2">Back to Mock Test</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading || timeRemaining === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">Loading reading test...</p>
        </div>
      </div>
    )
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Test Not Found</h1>
          <Link href={`/mock/${examId}`}>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">Back to Mock Test</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (showSubmitLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Submitting Your Test</h1>
          <p className="text-gray-600 dark:text-gray-300">Please wait while we process your answers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <AlertComponent />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-50 shadow-sm">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-red-600 font-bold text-lg md:text-xl tracking-wide">IELTS</div>
            <div className="text-gray-600 dark:text-gray-300 text-xs md:text-sm">Test taker ID</div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Timer
              initialTime={timeRemaining}
              onTimeUpdate={handleTimeUpdate}
              onTimeUp={handleSubmit}
              className="text-sm md:text-lg font-mono bg-gray-100 dark:bg-gray-700 dark:text-white px-2 md:px-4 py-1 md:py-2 rounded border dark:border-gray-600"
            />
            <div className="hidden md:flex items-center gap-4">
              <Wifi className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <ThemeToggle />
            </div>
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Part Header */}
      <div className="bg-gray-100 dark:bg-gray-800 border-b md:border-b-0 md:border-r border-gray-300 dark:border-gray-600 px-4 py-3">
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">Part {currentPart}</h2>
            <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300 font-medium">
              {getAnsweredCount()} of {getTotalQuestions()} answered
            </div>
          </div>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
            Read the text and answer questions {getQuestionsByPart(currentPart)[0]?.id}–
            {getQuestionsByPart(currentPart)[getQuestionsByPart(currentPart).length - 1]?.id}.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Reading Passage */}
        <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-gray-300 dark:border-gray-600 overflow-y-auto bg-white dark:bg-gray-800">
          <div className="p-4 md:p-8">
            {getCurrentReading() && (
              <div className="space-y-4 md:space-y-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-3">
                  {getCurrentReading()?.passage_title}
                </h2>
                <div className="prose prose-sm max-w-none text-gray-800 dark:text-gray-200 leading-relaxed">
                  {getCurrentReading()
                    ?.passage_text.split("\n\n")
                    .map((paragraph, index) => (
                      <p key={index} className="mb-4 md:mb-5 text-sm leading-6 md:leading-7 text-justify">
                        {paragraph}
                      </p>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="w-full md:w-1/2 overflow-y-auto bg-white dark:bg-gray-800">
          <div className="p-4 md:p-8">
            <div className="mb-6 md:mb-8">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="font-bold text-base md:text-lg text-gray-900 dark:text-white">
                  Questions {getQuestionsByPart(currentPart)[0]?.id}–
                  {getQuestionsByPart(currentPart)[getQuestionsByPart(currentPart).length - 1]?.id}
                </h3>
              </div>

              <div className="mb-4 md:mb-6 p-3 md:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500 text-xs md:text-sm text-gray-800 dark:text-gray-200">
                Choose <strong>TRUE</strong> if the statement agrees with the information given in the text, choose{" "}
                <strong>FALSE</strong> if the statement contradicts the information, or choose{" "}
                <strong>NOT GIVEN</strong> if there is no information on this.
              </div>
            </div>

            <div className="space-y-6 md:space-y-8 mb-20">
              {getQuestionsByPart(currentPart).map((question) => (
                <div
                  key={question.id}
                  id={`question-${question.id}`}
                  className="border-l-4 border-blue-200 dark:border-blue-600 pl-4 md:pl-6 py-2"
                >
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-sm font-bold min-w-[28px] md:min-w-[32px] text-center">
                      {question.id}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs md:text-sm text-gray-900 dark:text-gray-100 mb-3 md:mb-4 leading-relaxed font-medium">
                        {question.question_text}
                      </p>

                      {question.photo && (
                        <div className="mb-4 md:mb-6">
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/uploads/${question.photo}`}
                            alt={`Question ${question.id} image`}
                            className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm"
                            style={{ maxHeight: "300px" }}
                          />
                        </div>
                      )}

                      {question.options && (
                        <RadioGroup
                          value={answers[question.id] || ""}
                          onValueChange={(value) => handleAnswerChange(question.id, value)}
                          className="space-y-2 md:space-y-3"
                        >
                          {question.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2 md:space-x-3">
                              <RadioGroupItem
                                value={option}
                                id={`q${question.id}-${index}`}
                                className="border-gray-400 dark:border-gray-500 text-blue-600"
                              />
                              <Label
                                htmlFor={`q${question.id}-${index}`}
                                className="cursor-pointer text-xs md:text-sm text-gray-800 dark:text-gray-200 font-normal leading-relaxed"
                              >
                                {option}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {!question.options && (
                        <div className="space-y-2">
                          <Input
                            value={answers[question.id] || ""}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            placeholder="Enter your answer"
                            className="w-full md:max-w-xs border-gray-400 dark:border-gray-500 dark:bg-gray-700 dark:text-white text-xs md:text-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 rounded-md"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Write ONE WORD AND/OR A NUMBER for each answer.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 shadow-lg z-40">
        <div className="px-2 md:px-4 py-2 md:py-3">
          <div className="flex items-center justify-between">
            {/* Parts Navigation */}
            <div className="flex items-center gap-1 md:gap-2 overflow-x-auto flex-1">
              {getAvailableParts().map((partNumber) => {
                const partQuestions = getQuestionsForBottomNav(partNumber - 1)
                const isExpanded = expandedPart === partNumber

                return (
                  <div key={partNumber} className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant={currentPart === partNumber ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setCurrentPart(partNumber)
                        setExpandedPart(isExpanded ? null : partNumber)
                      }}
                      className={`text-xs md:text-sm px-2 md:px-3 py-1 md:py-2 h-auto whitespace-nowrap ${
                        currentPart === partNumber
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-600"
                      }`}
                    >
                      Part {partNumber}
                    </Button>

                    {/* Question Numbers for Expanded Part */}
                    {isExpanded && (
                      <div className="flex items-center gap-1 ml-2 overflow-x-auto">
                        {partQuestions.map((question) => (
                          <Button
                            key={question.id}
                            variant="outline"
                            size="sm"
                            className={`w-6 h-6 md:w-8 md:h-8 p-0 text-xs font-medium rounded flex-shrink-0 ${
                              isQuestionAnswered(question.id)
                                ? "bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-600 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800"
                                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                            }`}
                            onClick={() => jumpToQuestion(question.id)}
                          >
                            {question.globalNumber}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || showSubmitLoading || isSubmitted}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-6 py-1 md:py-2 text-xs md:text-sm font-medium rounded ml-2 md:ml-4 flex-shrink-0"
            >
              {isSubmitting || showSubmitLoading ? (
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-2 border-white border-t-transparent"></div>
                  <span className="hidden md:inline">Submitting...</span>
                </div>
              ) : isSubmitted ? (
                "Submitted"
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

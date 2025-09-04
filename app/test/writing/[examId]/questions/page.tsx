"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "../../../../../components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Timer } from "../../../../../components//timer"
import { saveTestProgress, markSectionCompleted } from "../../../../../lib/test-strotage"
import { Wifi, Volume2, Settings, AlertTriangle } from "lucide-react"
import { useCustomAlert } from "../../../../../components/custom-allert"
import Link from "next/link"
import Image from "next/image"

interface WritingTask {
  id: string
  exam_id: string
  part: string
  task_text: string
  task_image?: string
}

interface WritingTestData {
  id: string
  title: string
  description: string
  writings: WritingTask[]
  duration: number
}

export default function WritingTestPage() {
  const params = useParams()
  const router = useRouter()
  const [testData, setTestData] = useState<WritingTestData | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitLoading, setShowSubmitLoading] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [userId] = useState(1)
  const { showAlert, AlertComponent } = useCustomAlert()

  const examId = params.examId as string

  useEffect(() => {
    fetchTestData()
  }, [examId])

  useEffect(() => {
    if (testData && timeRemaining === null) {
      const timerKey = `timer_${examId}_writing`
      const answersKey = `answers_${examId}_writing`

      const savedTime = localStorage.getItem(timerKey)
      const savedAnswers = localStorage.getItem(answersKey)

      if (savedTime && savedAnswers) {
        setTimeRemaining(Number.parseInt(savedTime))
        setAnswers(JSON.parse(savedAnswers))
      } else {
        const initialTime = (testData.duration || 60) * 60
        setTimeRemaining(initialTime)
        localStorage.setItem(timerKey, initialTime.toString())
      }
    }
  }, [testData, examId, timeRemaining])

  useEffect(() => {
    const interval = setInterval(() => {
      if (testData && timeRemaining !== null) {
        const timerKey = `timer_${examId}_writing`
        const answersKey = `answers_${examId}_writing`

        localStorage.setItem(timerKey, timeRemaining.toString())
        localStorage.setItem(answersKey, JSON.stringify(answers))

        saveTestProgress({
          mockTestId: examId,
          sectionId: "writing",
          answers,
          timeRemaining,
          completed: false,
        })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [answers, timeRemaining, testData, examId])

  useEffect(() => {
    if (testData?.writings[0]) {
      const text = answers[testData.writings[0].id] || ""
      const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0)
      setWordCount(words.length)
    }
  }, [answers, testData])

  const fetchTestData = async () => {
    try {
      setIsLoading(true)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${API_BASE_URL}/exams/${examId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch test data")
      }

      const data = await response.json()
      setTestData({
        id: data.id,
        title: data.title,
        description: data.description,
        writings: data.writings || [],
        duration: Number.parseInt(data.duration) || 60,
      })
    } catch (error) {
      console.error("Failed to fetch writing test data:", error)
      setTestData({
        id: examId,
        title: "IELTS Writing Test",
        description: "Complete writing test with tasks",
        duration: 60,
        writings: [
          {
            id: "1",
            exam_id: examId,
            part: "task1",
            task_text:
              "The chart below shows the number of adults participating in different major sports, in 1997 and 2017. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. You should spend about 20 minutes on this task. Write at least 150 words.",
            task_image: "/sports-participation-chart-1997-vs-2017.png",
          },
        ],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (taskId: string, text: string) => {
    const newAnswers = { ...answers, [taskId]: text }
    setAnswers(newAnswers)

    const answersKey = `answers_${examId}_writing`
    localStorage.setItem(answersKey, JSON.stringify(newAnswers))

    submitSingleAnswer(taskId, text)
  }

  const submitSingleAnswer = async (taskId: string, answer: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      await fetch(`${API_BASE_URL}/writing-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          writing_id: Number.parseInt(taskId),
          examId: Number.parseInt(examId),
          answer_text: answer,
        }),
      })
    } catch (error) {
      console.error("Failed to save answer:", error)
    }
  }

  const handleSubmit = async () => {
    showAlert({
      title: "Submit Test",
      description: "Are you sure you want to submit your test? This action cannot be undone.",
      type: "warning",
      confirmText: "Yes, Submit",
      cancelText: "No, Continue",
      onConfirm: async () => {
        setShowSubmitLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
          const answerPromises = Object.entries(answers).map(([taskId, answer]) =>
            fetch(`${API_BASE_URL}/writing-answers`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: userId,
                writing_id: Number.parseInt(taskId),
                examId: Number.parseInt(examId),
                answer_text: answer,
              }),
            }),
          )

          await Promise.all(answerPromises)
          localStorage.removeItem(`timer_${examId}_writing`)
          localStorage.removeItem(`answers_${examId}_writing`)
          markSectionCompleted(examId, "writing")

          showAlert({
            title: "Test Completed Successfully!",
            description: "Your answers have been saved. Redirecting to results page...",
            type: "success",
            confirmText: "Continue",
            showCancel: false,
            onConfirm: () => router.push(`/mock/${examId}`),
          })
        } catch (error) {
          console.error("Failed to submit writing test:", error)
        } finally {
          setShowSubmitLoading(false)
        }
      },
    })
  }

  const handleTimeUpdate = (newTime: number) => {
    setTimeRemaining(newTime)
    const timerKey = `timer_${examId}_writing`
    localStorage.setItem(timerKey, newTime.toString())
  }

  if (isLoading || timeRemaining === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading writing test...</p>
        </div>
      </div>
    )
  }

  if (!testData || !testData.writings[0]) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Test Not Found</h1>
          <Link href={`/mock/${examId}`}>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">Back to Mock Test</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (showSubmitLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Submitting Your Test</h1>
          <p className="text-gray-600">Please wait while we process your answers...</p>
        </div>
      </div>
    )
  }

  const currentTask = testData.writings[0]
  const minWords = currentTask.part === "task1" ? 150 : 250

  return (
    <div className="min-h-screen bg-gray-50">
      <AlertComponent />

      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-red-600 font-bold text-xl tracking-wide">IELTS</div>
            <div className="text-gray-600 text-sm">Test taker ID: Student</div>
          </div>
          <div className="flex items-center gap-4">
            <Timer
              initialTime={timeRemaining}
              onTimeUpdate={handleTimeUpdate}
              onTimeUp={handleSubmit}
              className="text-lg font-mono bg-gray-100 px-4 py-2 rounded border"
            />
            <Wifi className="h-5 w-5 text-gray-600" />
            <Volume2 className="h-5 w-5 text-gray-600" />
            <Settings className="h-5 w-5 text-gray-600" />
          </div>
        </div>
      </header>

      <div className="bg-gray-100 border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900">Part 1</h2>
          <p className="text-sm text-gray-600">
            You should spend about 20 minutes on this task. Write at least 150 words.
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-140px)]">
        <div className="w-1/2 border-r border-gray-300 overflow-y-auto bg-white">
          <div className="p-8">
            <div className="space-y-6">
              <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                <p className="mb-6 text-sm leading-7">{currentTask.task_text}</p>
              </div>

              {currentTask.task_image && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <Image
                    src={currentTask.task_image || "/placeholder.svg"}
                    alt="Writing task chart"
                    width={600}
                    height={400}
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-1/2 overflow-y-auto bg-white">
          <div className="p-8 h-full flex flex-col">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-900">Your Response</h3>
                <div className="text-sm">
                  <span
                    className={`font-medium ${wordCount >= minWords ? "text-green-600" : wordCount >= minWords * 0.8 ? "text-orange-600" : "text-red-600"}`}
                  >
                    Words: {wordCount}
                  </span>
                  <span className="text-gray-500 ml-2">/ {minWords} minimum</span>
                </div>
              </div>
            </div>

            <Textarea
              value={answers[currentTask.id] || ""}
              onChange={(e) => handleAnswerChange(currentTask.id, e.target.value)}
              placeholder="Start writing your response here..."
              className="flex-1 min-h-[400px] resize-none text-sm leading-relaxed border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />

            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {wordCount < minWords && (
                  <span className="text-orange-600">You need at least {minWords - wordCount} more words</span>
                )}
                {wordCount >= minWords && <span className="text-green-600">Word count requirement met ✓</span>}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || showSubmitLoading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-2 text-base font-medium rounded-lg shadow-lg"
              >
                {isSubmitting || showSubmitLoading ? "Submitting..." : "Submit Test"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

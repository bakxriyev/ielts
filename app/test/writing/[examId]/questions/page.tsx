"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Timer } from "@/components/timer"
import {
  saveTestProgress,
  markSectionCompleted,
  areAllSectionsCompleted,
  checkWritingCompletion,
} from "../../../../../lib/test-strotage"
import { Wifi, Volume2, Settings, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"
import { useCustomAlert } from "../../../../../components/custom-allert"
import { CompletionModal } from "../../../../../components/completion-modal"
import Link from "next/link"
import Image from "next/image"

interface WritingTask {
  id: string
  exam_id: string
  part: string
  task_text: string
  task_image?: string
  writing_id: number
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
  const [currentPartIndex, setCurrentPartIndex] = useState(0)
  const [userId, setUserId] = useState<string>("1")
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const { showAlert, AlertComponent } = useCustomAlert()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const examId = params.examId as string

  const WRITING_DURATION = 60 * 60

  const getUserId = () => {
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const user = JSON.parse(userData)
        return user.id ? String(user.id) : "1"
      }
    } catch (error) {
      console.error("[v0] Error parsing user data from localStorage:", error)
    }
    return "1" // fallback to "1" as string if no user data found
  }

  useEffect(() => {
    setUserId(getUserId())
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
        const parsedAnswers = JSON.parse(savedAnswers)
        const simpleAnswers: Record<string, string> = {}
        Object.entries(parsedAnswers).forEach(([taskId, data]: [string, any]) => {
          if (typeof data === "object" && data.answer_text) {
            simpleAnswers[taskId] = data.answer_text
          } else if (typeof data === "string") {
            simpleAnswers[taskId] = data
          }
        })
        setAnswers(simpleAnswers)
      } else {
        setTimeRemaining(WRITING_DURATION)
        localStorage.setItem(timerKey, WRITING_DURATION.toString())
      }
    }
  }, [testData, examId, timeRemaining])

  useEffect(() => {
    const interval = setInterval(() => {
      if (testData && timeRemaining !== null) {
        const timerKey = `timer_${examId}_writing`
        const answersKey = `answers_${examId}_writing`

        localStorage.setItem(timerKey, timeRemaining.toString())

        const exactApiFormat: Record<string, any> = {}
        Object.entries(answers).forEach(([taskId, answer]) => {
          const currentTask = testData?.writings.find((w) => w.id === taskId)
          exactApiFormat[taskId] = {
            user_id: String(userId),
            exam_id: Number(examId),
            writing_id: currentTask?.writing_id || Number(taskId),
            answer_text: answer,
            part: currentTask?.part || "PART1", // Added part field
          }
        })
        localStorage.setItem(answersKey, JSON.stringify(exactApiFormat))

        saveTestProgress({
          mockTestId: examId,
          sectionId: "writing",
          answers,
          timeRemaining,
          completed: false,
        })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [answers, timeRemaining, testData, examId, userId])

  useEffect(() => {
    if (testData?.writings[currentPartIndex]) {
      const text = answers[testData.writings[currentPartIndex].id] || ""
      const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0)
      setWordCount(words.length)
    }
  }, [answers, testData, currentPartIndex])

  useEffect(() => {
    if (timeRemaining === 0) {
      handleSubmit()
    }
  }, [timeRemaining])

  const fetchTestData = async () => {
    try {
      setIsLoading(true)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${API_BASE_URL}/exams/${examId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch test data")
      }

      const data = await response.json()

      const writings = data.writings || []
      const part1Tasks = writings.filter((w: any) => w.part === "PART1" || w.part === "task1")
      const part2Tasks = writings.filter((w: any) => w.part === "PART2" || w.part === "task2")

      setTestData({
        id: data.id,
        title: data.title,
        description: data.description,
        writings: [...part1Tasks, ...part2Tasks],
        duration: WRITING_DURATION / 60,
      })
    } catch (error) {
      console.error("Failed to fetch writing test data:", error)
      setTestData({
        id: examId,
        title: "IELTS Writing Test",
        description: "Complete writing test with tasks",
        duration: WRITING_DURATION / 60,
        writings: [
          {
            id: "1",
            exam_id: examId,
            part: "PART1",
            writing_id: 1,
            task_text:
              "The chart below shows the number of adults participating in different major sports, in 1997 and 2017. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. You should spend about 20 minutes on this task. Write at least 150 words.",
            task_image: "sports-participation-chart-1997-vs-2017.png",
          },
          {
            id: "2",
            exam_id: examId,
            part: "PART2",
            writing_id: 2,
            task_text:
              "Some people think that all university students should study whatever they like. Others believe that they should only be allowed to study subjects that will be useful in the future, such as those related to science and technology. Discuss both these views and give your own opinion. Give reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.",
          },
        ],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "x")) {
      e.preventDefault()
      showAlert({
        title: "Action Not Allowed",
        description: "Copy and paste operations are disabled for security reasons.",
        type: "warning",
        confirmText: "OK",
        showCancel: false,
      })
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  const handleAnswerChange = (taskId: string, text: string) => {
    const newAnswers = { ...answers, [taskId]: text }
    setAnswers(newAnswers)

    const currentTask = testData?.writings.find((w) => w.id === taskId)
    const exactApiFormat = {
      user_id: String(userId),
      exam_id: Number(examId),
      writing_id: currentTask?.writing_id || Number(taskId),
      answer_text: text,
      part: currentTask?.part || "PART1", // Added part field
    }

    const answersKey = `answers_${examId}_writing`
    const existingAnswers = JSON.parse(localStorage.getItem(answersKey) || "{}")
    existingAnswers[taskId] = exactApiFormat
    localStorage.setItem(answersKey, JSON.stringify(existingAnswers))
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
          const answerPromises = Object.entries(answers).map(([taskId, answer]) => {
            const currentTask = testData?.writings.find((w) => w.id === taskId)
            return fetch(`${API_BASE_URL}/writing-answers`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: String(userId),
                exam_id: Number(examId),
                writing_id: currentTask?.writing_id || Number(taskId),
                answer_text: answer,
                part: currentTask?.part || "PART1", // Added part field
              }),
            })
          })

          await Promise.all(answerPromises)
          localStorage.removeItem(`timer_${examId}_writing`)
          localStorage.removeItem(`answers_${examId}_writing`)

          const writingCompleted = await checkWritingCompletion(String(userId), examId)
          if (writingCompleted) {
            markSectionCompleted(examId, "writing")
          }

          if (areAllSectionsCompleted(examId)) {
            setShowCompletionModal(true)
          } else {
            showAlert({
              title: "Test Completed Successfully!",
              description: "Your answers have been saved. Redirecting to results page...",
              type: "success",
              confirmText: "Continue",
              showCancel: false,
              onConfirm: () => router.push(`/mock/${examId}`),
            })
          }
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

  const goToPreviousPart = () => {
    if (currentPartIndex > 0) {
      setCurrentPartIndex(currentPartIndex - 1)
    }
  }

  const goToNextPart = () => {
    if (testData && currentPartIndex < testData.writings.length - 1) {
      setCurrentPartIndex(currentPartIndex + 1)
    }
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

  if (!testData || testData.writings.length === 0) {
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

  const currentTask = testData.writings[currentPartIndex]
  const minWords = currentTask.part === "PART1" || currentTask.part === "task1" ? 150 : 250

  return (
    <div className="min-h-screen bg-gray-50">
      <AlertComponent />
      <CompletionModal isOpen={showCompletionModal} onClose={() => setShowCompletionModal(false)} />

      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-red-600 font-bold text-xl tracking-wide">IELTS</div>
            <div className="text-gray-600 text-sm">Test taker ID: Student</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-red-100 border border-red-300 px-4 py-2 rounded-lg">
              <Timer
                initialTime={timeRemaining}
                onTimeUpdate={handleTimeUpdate}
                onTimeUp={handleSubmit}
                className="text-lg font-mono text-red-700 font-bold"
              />
            </div>
            <Wifi className="h-5 w-5 text-gray-600" />
            <Volume2 className="h-5 w-5 text-gray-600" />
            <Settings className="h-5 w-5 text-gray-600" />
          </div>
        </div>
      </header>

      <div className="bg-gray-100 border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentTask.part === "PART1" || currentTask.part === "task1" ? "Part 1" : "Part 2"}
            </h2>
            <p className="text-sm text-gray-600">
              {currentTask.part === "PART1" || currentTask.part === "task1"
                ? "You should spend about 20 minutes on this task. Write at least 150 words."
                : "You should spend about 40 minutes on this task. Write at least 250 words."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={goToPreviousPart}
              disabled={currentPartIndex === 0}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-gray-600 px-2">
              {currentPartIndex + 1} of {testData.writings.length}
            </span>
            <Button
              onClick={goToNextPart}
              disabled={currentPartIndex >= testData.writings.length - 1}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)]">
        <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-gray-300 overflow-y-auto bg-white">
          <div className="p-4 lg:p-8">
            <div className="space-y-6">
              <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                <p className="mb-6 text-sm leading-7">{currentTask.task_text}</p>
              </div>

              {currentTask.task_image && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/uploads/writing/${currentTask.task_image}`}
                    alt="Writing task chart"
                    width={400}
                    height={250}
                    className="w-full h-auto max-w-md mx-auto"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 overflow-y-auto bg-white">
          <div className="p-4 lg:p-8 h-full flex flex-col">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-gray-900">Your Response</h3>
                <div className="text-sm">
                  <span
                    className={`font-medium ${
                      wordCount >= minWords
                        ? "text-green-600"
                        : wordCount >= minWords * 0.8
                          ? "text-orange-600"
                          : "text-red-600"
                    }`}
                  >
                    Words: {wordCount}
                  </span>
                  <span className="text-gray-500 ml-2">/ {minWords} minimum</span>
                </div>
              </div>
            </div>

            <Textarea
              ref={textareaRef}
              value={answers[currentTask.id] || ""}
              onChange={(e) => handleAnswerChange(currentTask.id, e.target.value)}
              onKeyDown={handleKeyDown}
              onContextMenu={handleContextMenu}
              placeholder="Start writing your response here..."
              className="flex-1 min-h-[300px] lg:min-h-[400px] resize-none text-sm leading-relaxed border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />

            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                {wordCount < minWords && (
                  <span className="text-orange-600">You need at least {minWords - wordCount} more words</span>
                )}
                {wordCount >= minWords && <span className="text-green-600">Word count requirement met ✓</span>}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || showSubmitLoading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-2 text-base font-medium rounded-lg shadow-lg w-full sm:w-auto"
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

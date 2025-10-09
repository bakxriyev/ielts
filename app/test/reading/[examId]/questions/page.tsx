"use client"

import React from "react"

import { useEffect, useState, useRef, use, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../../../../../components/ui/button"
import { useAuth } from "../../../../../contexts/auth-context"
import { AlertTriangle, ChevronLeft, MoreVertical, Wifi, WifiOff } from "lucide-react"
import { useCustomAlert } from "../../../../../hooks/use-custom-alert"
import Link from "next/link"
import { Input } from "../../../../../components/ui/input"
import { RadioGroup, RadioGroupItem } from "../../../../../components/ui/radio-group"
import { Label } from "../../../../../components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../../components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../../components/ui/dialog"
import Timer from "../../../../../components/timer"

interface RQuestion {
  id: number
  reading_questions_id: number
  q_type: string
  q_text: string
  options: Array<{ key: string; text: string }>
  correct_answers: string[]
  table_structure?: {
    rows: Array<{ [key: string]: string }>
    headers: string[]
  } | null
  match_pairs?: Array<{ left: string; right: string }> | null
  photo?: string | null
  createdAt: string
  updatedAt: string
  q_number?: number
  text?: string
  type?: string
  title?: string
  instruction?: string
  choices?: { [key: string]: string }
  order?: number
}

interface Question {
  id: string
  q_text: string
  q_type: string
  options?: string[]
  correct_answer?: string
  part: string
  columns?: string[]
  rows?: Array<{
    label: string
    cells: string[]
  }>
  table_structure?: {
    rows: Array<{ [key: string]: string }>
    headers: string[]
  } | null
  match_pairs?: Array<{ left: string; right: string }> | null
  title: string
  instruction: string
  photo: string | null
  reading_id: number
  createdAt: string
  updatedAt: string
  r_questions: RQuestion[]
  instructions?: string
  passage?: string
  order?: number
  choices?: { [key: string]: string }
}

interface Passage {
  id: string
  reading_id: string
  reading_text: string
  part: string
  type: string
  createdAt: string
  updatedAt: string
}

interface TestData {
  id: string
  exam_id: string
  passage_title: string
  passage_text: string
  created_at: string | null
  questions: Question[]
  passage?: string
  reading_text?: string
  passages?: Passage[]
}

export default function ReadingQuestionsPage({ params }: { params: Promise<{ examId: string }> }) {
  const router = useRouter()
  const { user } = useAuth()

  const resolvedParams = use(params)
  const examId = resolvedParams.examId

  const [testData, setTestData] = useState<TestData | null>(null)
  const [currentPart, setCurrentPart] = useState(1)
  const [answers, setAnswers] = useState<Record<string, string | Record<string, string> | string[]>>({})
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitLoading, setShowSubmitLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [expandedPart, setExpandedPart] = useState<number | null>(null)
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [questionNumbers, setQuestionNumbers] = useState<Record<string, number>>({})
  const { showAlert, AlertComponent, setAlert } = useCustomAlert()

  const [colorMode, setColorMode] = useState<"default" | "night" | "yellow">("default")
  const [textSize, setTextSize] = useState(16)
  const [isOnline, setIsOnline] = useState(true)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const [passageWidth, setPassageWidth] = useState(0.5)
  const [isResizing, setIsResizing] = useState(false)
  const mainContentContainerRef = useRef<HTMLDivElement>(null)

  const [draggedOption, setDraggedOption] = useState<{ key: string; text: string } | null>(null)
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, Record<number, string>>>({})

  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    const savedColorMode = localStorage.getItem(`colorMode_${examId}`)
    const savedTextSize = localStorage.getItem(`textSize_${examId}`)

    if (savedColorMode && (savedColorMode === "default" || savedColorMode === "night" || savedColorMode === "yellow")) {
      setColorMode(savedColorMode as "default" | "night" | "yellow")
    }
    if (savedTextSize) {
      setTextSize(Number.parseInt(savedTextSize))
    }
  }, [examId])

  useEffect(() => {
    localStorage.setItem(`colorMode_${examId}`, colorMode)
    localStorage.setItem(`textSize_${examId}`, textSize.toString())
  }, [colorMode, textSize, examId])

  const getColorModeStyles = () => {
    switch (colorMode) {
      case "night":
        return {
          bg: "bg-black",
          text: "text-white",
          border: "border-gray-700",
          cardBg: "bg-gray-900",
          inputBg: "bg-gray-800",
          inputText: "text-white",
          headerBg: "bg-gray-900",
        }
      case "yellow":
        return {
          bg: "bg-black",
          text: "text-yellow-400",
          border: "border-yellow-600",
          cardBg: "bg-gray-900",
          inputBg: "bg-gray-800",
          inputText: "text-yellow-400",
          headerBg: "bg-gray-900",
        }
      default:
        return {
          bg: "bg-white",
          text: "text-gray-900",
          border: "border-gray-200",
          cardBg: "bg-white",
          inputBg: "bg-white",
          inputText: "text-gray-900",
          headerBg: "bg-white",
        }
    }
  }

  const colorStyles = getColorModeStyles()

  const handleTimeUp = () => {
    setAlert({
      title: "Time's Up!",
      message: "Your test time has ended. It will be submitted automatically.",
      type: "info",
    })
    handleSubmit()
  }

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        setIsLoading(true)
        const apiUrl = process.env.NEXT_PUBLIC_API_URL
        if (!apiUrl) {
          throw new Error("API URL not configured")
        }

        const response = await fetch(`${apiUrl}/reading/${examId}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch test data: ${response.status}`)
        }

        const data: TestData = await response.json()
        setTestData(data)

        if (data?.questions && data?.passages) {
          const numbers: Record<string, number> = {}
          let currentQNum = 1

          const sortedQuestions = [...data.questions].sort((a, b) => {
            const aOrder = a.order ?? a.id
            const bOrder = b.order ?? b.id
            return Number(aOrder) - Number(bOrder)
          })

          sortedQuestions.forEach((questionGroup) => {
            const sortedRQuestions = questionGroup.r_questions
              ? [...questionGroup.r_questions].sort((a, b) => {
                  const aOrder = a.order ?? a.q_number ?? a.id
                  const bOrder = b.order ?? b.q_number ?? b.id
                  return Number(aOrder) - Number(bOrder)
                })
              : []

            sortedRQuestions.forEach((question) => {
              const questionId = `${questionGroup.id}_${question.id}`
              numbers[questionId] = currentQNum

              if (question.q_type === "MATCHING_HEADINGS") {
                const matchingPassage = data.passages.find((p) => p.type === "matching")
                if (matchingPassage) {
                  const underscorePattern = /_{2,}/g
                  const matches = [...matchingPassage.reading_text.matchAll(underscorePattern)]
                  currentQNum += matches.length
                } else {
                  currentQNum++
                }
              } else if (question.q_type === "MCQ_MULTI") {
                const correctCount = question.correct_answers?.length || 1
                currentQNum += correctCount
              } else if (question.q_type === "TABLE_COMPLETION") {
                let inputCount = 0
                if (question.rows && Array.isArray(question.rows)) {
                  question.rows.forEach((row) => {
                    if (row.cells && Array.isArray(row.cells)) {
                      row.cells.forEach((cell) => {
                        if (cell === "" || cell === "_") {
                          inputCount++
                        }
                      })
                    }
                  })
                } else if (question.table_structure?.rows) {
                  question.table_structure.rows.forEach((row) => {
                    Object.values(row).forEach((value) => {
                      if (value === "" || value === "_") {
                        inputCount++
                      }
                    })
                  })
                }
                currentQNum += inputCount
              } else if (question.q_type === "MATCHING_INFORMATION") {
                const rowCount = (question as any).rows?.length || 1
                currentQNum += rowCount
              } else if (question.q_type === "SENTENCE_COMPLETION") {
                const blankCount = (question.q_text?.match(/_+/g) || []).length
                currentQNum += blankCount
              } else {
                currentQNum++
              }
            })
          })

          setQuestionNumbers(numbers)
          setTotalQuestions(currentQNum - 1)
        }

        const initialTime = 3600
        setTimeRemaining(initialTime)

        const answersKey = `answers_${examId}_reading`
        const savedAnswers = localStorage.getItem(answersKey)
        if (savedAnswers) {
          try {
            const answersArray = JSON.parse(savedAnswers)
            if (Array.isArray(answersArray)) {
              const loadedAnswers: Record<string, string | Record<string, string> | string[]> = {}

              answersArray.forEach((item: any) => {
                if (item.question_type === "TABLE_COMPLETION" && item.answer && typeof item.answer === "object") {
                  const cellPosition = Object.keys(item.answer)[0]
                  const cellValue = item.answer[cellPosition]
                  const [rowIndex, cellIndex] = cellPosition.split("_")
                  const questionId = `${item.questionId}_${item.r_questionsID}_table_${rowIndex}_${cellIndex}`
                  loadedAnswers[questionId] = cellValue
                } else if (
                  item.question_type === "MATCHING_HEADINGS" &&
                  item.answer &&
                  typeof item.answer === "object"
                ) {
                  const positionIndex = Object.keys(item.answer)[0]
                  const value = item.answer[positionIndex]
                  const questionId = `matching_${positionIndex}`
                  loadedAnswers[questionId] = value

                  setMatchingAnswers((prev) => ({
                    ...prev,
                    [item.questionId + "_" + item.r_questionsID]: {
                      ...(prev[item.questionId + "_" + item.r_questionsID] || {}),
                      [Number.parseInt(positionIndex)]: value,
                    },
                  }))
                } else if (item.question_type === "MCQ_MULTI") {
                  const questionId = `${item.questionId}_${item.r_questionsID}`
                  if (!loadedAnswers[questionId]) {
                    loadedAnswers[questionId] = []
                  }
                  if (Array.isArray(loadedAnswers[questionId])) {
                    ;(loadedAnswers[questionId] as string[]).push(item.answer)
                  }
                } else if (item.rowIndex !== undefined) {
                  const questionId = `${item.questionId}_${item.r_questionsID}_row_${item.rowIndex}`
                  loadedAnswers[questionId] = item.answer
                } else if (item.blankIndex !== undefined) {
                  const questionId = `${item.questionId}_${item.r_questionsID}_summary_${item.blankIndex}`
                  loadedAnswers[questionId] = item.answer
                } else if (item.question_type === "SENTENCE_COMPLETION") {
                  const questionId = `${item.questionId}_${item.r_questionsID}`
                  loadedAnswers[questionId] = item.answer
                } else {
                  const questionId = `${item.questionId}_${item.r_questionsID}`
                  loadedAnswers[questionId] = item.answer
                }
              })

              console.log("[v0] Loaded answers from localStorage:", loadedAnswers)
              setAnswers(loadedAnswers)
            }
          } catch (error) {
            console.error("[v0] Error loading answers from localStorage:", error)
          }
        }
      } catch (error) {
        console.error("Failed to fetch reading test data:", error)

        if (timeRemaining === null) {
          setTimeRemaining(3600)
        }

        setTestData({
          id: "1",
          exam_id: examId,
          passage_title: "Sample Reading Test",
          passage_text: "<p>Loading...</p>",
          created_at: null,
          questions: [],
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTestData()
  }, [examId])

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  const handleAnswerChange = (questionId: string, answer: string | string[] | Record<string, string>) => {
    console.log("[v0] handleAnswerChange called:", { questionId, answer })

    const newAnswers = {
      ...answers,
      [questionId]: answer,
    }
    setAnswers(newAnswers)

    const answersKey = `answers_${examId}_reading`
    const existingAnswers = localStorage.getItem(answersKey)
    let answersArray: any[] = []

    try {
      if (existingAnswers) {
        const parsed = JSON.parse(existingAnswers)
        answersArray = Array.isArray(parsed) ? parsed : []
      }
    } catch (error) {
      console.log("[v0] Error parsing localStorage answers:", error)
      answersArray = []
    }

    const parts = questionId.split("_")
    const questionGroupId = parts[0]
    const rQuestionId = parts[1] || parts[0]

    const questionGroup = testData?.questions.find((qg) => qg.id.toString() === questionGroupId)
    const question = questionGroup?.r_questions?.find((rq) => rq.id.toString() === rQuestionId)
    const questionType = question?.q_type || "UNKNOWN"

    console.log("[v0] Question info:", { questionGroupId, rQuestionId, questionType, question })

    if (!answer || (Array.isArray(answer) && answer.length === 0) || answer.toString().trim() === "") {
      console.log("[v0] Deleting answer for:", questionId)

      if (questionId.includes("_table_")) {
        const rowIndex = parts[parts.length - 2]
        const cellIndex = parts[parts.length - 1]
        const cellPosition = `${rowIndex}_${cellIndex}`
        answersArray = answersArray.filter(
          (item: any) => !(item.question_type === "TABLE_COMPLETION" && item.answer && item.answer[cellPosition]),
        )
      } else if (questionId.startsWith("matching_")) {
        const positionIndex = parts[1]
        answersArray = answersArray.filter(
          (item: any) => !(item.question_type === "MATCHING_HEADINGS" && item.answer && item.answer[positionIndex]),
        )
      } else if (questionType === "MCQ_MULTI") {
        answersArray = answersArray.filter(
          (item: any) =>
            !(
              item.questionId === Number.parseInt(questionGroupId) &&
              item.r_questionsID === Number.parseInt(rQuestionId) &&
              item.question_type === "MCQ_MULTI"
            ),
        )
      } else if (questionId.includes("_row_")) {
        const rowIndex = Number.parseInt(parts[parts.length - 1])
        answersArray = answersArray.filter(
          (item: any) =>
            !(
              item.questionId === Number.parseInt(questionGroupId) &&
              item.r_questionsID === Number.parseInt(rQuestionId) &&
              item.rowIndex === rowIndex
            ),
        )
      } else if (questionType === "SENTENCE_COMPLETION" || questionType === "SUMMARY_COMPLETION") {
        answersArray = answersArray.filter(
          (item: any) =>
            !(
              item.questionId === Number.parseInt(questionGroupId) &&
              item.r_questionsID === Number.parseInt(rQuestionId) &&
              (item.question_type === "SENTENCE_COMPLETION" || item.question_type === "SUMMARY_COMPLETION")
            ),
        )
      } else {
        answersArray = answersArray.filter(
          (item: any) =>
            !(
              item.questionId === Number.parseInt(questionGroupId) &&
              item.r_questionsID === Number.parseInt(rQuestionId) &&
              !item.rowIndex
            ),
        )
      }

      localStorage.setItem(answersKey, JSON.stringify(answersArray))
      console.log("[v0] Saved answers after deletion:", answersArray)
      return
    }

    if (questionId.includes("_table_")) {
      const rowIndex = parts[parts.length - 2]
      const cellIndex = parts[parts.length - 1]
      const cellPosition = `${rowIndex}_${cellIndex}`

      answersArray = answersArray.filter(
        (item: any) => !(item.question_type === "TABLE_COMPLETION" && item.answer && item.answer[cellPosition]),
      )

      answersArray.push({
        userId: String(user?.id) || "1",
        questionId: Number.parseInt(questionGroupId),
        r_questionsID: Number.parseInt(rQuestionId),
        examId: Number.parseInt(examId),
        question_type: "TABLE_COMPLETION",
        answer: {
          [cellPosition]: answer,
        },
      })

      console.log("[v0] Saved TABLE answer:", { cellPosition, answer })
    } else if (questionId.startsWith("matching_")) {
      const positionIndex = parts[1]

      answersArray = answersArray.filter(
        (item: any) => !(item.question_type === "MATCHING_HEADINGS" && item.answer && item.answer[positionIndex]),
      )

      const matchingQuestion = testData?.questions
        .flatMap((qg) => qg.r_questions || [])
        .find((q) => q.q_type === "MATCHING_HEADINGS")

      if (matchingQuestion) {
        const matchingQuestionGroup = testData?.questions.find((qg) =>
          qg.r_questions?.some((q) => q.id === matchingQuestion.id),
        )

        answersArray.push({
          userId: String(user?.id) || "1",
          questionId: matchingQuestionGroup?.id || Number.parseInt(questionGroupId),
          r_questionsID: matchingQuestion.id,
          examId: Number.parseInt(examId),
          question_type: "MATCHING_HEADINGS",
          answer: {
            [positionIndex]: answer,
          },
        })

        console.log("[v0] Saved MATCHING_HEADINGS answer:", { positionIndex, answer })
      }
    } else if (questionType === "MCQ_MULTI" && Array.isArray(answer)) {
      answersArray = answersArray.filter(
        (item: any) =>
          !(
            item.questionId === Number.parseInt(questionGroupId) &&
            item.r_questionsID === Number.parseInt(rQuestionId) &&
            item.question_type === "MCQ_MULTI"
          ),
      )

      answer.forEach((selectedOption) => {
        answersArray.push({
          userId: String(user?.id) || "1",
          questionId: Number.parseInt(questionGroupId),
          r_questionsID: Number.parseInt(rQuestionId),
          examId: Number.parseInt(examId),
          question_type: "MCQ_MULTI",
          answer: selectedOption,
        })
      })

      console.log("[v0] Saved MCQ_MULTI answers:", answer)
    } else if (questionId.includes("_row_")) {
      const rowIndex = Number.parseInt(parts[parts.length - 1])

      answersArray = answersArray.filter(
        (item: any) =>
          !(
            item.questionId === Number.parseInt(questionGroupId) &&
            item.r_questionsID === Number.parseInt(rQuestionId) &&
            item.rowIndex === rowIndex
          ),
      )

      answersArray.push({
        userId: String(user?.id) || "1",
        questionId: Number.parseInt(questionGroupId),
        r_questionsID: Number.parseInt(rQuestionId),
        examId: Number.parseInt(examId),
        question_type: questionType,
        rowIndex: rowIndex,
        answer: answer,
      })

      console.log("[v0] Saved MATCHING_INFORMATION answer:", { rowIndex, answer })
    } else if (questionType === "SENTENCE_COMPLETION" || questionType === "SUMMARY_COMPLETION") {
      answersArray = answersArray.filter(
        (item: any) =>
          !(
            item.questionId === Number.parseInt(questionGroupId) &&
            item.r_questionsID === Number.parseInt(rQuestionId) &&
            (item.question_type === "SENTENCE_COMPLETION" || item.question_type === "SUMMARY_COMPLETION")
          ),
      )
      answersArray.push({
        userId: String(user?.id) || "1",
        questionId: Number.parseInt(questionGroupId),
        r_questionsID: Number.parseInt(rQuestionId),
        examId: Number.parseInt(examId),
        question_type: questionType,
        answer: answer,
      })
      console.log(`[v0] Saved ${questionType} answer:`, answer)
    } else {
      answersArray = answersArray.filter(
        (item: any) =>
          !(
            item.questionId === Number.parseInt(questionGroupId) &&
            item.r_questionsID === Number.parseInt(rQuestionId) &&
            !item.rowIndex &&
            !item.blankIndex
          ),
      )

      answersArray.push({
        userId: String(user?.id) || "1",
        questionId: Number.parseInt(questionGroupId),
        r_questionsID: Number.parseInt(rQuestionId),
        examId: Number.parseInt(examId),
        question_type: questionType,
        answer: answer,
      })

      console.log("[v0] Saved regular answer:", { questionType, answer })
    }

    localStorage.setItem(answersKey, JSON.stringify(answersArray))
    console.log("[v0] Total answers in localStorage:", answersArray.length)
  }

  const handleSubmit = async () => {
    if (isSubmitted || isSubmitting || showSubmitLoading || !user?.id) {
      return
    }

    setIsSubmitting(true)
    setShowSubmitLoading(true)

    try {
      const answersKey = `answers_${examId}_reading`
      const savedAnswers = localStorage.getItem(answersKey)

      if (!savedAnswers) {
        throw new Error("No answers found")
      }

      const answersArray = JSON.parse(savedAnswers)

      console.log("[v0] Submitting answers individually:", answersArray.length, "answers")

      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (!apiUrl) {
        throw new Error("API URL not configured")
      }

      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      for (const answer of answersArray) {
        try {
          const response = await fetch(`${apiUrl}/reading-answers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: answer.userId,
              questionId: answer.questionId,
              examId: answer.examId,
              answer: answer.answer,
              r_questionsID: answer.r_questionsID,
              question_type: answer.question_type,
              ...(answer.rowIndex !== undefined && { rowIndex: answer.rowIndex }),
              ...(answer.blankIndex !== undefined && { blankIndex: answer.blankIndex }),
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error("[v0] Submit error for answer:", answer, errorData)
            failCount++
            errors.push(`Question ${answer.questionId}: ${errorData.message || "Failed"}`)
          } else {
            successCount++
            console.log("[v0] Successfully submitted answer:", answer.questionId)
          }
        } catch (error) {
          console.error("[v0] Network error submitting answer:", answer, error)
          failCount++
          errors.push(`Question ${answer.questionId}: Network error`)
        }
      }

      console.log("[v0] Submission complete:", { successCount, failCount })

      if (failCount > 0) {
        setAlert({
          title: "Partial Submission",
          message: `${successCount} answers submitted successfully, ${failCount} failed. Errors: ${errors.join(", ")}`,
          type: "warning",
        })
      }

      // Remove from localStorage only if at least some answers were successful
      if (successCount > 0) {
        localStorage.removeItem(answersKey)
        setIsSubmitted(true)
        setIsCompleted(true)
        router.push(`/results/${examId}`)
      } else {
        throw new Error("All submissions failed")
      }
    } catch (error) {
      console.error("Error submitting test:", error)
      setAlert({
        title: "Submission Failed",
        message: "There was an error submitting your test. Please try again.",
        type: "error",
      })
    } finally {
      setIsSubmitting(false)
      setShowSubmitLoading(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !mainContentContainerRef.current) return

      const containerRect = mainContentContainerRef.current.getBoundingClientRect()
      const newWidth = (e.clientX - containerRect.left) / containerRect.width

      if (newWidth >= 0.2 && newWidth <= 0.8) {
        setPassageWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  const getAvailableParts = (): number[] => {
    if (!testData?.questions) return []

    const parts = new Set<number>()
    testData.questions.forEach((q) => {
      if (q.part) {
        const partNumber = typeof q.part === "string" ? Number.parseInt(q.part.replace("PART", "")) : q.part
        parts.add(partNumber)
      }
    })

    return Array.from(parts).sort((a, b) => a - b)
  }

  const getQuestionsForPart = (partNumber: number): Question[] => {
    if (!testData?.questions) return []

    const part = `PART${partNumber}`
    return testData.questions
      .filter((q) => q.part === part)
      .sort((a, b) => {
        const aOrder = a.order ?? a.id
        const bOrder = b.order ?? b.id
        return Number(aOrder) - Number(bOrder)
      })
  }

  const getCurrentPartPassages = useMemo(() => {
    if (!testData?.passages) return []

    const part = `PART${currentPart}`
    return testData.passages.filter((p) => p.part === part)
  }, [testData, currentPart])

  const getCurrentPartQuestions = useMemo(() => {
    return getQuestionsForPart(currentPart)
  }, [testData, currentPart])

  const switchToPart = (partNumber: number) => {
    setCurrentPart(partNumber)
    const element = document.getElementById(`part-${partNumber}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const getAnsweredCountForPart = (partNumber: number): number => {
    const partQuestions = getQuestionsForPart(partNumber)
    let count = 0

    partQuestions.forEach((questionGroup) => {
      questionGroup.r_questions?.forEach((question) => {
        const questionId = `${questionGroup.id}_${question.id}`

        if (question.q_type === "TABLE_COMPLETION") {
          const inputCount = 0
          if (question.rows && Array.isArray(question.rows)) {
            question.rows.forEach((row, rowIndex) => {
              if (row.cells && Array.isArray(row.cells)) {
                row.cells.forEach((cell, cellIndex) => {
                  if (cell === "" || cell === "_") {
                    const tableQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                    if (answers[tableQuestionId]) {
                      count++
                    }
                  }
                })
              }
            })
          } else if (question.table_structure?.rows) {
            question.table_structure.rows.forEach((row, rowIndex) => {
              Object.entries(row).forEach(([key, value], cellIndex) => {
                if (value === "" || value === "_") {
                  const tableQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                  if (answers[tableQuestionId]) {
                    count++
                  }
                }
              })
            })
          }
        } else if (question.q_type === "MCQ_MULTI") {
          const correctCount = question.correct_answers?.length || 1
          const selectedCount = Array.isArray(answers[questionId]) ? answers[questionId].length : 0
          count += Math.min(selectedCount, correctCount)
        } else if (question.q_type === "MATCHING_INFORMATION") {
          const rowCount = (question as any).rows?.length || 1
          for (let i = 0; i < rowCount; i++) {
            if (answers[`${questionId}_row_${i}`]) {
              count++
            }
          }
        } else if (question.q_type === "SENTENCE_COMPLETION" || question.q_type === "SUMMARY_COMPLETION") {
          if (answers[questionId]) {
            count++
          }
        } else if (question.q_type === "MATCHING_HEADINGS") {
          const getCurrentPartPassages = testData?.passages?.filter((p) => p.part === `PART${partNumber}`) || []
          const matchingPassage = getCurrentPartPassages.find((p) => p.type === "matching")
          if (matchingPassage) {
            const underscorePattern = /_{2,}/g
            const matches = [...matchingPassage.reading_text.matchAll(underscorePattern)]
            matches.forEach((_, index) => {
              if (matchingAnswers[questionId]?.[index + 1]) {
                count++
              }
            })
          }
        } else {
          if (answers[questionId]) {
            count++
          }
        }
      })
    })

    return count
  }

  const getPartQuestionCount = (partNumber: number): number => {
    const part = `PART${partNumber}`
    const getCurrentPartPassages = testData?.passages?.filter((p) => p.part === part) || []

    const partQuestions = testData?.questions.filter((q) => {
      return q.part === part
    })

    let count = 0
    for (const questionGroup of partQuestions) {
      if (questionGroup.r_questions && questionGroup.r_questions.length > 0) {
        questionGroup.r_questions.forEach((question) => {
          if (question.q_type === "TABLE_COMPLETION") {
            let inputCount = 0
            if (question.rows && Array.isArray(question.rows)) {
              question.rows.forEach((row) => {
                if (row.cells && Array.isArray(row.cells)) {
                  row.cells.forEach((cell) => {
                    if (cell === "" || cell === "_") {
                      inputCount++
                    }
                  })
                }
              })
            } else if (question.table_structure?.rows) {
              question.table_structure.rows.forEach((row, rowIndex) => {
                Object.entries(row).forEach(([key, value], cellIndex) => {
                  if (value === "" || value === "_") {
                    inputCount++
                  }
                })
              })
            }
            count += inputCount > 0 ? inputCount : 1
          } else if (question.q_type === "MCQ_MULTI") {
            const correctAnswersCount = question.correct_answers?.length || 1
            count += correctAnswersCount
          } else if (question.q_type === "MATCHING_INFORMATION") {
            const rowCount = (question as any).rows?.length || 1
            count += rowCount
          } else if (question.q_type === "SUMMARY_COMPLETION" || question.q_type === "SUMMARY_DRAG") {
            const blankCount = (question.q_text?.match(/_+/g) || []).length
            count += blankCount > 0 ? blankCount : 1
          } else if (question.q_type === "SENTENCE_COMPLETION") {
            const blankCount = (question.q_text?.match(/_+/g) || []).length
            count += blankCount
          } else if (question.q_type === "MATCHING_HEADINGS") {
            const matchingPassage = getCurrentPartPassages.find((p) => p.type === "matching")
            if (matchingPassage) {
              const underscorePattern = /_{2,}/g
              const matches = [...matchingPassage.reading_text.matchAll(underscorePattern)]
              count += matches.length
            } else {
              count += 1
            }
          } else {
            count += 1
          }
        })
      }
    }
    return count
  }

  const getPartQuestionRange = (partNumber: number): { start: number; end: number } => {
    const allParts = getAvailableParts()
    let start = 1

    for (let i = 0; i < allParts.length; i++) {
      if (allParts[i] === partNumber) {
        const end = start + getPartQuestionCount(partNumber) - 1
        return { start, end }
      }
      start += getPartQuestionCount(allParts[i])
    }

    return { start: 1, end: 1 }
  }

  const getQuestionNumber = (questionId: string): number => {
    return questionNumbers[questionId] || 1
  }

  const getQuestionGroupRange = (questionGroup: Question): { start: number; end: number } => {
    if (!questionGroup.r_questions || questionGroup.r_questions.length === 0) {
      return { start: 1, end: 1 }
    }

    const firstQuestion = questionGroup.r_questions[0]
    const lastQuestion = questionGroup.r_questions[questionGroup.r_questions.length - 1]

    const firstQuestionId = `${questionGroup.id}_${firstQuestion.id}`
    const lastQuestionId = `${questionGroup.id}_${lastQuestion.id}`

    const startNum = getQuestionNumber(firstQuestionId)

    // Calculate end number based on question types
    let endNum = startNum
    questionGroup.r_questions.forEach((question) => {
      const questionId = `${questionGroup.id}_${question.id}`
      const currentStart = getQuestionNumber(questionId)

      if (question.q_type === "MCQ_MULTI") {
        const correctCount = question.correct_answers?.length || 1
        endNum = Math.max(endNum, currentStart + correctCount - 1)
      } else if (question.q_type === "TABLE_COMPLETION") {
        let inputCount = 0
        if (question.rows && Array.isArray(question.rows)) {
          question.rows.forEach((row) => {
            if (row.cells && Array.isArray(row.cells)) {
              row.cells.forEach((cell) => {
                if (cell === "" || cell === "_") {
                  inputCount++
                }
              })
            }
          })
        } else if (question.table_structure?.rows) {
          question.table_structure.rows.forEach((row) => {
            Object.values(row).forEach((value) => {
              if (value === "" || value === "_") {
                inputCount++
              }
            })
          })
        }
        endNum = Math.max(endNum, currentStart + inputCount - 1)
      } else if (question.q_type === "MATCHING_INFORMATION") {
        const rowCount = (question as any).rows?.length || 1
        endNum = Math.max(endNum, currentStart + rowCount - 1)
      } else if (question.q_type === "SENTENCE_COMPLETION") {
        const blankCount = (question.q_text?.match(/_+/g) || []).length
        endNum = Math.max(endNum, currentStart + blankCount - 1)
      } else if (question.q_type === "MATCHING_HEADINGS") {
        const matchingPassage = getCurrentPartPassages.find((p) => p.type === "matching")
        if (matchingPassage) {
          const underscorePattern = /_{2,}/g
          const matches = [...matchingPassage.reading_text.matchAll(underscorePattern)]
          endNum = Math.max(endNum, currentStart + matches.length - 1)
        } else {
          endNum = Math.max(endNum, currentStart)
        }
      } else {
        endNum = Math.max(endNum, currentStart)
      }
    })

    return { start: startNum, end: endNum }
  }

  const parseMatchingPassage = (text: string, questionId: string) => {
    const underscorePattern = /_{2,}/g
    const parts = text.split(underscorePattern)
    const matches = [...text.matchAll(underscorePattern)]

    return (
      <div className={`text-base leading-relaxed ${colorStyles.text}`}>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <span dangerouslySetInnerHTML={{ __html: part }} />
            {index < matches.length && (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add("border-blue-500", "bg-blue-50")
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("border-blue-500", "bg-blue-50")
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove("border-blue-500", "bg-blue-50")
                  if (draggedOption) {
                    const matchingKey = `matching_${index + 1}`
                    setMatchingAnswers((prev) => ({
                      ...prev,
                      [questionId]: {
                        ...(prev[questionId] || {}),
                        [index + 1]: draggedOption.key,
                      },
                    }))

                    handleAnswerChange(matchingKey, draggedOption.key)
                    setDraggedOption(null)
                  }
                }}
                className="flex items-center gap-3 my-2 px-4 py-3 border-2 border-dashed border-gray-400 bg-gray-100 rounded-lg w-full cursor-pointer hover:bg-gray-200 transition-colors"
              >
                <span className="bg-gray-700 text-white px-2.5 py-1 rounded text-sm font-bold shrink-0">
                  {getQuestionNumber(questionId) + index}
                </span>
                {matchingAnswers[questionId]?.[index + 1] ? (
                  <span className={`font-medium text-base ${colorStyles.text}`}>
                    {matchingAnswers[questionId][index + 1]}
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">Drop heading here</span>
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  const getMatchingHeadingsOptions = () => {
    const currentQuestions = getCurrentPartQuestions
    const matchingQuestion = currentQuestions.find((qg) =>
      qg.r_questions?.some((q) => q.q_type === "MATCHING_HEADINGS"),
    )

    if (!matchingQuestion) return null

    const hasMatchingPassage = getCurrentPartPassages.some((p) => p.type === "matching")
    if (!hasMatchingPassage) return null

    const question = matchingQuestion.r_questions?.find((q) => q.q_type === "MATCHING_HEADINGS")
    return question?.options || null
  }

  const getMatchingQuestionId = () => {
    const currentQuestions = getCurrentPartQuestions
    const matchingQuestion = currentQuestions.find((qg) =>
      qg.r_questions?.some((q) => q.q_type === "MATCHING_HEADINGS"),
    )

    if (!matchingQuestion) return null

    const question = matchingQuestion.r_questions?.find((q) => q.q_type === "MATCHING_HEADINGS")
    if (!question) return null

    return `${matchingQuestion.id}_${question.id}`
  }

  const getMatchingQuestionDetails = () => {
    const currentQuestions = getCurrentPartQuestions
    const matchingQuestion = currentQuestions.find((qg) =>
      qg.r_questions?.some((q) => q.q_type === "MATCHING_HEADINGS"),
    )

    if (!matchingQuestion) return null

    const question = matchingQuestion.r_questions?.find((q) => q.q_type === "MATCHING_HEADINGS")
    if (!question) return null

    return {
      questionGroup: matchingQuestion,
      question: question,
      questionId: `${matchingQuestion.id}_${question.id}`,
    }
  }

  if (!user) {
    return (
      <div className={`min-h-screen ${colorStyles.bg} flex items-center justify-center`}>
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className={`text-2xl font-bold mb-4 ${colorStyles.text}`}>Authentication Required</h1>
          <p className={`${colorStyles.text} mb-6`}>Please log in to access the test.</p>
          <Link href="/login">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">Go to Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading || timeRemaining === null) {
    return (
      <div className={`min-h-screen ${colorStyles.bg} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className={`${colorStyles.text} text-lg`}>Loading reading test...</p>
        </div>
      </div>
    )
  }

  if (!testData) {
    return (
      <div className={`min-h-screen ${colorStyles.bg} flex items-center justify-center`}>
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className={`text-2xl font-bold mb-4 ${colorStyles.text}`}>Test Not Found</h1>
          <Link href={`/mock/${examId}`}>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">Back to Mock Test</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (showSubmitLoading) {
    return (
      <div className={`min-h-screen ${colorStyles.bg} flex items-center justify-center`}>
        <div className="text-center max-w-md mx-auto p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-6"></div>
          <h1 className={`text-2xl font-bold mb-4 ${colorStyles.text}`}>Submitting Your Test</h1>
          <p className={colorStyles.text}>Please wait while we process your answers...</p>
        </div>
      </div>
    )
  }

  const parts = getAvailableParts().map((partNumber) => ({
    part: partNumber,
    count: getPartQuestionCount(partNumber),
  }))

  const scrollToPart = (partNumber: number) => {
    const element = document.getElementById(`part-${partNumber}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
      setCurrentPart(partNumber)
    }
  }

  const renderSummaryCompletion = (questionGroup: any) => {
    return (
      <>
        {(() => {
          const summaryQuestions = questionGroup.r_questions?.filter((q) => q.q_type === "SUMMARY_COMPLETION") || []
          if (summaryQuestions.length === 0) return null

          const processText = (text: string, questionId: string, questionNum: number) => {
            const parts = text.split(/_+/)
            const elements: React.ReactNode[] = []

            parts.forEach((part, index) => {
              if (part) {
                elements.push(<span key={`text-${index}`}>{part}</span>)
              }
              if (index < parts.length - 1) {
                elements.push(
                  <span key={`input-${index}`} className="inline-flex items-center mx-1">
                    <span className="bg-gray-500 text-white px-1.5 py-0.5 rounded text-xs font-medium mr-1">
                      {questionNum}
                    </span>
                    <Input
                      value={answers[questionId] || ""}
                      onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                      className={`inline-block w-48 mx-1 px-2 py-1 text-base ${colorStyles.inputBg} ${colorStyles.border} focus:border-gray-500`}
                      style={{ fontSize: `${textSize}px` }}
                      placeholder="..."
                    />
                  </span>,
                )
              }
            })

            return <>{elements}</>
          }

          return (
            <div className={`mb-6 p-6 rounded-lg border ${colorStyles.cardBg} ${colorStyles.border}`}>
              <div className={`leading-relaxed ${colorStyles.text}`} style={{ fontSize: `${textSize}px` }}>
                {summaryQuestions.map((question, qIndex) => {
                  const questionId = `${questionGroup.id}_${question.id}`
                  const questionNum = getQuestionNumber(questionId)

                  return (
                    <span key={question.id}>
                      {processText(question.q_text, questionId, questionNum)}
                      {qIndex < summaryQuestions.length - 1 && " "}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </>
    )
  }

  const renderQuestions = (partNumber: number) => {
    const partQuestions = getQuestionsForPart(partNumber)
    return partQuestions.map((questionGroup) => (
      <div
        key={questionGroup.id}
        className={`space-y-6 p-6 border rounded-lg ${colorStyles.cardBg} ${colorStyles.border}`}
        style={{ fontSize: `${textSize}px` }}
      >
        {(questionGroup.title || questionGroup.instruction) && (
          <div className={`p-4 rounded-lg border ${colorStyles.cardBg} ${colorStyles.border}`}>
            {questionGroup.title && (
              <h3 className={`text-xl font-bold mb-3 ${colorStyles.text}`}>{questionGroup.title}</h3>
            )}
            {questionGroup.instruction && (
              <div>
                <div className={`text-sm font-semibold mb-2 text-gray-500`}>
                  Questions {(() => {
                    const range = getQuestionGroupRange(questionGroup)
                    return range.start === range.end ? range.start : `${range.start}-${range.end}`
                  })()}
                </div>
                <div className={`text-base leading-relaxed ${colorStyles.text}`}>{questionGroup.instruction}</div>
              </div>
            )}
          </div>
        )}

        {questionGroup.r_questions?.map((question) => {
          const questionId = `${questionGroup.id}_${question.id}`
          const currentAnswer = answers[questionId]

          if (question.q_type === "SUMMARY_COMPLETION") {
            return null
          }

          return (
            <div key={question.id} id={`question-${questionGroup.id}_${question.id}`} className="space-y-4">
              {question.q_type !== "MCQ_MULTI" && question.q_type !== "MATCHING_HEADINGS" && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-gray-500 text-white px-2 py-1 rounded text-sm font-medium">
                    {getQuestionNumber(`${questionGroup.id}_${question.id}`)}
                  </span>
                </div>
              )}

              {question.q_type !== "SENTENCE_COMPLETION" && (
                <div className={`text-lg mb-6 ${colorStyles.text}`}>{question.q_text}</div>
              )}

              {(question.q_type === "TFNG" || question.q_type === "TRUE_FALSE_NOT_GIVEN") && (
                <div className="space-y-3">
                  <RadioGroup
                    value={currentAnswer || ""}
                    onValueChange={(value) => handleAnswerChange(questionId, value)}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="A" id={`q${question.id}-true`} />
                      <Label
                        htmlFor={`q${question.id}-true`}
                        className={`cursor-pointer text-base ${colorStyles.text}`}
                      >
                        TRUE
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="B" id={`q${question.id}-false`} />
                      <Label
                        htmlFor={`q${question.id}-false`}
                        className={`cursor-pointer text-base ${colorStyles.text}`}
                      >
                        FALSE
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="C" id={`q${question.id}-ng`} />
                      <Label htmlFor={`q${question.id}-ng`} className={`cursor-pointer text-base ${colorStyles.text}`}>
                        NOT GIVEN
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {question.q_type === "MCQ_SINGLE" && question.options && (
                <div className="space-y-3">
                  <RadioGroup
                    value={currentAnswer || ""}
                    onValueChange={(value) => handleAnswerChange(questionId, value)}
                    className="space-y-3"
                  >
                    {question.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <RadioGroupItem value={option.key} id={`q${question.id}-${option.key}`} />
                        <Label
                          htmlFor={`q${question.id}-${option.key}`}
                          className={`cursor-pointer text-base ${colorStyles.text}`}
                        >
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {question.q_type === "MCQ_MULTI" && question.options && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-gray-500 text-white px-2 py-1 rounded text-sm font-medium">
                      {(() => {
                        const startNum = getQuestionNumber(`${questionGroup.id}_${question.id}`)
                        const correctCount = question.correct_answers?.length || 1
                        const endNum = startNum + correctCount - 1
                        return correctCount > 1 ? `${startNum}-${endNum}` : `${startNum}`
                      })()}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {question.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`q${question.id}-${option.key}`}
                          checked={Array.isArray(currentAnswer) && currentAnswer.includes(option.key)}
                          onChange={(e) => {
                            const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : []
                            if (e.target.checked) {
                              handleAnswerChange(questionId, [...currentAnswers, option.key])
                            } else {
                              handleAnswerChange(
                                questionId,
                                currentAnswers.filter((a) => a !== option.key),
                              )
                            }
                          }}
                          className="w-5 h-5 rounded border-gray-300"
                        />
                        <label
                          htmlFor={`q${question.id}-${option.key}`}
                          className={`flex-1 cursor-pointer ${colorStyles.text}`}
                        >
                          {option.text}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {question.q_type === "SENTENCE_COMPLETION" && (
                <div className="space-y-4">
                  <div className={`text-lg font-medium ${colorStyles.text}`}>
                    {(() => {
                      const text = question.q_text || ""
                      if (text.includes("_")) {
                        const parts = text.split(/_{1,}/)
                        const underscoreMatches = text.match(/_{1,}/g) || []

                        return (
                          <span>
                            {parts.map((part, index) => (
                              <React.Fragment key={index}>
                                {part}
                                {index < parts.length - 1 && (
                                  <Input
                                    value={
                                      typeof currentAnswer === "object" && currentAnswer !== null
                                        ? (currentAnswer as Record<string, string>)[index.toString()] || ""
                                        : index === 0 && typeof currentAnswer === "string"
                                          ? currentAnswer || ""
                                          : ""
                                    }
                                    onChange={(e) => {
                                      if (underscoreMatches.length > 1) {
                                        const newAnswer = {
                                          ...(typeof currentAnswer === "object" && currentAnswer !== null
                                            ? currentAnswer
                                            : {}),
                                          [index.toString()]: e.target.value,
                                        }
                                        handleAnswerChange(questionId, newAnswer)
                                      } else {
                                        handleAnswerChange(questionId, e.target.value)
                                      }
                                    }}
                                    className={`inline-block w-48 mx-1 px-2 py-1 text-base ${colorStyles.inputBg} ${colorStyles.border} focus:border-gray-500`}
                                    style={{ fontSize: `${textSize}px` }}
                                  />
                                )}
                              </React.Fragment>
                            ))}
                          </span>
                        )
                      }
                      return text
                    })()}
                  </div>
                  <p className="text-xs text-gray-500">Write NO MORE THAN THREE WORDS for your answer.</p>
                </div>
              )}

              {question.q_type === "MATCHING_HEADINGS" && question.choices && (
                <div className={`mt-4 p-4 rounded-lg border ${colorStyles.cardBg} ${colorStyles.border}`}>
                  <h4 className={`font-semibold mb-3 ${colorStyles.text}`}></h4>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(question.choices).map(([key, text]) => (
                      <div
                        key={key}
                        draggable
                        onDragStart={() => setDraggedOption({ key, text: text as string })}
                        onDragEnd={() => setDraggedOption(null)}
                        onTouchStart={() => setDraggedOption({ key, text: text as string })}
                        className={`flex items-center gap-2 p-3 border rounded cursor-move transition-colors touch-none ${colorStyles.cardBg} ${colorStyles.border} hover:border-blue-400`}
                      >
                        <span className="font-bold text-blue-600">{key}</span>
                        <span className={colorStyles.text}>{text as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {question.q_type === "TABLE_COMPLETION" && (question.columns || question.table_structure) && (
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className={`w-full border text-base ${colorStyles.border}`}>
                      <thead>
                        <tr className={colorStyles.cardBg}>
                          <th
                            className={`border p-3 text-left font-semibold ${colorStyles.text} ${colorStyles.border}`}
                          >
                            Species
                          </th>
                          {(question.columns || question.table_structure?.headers || []).map((header, index) => (
                            <th
                              key={index}
                              className={`border p-3 text-left font-semibold ${colorStyles.text} ${colorStyles.border}`}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {question.rows && Array.isArray(question.rows)
                          ? question.rows.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                <td
                                  className={`border p-3 font-medium ${colorStyles.cardBg} ${colorStyles.text} ${colorStyles.border}`}
                                >
                                  {row.label || ""}
                                </td>
                                {(row.cells && Array.isArray(row.cells) ? row.cells : []).map((cell, cellIndex) => (
                                  <td key={cellIndex} className={`border p-3 ${colorStyles.border}`}>
                                    {cell === "" || cell === "_" ? (
                                      <div className="flex items-center gap-2">
                                        <span className="bg-gray-500 text-white px-1 py-0.5 rounded text-xs font-medium">
                                          {getQuestionNumber(`${questionId}_table_${rowIndex}_${cellIndex}`)}
                                        </span>
                                        <Input
                                          value={answers[`${questionId}_table_${rowIndex}_${cellIndex}`] || ""}
                                          onChange={(e) =>
                                            handleAnswerChange(
                                              `${questionId}_table_${rowIndex}_${cellIndex}`,
                                              e.target.value,
                                            )
                                          }
                                          className={`w-full text-xs ${colorStyles.inputBg} ${colorStyles.border} focus:border-gray-500`}
                                          placeholder="Answer"
                                        />
                                      </div>
                                    ) : (
                                      <span className={colorStyles.text}>{cell}</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))
                          : question.table_structure?.rows?.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                <td
                                  className={`border p-3 font-medium ${colorStyles.cardBg} ${colorStyles.text} ${colorStyles.border}`}
                                >
                                  {Object.values(row)[0]}
                                </td>
                                {Object.entries(row)
                                  .slice(1)
                                  .map(([key, value], cellIndex) => (
                                    <td key={cellIndex} className={`border p-3 ${colorStyles.border}`}>
                                      {value === "" || value === "_" ? (
                                        <div className="flex items-center gap-2">
                                          <span className="bg-gray-500 text-white px-1 py-0.5 rounded text-xs font-medium">
                                            {getQuestionNumber(`${questionId}_table_${rowIndex}_${cellIndex}`)}
                                          </span>
                                          <Input
                                            value={answers[`${questionId}_table_${rowIndex}_${cellIndex}`] || ""}
                                            onChange={(e) =>
                                              handleAnswerChange(
                                                `${questionId}_table_${rowIndex}_${cellIndex}`,
                                                e.target.value,
                                              )
                                            }
                                            className={`w-full text-xs ${colorStyles.inputBg} ${colorStyles.border} focus:border-gray-500`}
                                            placeholder="Answer"
                                          />
                                        </div>
                                      ) : (
                                        <span className={colorStyles.text}>{value}</span>
                                      )}
                                    </td>
                                  ))}
                              </tr>
                            ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500">Write NO MORE THAN THREE WORDS for each answer.</p>
                </div>
              )}

              {question.q_type === "SENTENCE_ENDINGS" && question.options && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.add("border-blue-500", "bg-blue-50")
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove("border-blue-500", "bg-blue-50")
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.remove("border-blue-500", "bg-blue-50")
                        if (draggedOption) {
                          handleAnswerChange(questionId, draggedOption.key)
                          setDraggedOption(null)
                        }
                      }}
                      className={`border-2 border-dashed border-gray-400 bg-gray-50 p-3 rounded-lg min-h-[40px] flex items-center transition-colors ${colorStyles.cardBg}`}
                    >
                      {currentAnswer ? (
                        <span className={`font-medium ${colorStyles.text}`}>{currentAnswer}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Drag an option here</span>
                      )}
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-600 mb-2">Choose from:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {question.options.map((option, index) => (
                        <Button
                          key={index}
                          variant={currentAnswer === option.key ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAnswerChange(questionId, option.key)}
                          className={`text-xs p-2 h-auto text-left ${
                            currentAnswer === option.key
                              ? "bg-gray-800 text-white"
                              : `${colorStyles.inputBg} ${colorStyles.text} ${colorStyles.border} hover:bg-gray-50`
                          }`}
                        >
                          <span className="font-medium">{option.key}</span> {option.text}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {renderSummaryCompletion(questionGroup)}
      </div>
    ))
  }

  const getCurrentPartForQuestion = (questionGroupId: string): number => {
    const questionGroup = testData?.questions.find((qg) => qg.id === questionGroupId)
    if (!questionGroup || !questionGroup.part) return 1
    return typeof questionGroup.part === "string"
      ? Number.parseInt(questionGroup.part.replace("PART", ""))
      : questionGroup.part
  }

  const scrollToQuestion = (questionIdentifier: string) => {
    const element = document.getElementById(`question-${questionIdentifier}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
      const questionNum = questionNumbers[questionIdentifier]
      if (questionNum) {
        setCurrentQuestionNumber(questionNum)
      }
    }
  }

  return (
    <div className={`flex flex-col h-screen ${colorStyles.bg}`}>
      {/* Header */}
      <div className={`border-b ${colorStyles.border} ${colorStyles.bg}`}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/join")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <h1 className={`text-lg font-semibold ${colorStyles.text}`}>Reading Test</h1>
          </div>

          <div className="flex items-center gap-4">
            <div style={{ fontSize: "24px" }}>
              <Timer initialMinutes={60} onTimeUp={handleTimeUp} isActive={!isSubmitted} textColor={colorStyles.text} />
            </div>

            {isOnline ? <Wifi className="h-6 w-6 text-black" /> : <WifiOff className="h-6 w-6 text-red-500" />}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-6 w-6 text-black" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowSettingsModal(true)}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={handleSubmit}>Submit Test</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className={`${colorStyles.cardBg} ${colorStyles.text}`} style={{ fontSize: `${textSize}px` }}>
          <DialogHeader>
            <DialogTitle className={colorStyles.text} style={{ fontSize: `${textSize + 4}px` }}>
              Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Text Size Control */}
            <div>
              <h3 className={`font-semibold mb-3 ${colorStyles.text}`} style={{ fontSize: `${textSize}px` }}>
                Text Size
              </h3>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTextSize(Math.max(12, textSize - 2))}
                  disabled={textSize <= 12}
                  className={`${colorStyles.inputBg} ${colorStyles.border} ${colorStyles.text}`}
                  style={{ fontSize: `${textSize}px` }}
                >
                  -
                </Button>
                <span className={`text-lg font-medium ${colorStyles.text}`} style={{ fontSize: `${textSize}px` }}>
                  {textSize}px
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTextSize(Math.min(35, textSize + 2))}
                  disabled={textSize >= 35}
                  className={`${colorStyles.inputBg} ${colorStyles.border} ${colorStyles.text}`}
                  style={{ fontSize: `${textSize}px` }}
                >
                  +
                </Button>
              </div>
            </div>

            {/* Color Mode Control */}
            <div>
              <h3 className={`font-semibold mb-3 ${colorStyles.text}`} style={{ fontSize: `${textSize}px` }}>
                Color Mode
              </h3>
              <div className="space-y-2">
                <Button
                  variant={colorMode === "default" ? "default" : "outline"}
                  className={`w-full ${
                    colorMode === "default"
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : `${colorStyles.inputBg} ${colorStyles.border} ${colorStyles.text}`
                  }`}
                  style={{ fontSize: `${textSize}px` }}
                  onClick={() => setColorMode("default")}
                >
                  Default (Day)
                </Button>
                <Button
                  variant={colorMode === "night" ? "default" : "outline"}
                  className={`w-full ${
                    colorMode === "night"
                      ? "bg-gray-800 text-white hover:bg-gray-700"
                      : `${colorStyles.inputBg} ${colorStyles.border} ${colorStyles.text}`
                  }`}
                  style={{ fontSize: `${textSize}px` }}
                  onClick={() => setColorMode("night")}
                >
                  Night Mode
                </Button>
                <Button
                  variant={colorMode === "yellow" ? "default" : "outline"}
                  className={`w-full ${
                    colorMode === "yellow"
                      ? "bg-yellow-600 text-black hover:bg-yellow-500"
                      : `${colorStyles.inputBg} ${colorStyles.border} ${colorStyles.text}`
                  }`}
                  style={{ fontSize: `${textSize}px` }}
                  onClick={() => setColorMode("yellow")}
                >
                  Yellow Mode
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 flex overflow-hidden" ref={mainContentContainerRef}>
        {/* Passage Panel - Independent Scroll */}
        <div
          className={`${colorStyles.bg} border-r ${colorStyles.border} flex flex-col overflow-hidden`}
          style={{ width: `${passageWidth * 100}%` }}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className={`${colorStyles.cardBg} rounded-lg p-6 shadow-sm`} style={{ fontSize: `${textSize}px` }}>
                <div className="mb-4">
                  <h2 className={`text-xl font-bold ${colorStyles.text} mb-2`}>Part {currentPart}</h2>
                  <p className={colorStyles.text}>
                    Read the text and answer questions {(() => {
                      const range = getPartQuestionRange(currentPart)
                      return `${range.start}–${range.end}`
                    })()}.
                  </p>
                </div>

                <div className="prose max-w-none">
                  {getCurrentPartPassages && getCurrentPartPassages.length > 0 ? (
                    getCurrentPartPassages.map((passage) => (
                      <div key={passage.id} className="mb-6">
                        {passage.type === "matching" ? (
                          parseMatchingPassage(passage.reading_text, getMatchingQuestionId() || "")
                        ) : (
                          <div
                            className={`${colorStyles.text} leading-relaxed`}
                            dangerouslySetInnerHTML={{ __html: passage.reading_text }}
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <>
                      {testData?.passage_text && (
                        <div
                          className={`${colorStyles.text} leading-relaxed`}
                          dangerouslySetInnerHTML={{ __html: testData.passage_text }}
                        />
                      )}
                      {testData?.reading_text && (
                        <div
                          className={`${colorStyles.text} leading-relaxed`}
                          dangerouslySetInnerHTML={{ __html: testData.reading_text }}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resizable Divider */}
        <div
          className={`w-1.5 ${colorStyles.border} cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors ${isResizing ? "bg-blue-600" : "bg-gray-300"}`}
          onMouseDown={handleMouseDown}
        />

        {/* Questions Panel - Independent Scroll */}
        <div className={`flex-1 flex flex-col overflow-hidden ${colorStyles.bg}`}>
          <div className="flex-1 overflow-y-auto pb-20" style={{ fontSize: `${textSize}px` }}>
            <div className="p-6">
              <div className="mb-6">
                <h3 className={`text-xl font-bold ${colorStyles.text} mb-2`}>
                  Questions {(() => {
                    const range = getPartQuestionRange(currentPart)
                    return `${range.start}–${range.end}`
                  })()}
                </h3>
              </div>

              {(() => {
                const matchingDetails = getMatchingQuestionDetails()
                if (!matchingDetails) return null

                const { questionGroup, question, questionId } = matchingDetails
                const range = getQuestionGroupRange(questionGroup)

                return (
                  <div className={`mb-8 p-6 border rounded-lg ${colorStyles.cardBg} ${colorStyles.border}`}>
                    <div className="mb-4">
                      <div className={`text-sm font-semibold mb-2 text-gray-500`}>
                        Questions {range.start === range.end ? range.start : `${range.start}–${range.end}`}
                      </div>
                      <p className={`text-base ${colorStyles.text} mb-4`}>
                        The text has four sections. Choose the correct heading for each section and move it into the
                        gap.
                      </p>
                    </div>

                    <h3 className={`text-lg font-bold ${colorStyles.text} mb-4`}>List of Headings</h3>

                    <div className="space-y-3">
                      {question.options?.map((option) => (
                        <div
                          key={option.key}
                          draggable
                          onDragStart={() => setDraggedOption({ key: option.key, text: option.text })}
                          onDragEnd={() => setDraggedOption(null)}
                          className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-move transition-all hover:border-blue-400 hover:shadow-md ${colorStyles.cardBg} ${colorStyles.border}`}
                        >
                          <span className="font-bold text-lg text-blue-600 shrink-0 mt-0.5">{option.key}</span>
                          <span className={`text-base leading-relaxed ${colorStyles.text}`}>{option.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              <div className="space-y-6">{renderQuestions(currentPart)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className={`fixed bottom-0 left-0 right-0 ${colorStyles.headerBg} border-t ${colorStyles.border} px-6 py-4`}>
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => currentPart > 1 && switchToPart(currentPart - 1)}
              disabled={currentPart <= 1}
              className="w-10 h-10 bg-gray-800 text-white rounded flex items-center justify-center disabled:opacity-50 hover:bg-gray-700 transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => currentPart < 3 && switchToPart(currentPart + 1)}
              disabled={currentPart >= 3}
              className="w-10 h-10 bg-gray-800 text-white rounded flex items-center justify-center disabled:opacity-50 hover:bg-gray-700 transition-colors"
            >
              →
            </button>
          </div>

          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {[1, 2, 3].map((partNum) => {
                const totalQuestions = getPartQuestionCount(partNum)
                const answeredCount = getAnsweredCountForPart(partNum)
                const isComplete = answeredCount === totalQuestions

                return (
                  <button
                    key={partNum}
                    onClick={() => switchToPart(partNum)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      currentPart === partNum
                        ? "bg-white text-gray-900 shadow-sm"
                        : isComplete
                          ? "bg-green-500 text-white"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Part {partNum} ({answeredCount}/{totalQuestions})
                  </button>
                )
              })}
            </div>

            <div className="flex items-center space-x-1 flex-wrap max-w-md">
              {(() => {
                const partQuestions = getQuestionsForPart(currentPart)
                const questionButtons: React.ReactElement[] = []

                partQuestions.forEach((questionGroup) => {
                  const sortedRQuestions = questionGroup.r_questions
                    ? [...questionGroup.r_questions].sort((a, b) => {
                        const aOrder = a.order ?? a.q_number ?? a.id
                        const bOrder = b.order ?? b.q_number ?? b.id
                        return Number(aOrder) - Number(bOrder)
                      })
                    : []

                  sortedRQuestions.forEach((question) => {
                    const questionId = `${questionGroup.id}_${question.id}`
                    const startNum = getQuestionNumber(questionId)

                    if (question.q_type === "MATCHING_HEADINGS") {
                      const matchingPassage = getCurrentPartPassages.find((p) => p.type === "matching")
                      if (matchingPassage) {
                        const underscorePattern = /_{2,}/g
                        const matches = [...matchingPassage.reading_text.matchAll(underscorePattern)]

                        for (let i = 0; i < matches.length; i++) {
                          const positionIndex = i + 1
                          const isAnswered = !!matchingAnswers[questionId]?.[positionIndex]

                          questionButtons.push(
                            <button
                              key={`${questionId}_${i}`}
                              onClick={() => scrollToQuestion(questionId)}
                              className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                                isAnswered
                                  ? "bg-green-500 text-white hover:bg-green-600"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              {startNum + i}
                            </button>,
                          )
                        }
                      }
                    } else if (question.q_type === "MCQ_MULTI") {
                      const correctCount = question.correct_answers?.length || 1
                      const selectedAnswers = Array.isArray(answers[questionId]) ? answers[questionId] : []
                      const selectedCount = selectedAnswers.length

                      for (let i = 0; i < correctCount; i++) {
                        questionButtons.push(
                          <button
                            key={`${questionId}_${i}`}
                            onClick={() => scrollToQuestion(questionId)}
                            className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                              i < selectedCount
                                ? "bg-green-500 text-white hover:bg-green-600"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {startNum + i}
                          </button>,
                        )
                      }
                    } else if (question.q_type === "TABLE_COMPLETION") {
                      let inputIndex = 0
                      if (question.rows && Array.isArray(question.rows)) {
                        question.rows.forEach((row, rowIndex) => {
                          if (row.cells && Array.isArray(row.cells)) {
                            row.cells.forEach((cell, cellIndex) => {
                              if (cell === "" || cell === "_") {
                                const tableQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                                const isAnswered = !!answers[tableQuestionId]
                                questionButtons.push(
                                  <button
                                    key={tableQuestionId}
                                    onClick={() => scrollToQuestion(questionId)}
                                    className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                                      isAnswered
                                        ? "bg-green-500 text-white hover:bg-green-600"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    }`}
                                  >
                                    {startNum + inputIndex}
                                  </button>,
                                )
                                inputIndex++
                              }
                            })
                          }
                        })
                      } else if (question.table_structure?.rows) {
                        question.table_structure.rows.forEach((row, rowIndex) => {
                          Object.entries(row).forEach(([key, value], cellIndex) => {
                            if (value === "" || value === "_") {
                              const tableQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                              const isAnswered = !!answers[tableQuestionId]
                              questionButtons.push(
                                <button
                                  key={tableQuestionId}
                                  onClick={() => scrollToQuestion(questionId)}
                                  className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                                    isAnswered
                                      ? "bg-green-500 text-white hover:bg-green-600"
                                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  }`}
                                >
                                  {startNum + inputIndex}
                                </button>,
                              )
                              inputIndex++
                            }
                          })
                        })
                      }
                    } else if (question.q_type === "MATCHING_INFORMATION") {
                      const rowCount = (question as any).rows?.length || 1
                      for (let i = 0; i < rowCount; i++) {
                        const rowQuestionId = `${questionId}_row_${i}`
                        const isAnswered = !!answers[rowQuestionId]
                        questionButtons.push(
                          <button
                            key={rowQuestionId}
                            onClick={() => scrollToQuestion(questionId)}
                            className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                              isAnswered
                                ? "bg-green-500 text-white hover:bg-green-600"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {startNum + i}
                          </button>,
                        )
                      }
                    } else if (question.q_type === "SENTENCE_COMPLETION") {
                      const blanks = question.q_text?.match(/_+/g) || []
                      const currentAnswer = answers[questionId]

                      for (let i = 0; i < blanks.length; i++) {
                        const isAnswered =
                          currentAnswer &&
                          (typeof currentAnswer === "string"
                            ? i === 0
                            : typeof currentAnswer === "object" && currentAnswer[i.toString()])
                        questionButtons.push(
                          <button
                            key={`${questionId}_${i}`}
                            onClick={() => scrollToQuestion(questionId)}
                            className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                              isAnswered
                                ? "bg-green-500 text-white hover:bg-green-600"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {startNum + i}
                          </button>,
                        )
                      }
                    } else if (question.q_type === "SUMMARY_COMPLETION") {
                      const blanks = question.q_text?.match(/_+/g) || []
                      const isAnswered = !!answers[questionId]

                      // Each blank is a separate question, so create one button
                      questionButtons.push(
                        <button
                          key={questionId}
                          onClick={() => scrollToQuestion(questionId)}
                          className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                            isAnswered
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {startNum}
                        </button>,
                      )
                    } else {
                      const isAnswered = !!answers[questionId]
                      questionButtons.push(
                        <button
                          key={questionId}
                          onClick={() => scrollToQuestion(questionId)}
                          className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                            isAnswered
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {startNum}
                        </button>,
                      )
                    }
                  })
                })

                return questionButtons
              })()}
            </div>
          </div>

          <div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit Test"}
            </button>
          </div>
        </div>
      </div>

      {AlertComponent}
    </div>
  )
}

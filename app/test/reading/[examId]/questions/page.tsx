"use client"

import React from "react"

import { useEffect, useState, useRef, use, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../../../../../components/ui/button"
import { useAuth } from "../../../../../contexts/auth-context"
import { AlertTriangle, Wifi, WifiOff, Bell, Menu } from "lucide-react"
import { useCustomAlert } from "../../../../../hooks/use-custom-alert"
import { Input } from "../../../../../components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../../components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../../../components/ui/dialog"
import {
  markSectionCompleted,
  areAllSectionsCompleted,
  checkSectionCompletionAPI,
} from "../../../../../lib/test-strotage"

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
  labels?: any[]
  answers?: Record<string, string>
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
  const [backendExamId, setBackendExamId] = useState<string | null>(null)
  const [currentPart, setCurrentPart] = useState(1)
  const [answers, setAnswers] = useState<Record<string, string | Record<string, string> | string[]>>({})
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitLoading, setShowSubmitLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [expandedPart, setExpandedPart] = useState<number | null>(null)
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
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

  const [allQuestions, setAllQuestions] = React.useState<Array<{ id: string; groupId: string; part: number }>>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0)

  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(0)

  // Added state for mobile menu visibility
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [highlights, setHighlights] = useState<Array<{ id: string; text: string; range: string }>>([])
  const [showHighlightButton, setShowHighlightButton] = useState(false)
  const [highlightButtonPosition, setHighlightButtonPosition] = useState({ x: 0, y: 0 })
  const [selectedRange, setSelectedRange] = useState<Range | null>(null)
  const [isHighlightedText, setIsHighlightedText] = useState(false)
  const passageRef = useRef<HTMLDivElement>(null)

  const [noteCompletionDebounce, setNoteCompletionDebounce] = useState<Record<string, NodeJS.Timeout>>({})

  const getUserId = () => {
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const user = JSON.parse(userData)
        return user.user?.id ? String(user.user.id) : "1"
      }
    } catch (error) {
      console.error("[v0] Error parsing user data from localStorage:", error)
    }
    return "1"
  }

  const [userId, setUserId] = useState<string>(() => getUserId())

  useEffect(() => {
    const currentUserId = getUserId()
    if (currentUserId !== userId) {
      setUserId(currentUserId)
    }
  }, [examId])

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

  // /** CHANGE: Initialize timer on component mount only **/
  useEffect(() => {
    const initialTime = 3600 // 60 minutes in seconds
    setTimeRemaining(initialTime)
  }, [])

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  useEffect(() => {
    const fetchTestData = async () => {
      setIsLoading(true)
      try {
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

        if (data.exam_id) {
          setBackendExamId(data.exam_id)
        }

        if (data?.questions && data?.passages) {
          const numbers: Record<string, number> = {}

          const sortedQuestions = [...data.questions].sort((a, b) => {
            const aOrder = a.order ?? a.id
            const bOrder = b.order ?? b.id
            return Number(aOrder) - Number(bOrder)
          })

          // Group questions by part
          const questionsByPart: Record<number, typeof sortedQuestions> = {
            1: [],
            2: [],
            3: [],
          }

          sortedQuestions.forEach((questionGroup) => {
            const partNum =
              typeof questionGroup.part === "string"
                ? Number.parseInt(questionGroup.part.replace("PART", ""))
                : questionGroup.part
            if (partNum >= 1 && partNum <= 3) {
              questionsByPart[partNum].push(questionGroup)
            }
          })

          let currentQNum = 1

          // Process Part 1
          questionsByPart[1].forEach((questionGroup) => {
            const sortedRQuestions = questionGroup.r_questions
              ? [...questionGroup.r_questions].sort((a, b) => {
                  const aOrder = a.order ?? a.q_number ?? a.id
                  const bOrder = b.order ?? b.q_number ?? b.id
                  return Number(aOrder) - Number(bOrder)
                })
              : []

            sortedRQuestions.forEach((question) => {
              const questionId = `${questionGroup.id}_${question.id}`

              if (question.q_type === "MATCHING_HEADINGS") {
                numbers[questionId] = currentQNum
                const matchingPassage = data.passages.find((p) => p.type === "matching")
                if (matchingPassage) {
                  const underscorePattern = /_{2,}/g
                  const matches = [...matchingPassage.reading_text.matchAll(underscorePattern)]
                  for (let i = 0; i < matches.length; i++) {
                    const gapQuestionId = `matching_${i}`
                    numbers[gapQuestionId] = currentQNum
                    currentQNum++
                  }
                }
              } else if (question.q_type === "MCQ_MULTI") {
                numbers[questionId] = currentQNum
                const correctCount = question.correct_answers?.length || 1
                currentQNum += correctCount
              } else if (question.q_type === "TABLE_COMPLETION") {
                numbers[questionId] = currentQNum
                if (question.rows && Array.isArray(question.rows)) {
                  question.rows.forEach((row, rowIndex) => {
                    if (row.cells && Array.isArray(row.cells)) {
                      row.cells.forEach((cell, cellIndex) => {
                        if (cell === "" || cell === "_") {
                          const cellQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                          numbers[cellQuestionId] = currentQNum
                          currentQNum++
                        }
                      })
                    }
                  })
                } else if (question.table_structure?.rows) {
                  question.table_structure.rows.forEach((row, rowIndex) => {
                    Object.values(row).forEach((value, cellIndex) => {
                      if (value === "" || value === "_") {
                        const cellQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                        numbers[cellQuestionId] = currentQNum
                        currentQNum++
                      }
                    })
                  })
                }
              } else if (question.q_type === "MATCHING_INFORMATION") {
                numbers[questionId] = currentQNum
                const rowCount = (question as any).rows?.length || 1
                for (let i = 0; i < rowCount; i++) {
                  const rowQuestionId = `${questionId}_row_${i}`
                  numbers[rowQuestionId] = currentQNum
                  currentQNum++
                }
              } else if (question.q_type === "SENTENCE_COMPLETION") {
                numbers[questionId] = currentQNum
                const blankCount = (question.q_text?.match(/_+/g) || []).length
                if (blankCount > 0) {
                  currentQNum += blankCount
                } else {
                  currentQNum++
                }
              } else {
                numbers[questionId] = currentQNum
                currentQNum++
              }
            })
          })

          // Process Part 2
          currentQNum = 14 // Part 2 starts at 14
          questionsByPart[2].forEach((questionGroup) => {
            const sortedRQuestions = questionGroup.r_questions
              ? [...questionGroup.r_questions].sort((a, b) => {
                  const aOrder = a.order ?? a.q_number ?? a.id
                  const bOrder = b.order ?? b.q_number ?? b.id
                  return Number(aOrder) - Number(bOrder)
                })
              : []

            sortedRQuestions.forEach((question) => {
              const questionId = `${questionGroup.id}_${question.id}`

              if (question.q_type === "MATCHING_HEADINGS") {
                numbers[questionId] = currentQNum
                const matchingPassage = data.passages.find((p) => p.type === "matching")
                if (matchingPassage) {
                  const underscorePattern = /_{2,}/g
                  const matches = [...matchingPassage.reading_text.matchAll(underscorePattern)]
                  for (let i = 0; i < matches.length; i++) {
                    const gapQuestionId = `matching_${i}`
                    numbers[gapQuestionId] = currentQNum
                    currentQNum++
                  }
                }
              } else if (question.q_type === "MCQ_MULTI") {
                numbers[questionId] = currentQNum
                const correctCount = question.correct_answers?.length || 1
                currentQNum += correctCount
              } else if (question.q_type === "TABLE_COMPLETION") {
                numbers[questionId] = currentQNum
                if (question.rows && Array.isArray(question.rows)) {
                  question.rows.forEach((row, rowIndex) => {
                    if (row.cells && Array.isArray(row.cells)) {
                      row.cells.forEach((cell, cellIndex) => {
                        if (cell === "" || cell === "_") {
                          const cellQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                          numbers[cellQuestionId] = currentQNum
                          currentQNum++
                        }
                      })
                    }
                  })
                } else if (question.table_structure?.rows) {
                  question.table_structure.rows.forEach((row, rowIndex) => {
                    Object.values(row).forEach((value, cellIndex) => {
                      if (value === "" || value === "_") {
                        const cellQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                        numbers[cellQuestionId] = currentQNum
                        currentQNum++
                      }
                    })
                  })
                }
              } else if (question.q_type === "MATCHING_INFORMATION") {
                numbers[questionId] = currentQNum
                const rowCount = (question as any).rows?.length || 1
                for (let i = 0; i < rowCount; i++) {
                  const rowQuestionId = `${questionId}_row_${i}`
                  numbers[rowQuestionId] = currentQNum
                  currentQNum++
                }
              } else if (question.q_type === "SENTENCE_COMPLETION") {
                numbers[questionId] = currentQNum
                const blankCount = (question.q_text?.match(/_+/g) || []).length
                if (blankCount > 0) {
                  currentQNum += blankCount
                } else {
                  currentQNum++
                }
              } else {
                numbers[questionId] = currentQNum
                currentQNum++
              }
            })
          })

          // Process Part 3
          currentQNum = 27 // Part 3 starts at 27
          questionsByPart[3].forEach((questionGroup) => {
            const sortedRQuestions = questionGroup.r_questions
              ? [...questionGroup.r_questions].sort((a, b) => {
                  const aOrder = a.order ?? a.q_number ?? a.id
                  const bOrder = b.order ?? b.q_number ?? b.id
                  return Number(aOrder) - Number(bOrder)
                })
              : []

            sortedRQuestions.forEach((question) => {
              const questionId = `${questionGroup.id}_${question.id}`

              if (question.q_type === "MATCHING_HEADINGS") {
                numbers[questionId] = currentQNum
                const matchingPassage = data.passages.find((p) => p.type === "matching")
                if (matchingPassage) {
                  const underscorePattern = /_{2,}/g
                  const matches = [...matchingPassage.reading_text.matchAll(underscorePattern)]
                  for (let i = 0; i < matches.length; i++) {
                    const gapQuestionId = `matching_${i}`
                    numbers[gapQuestionId] = currentQNum
                    currentQNum++
                  }
                }
              } else if (question.q_type === "MCQ_MULTI") {
                numbers[questionId] = currentQNum
                const correctCount = question.correct_answers?.length || 1
                currentQNum += correctCount
              } else if (question.q_type === "TABLE_COMPLETION") {
                numbers[questionId] = currentQNum
                if (question.rows && Array.isArray(question.rows)) {
                  question.rows.forEach((row, rowIndex) => {
                    if (row.cells && Array.isArray(row.cells)) {
                      row.cells.forEach((cell, cellIndex) => {
                        if (cell === "" || cell === "_") {
                          const cellQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                          numbers[cellQuestionId] = currentQNum
                          currentQNum++
                        }
                      })
                    }
                  })
                } else if (question.table_structure?.rows) {
                  question.table_structure.rows.forEach((row, rowIndex) => {
                    Object.values(row).forEach((value, cellIndex) => {
                      if (value === "" || value === "_") {
                        const cellQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                        numbers[cellQuestionId] = currentQNum
                        currentQNum++
                      }
                    })
                  })
                }
              } else if (question.q_type === "MATCHING_INFORMATION") {
                numbers[questionId] = currentQNum
                const rowCount = (question as any).rows?.length || 1
                for (let i = 0; i < rowCount; i++) {
                  const rowQuestionId = `${questionId}_row_${i}`
                  numbers[rowQuestionId] = currentQNum
                  currentQNum++
                }
              } else if (question.q_type === "SENTENCE_COMPLETION") {
                numbers[questionId] = currentQNum
                const blankCount = (question.q_text?.match(/_+/g) || []).length
                if (blankCount > 0) {
                  currentQNum += blankCount
                } else {
                  currentQNum++
                }
              } else {
                numbers[questionId] = currentQNum
                currentQNum++
              }
            })
          })

          console.log("[v0] Question numbers assigned:", numbers)
          setQuestionNumbers(numbers)
          setTotalQuestions(40)
        }

        // const initialTime = 3600
        // setTimeRemaining(initialTime)

        const answersKey = `answers_${examId}_reading_${userId}`
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
                } else if (item.blankIndex !== undefined && item.question_type !== "NOTE_COMPLETION") {
                  const questionId = `${item.questionId}_${item.r_questionsID}_summary_${item.blankIndex}`
                  loadedAnswers[questionId] = item.answer
                } else if (item.question_type === "SENTENCE_COMPLETION") {
                  const questionId = `${item.questionId}_${item.r_questionsID}`
                  loadedAnswers[questionId] = item.answer
                } else if (item.question_type === "NOTE_COMPLETION") {
                  const questionId = `${item.questionId}_${item.r_questionsID}_note_${item.blankIndex}`
                  loadedAnswers[questionId] = item.answer
                } else {
                  const questionId = `${item.questionId}_${item.r_questionsID}`
                  loadedAnswers[questionId] = item.answer
                }
              })

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
  }, [examId, userId]) // Added userId to dependency array

  // useEffect(() => {
  //   if (timeRemaining === null || timeRemaining <= 0) return

  //   const timer = setInterval(() => {
  //     setTimeRemaining((prev) => {
  //       if (prev === null || prev <= 0) {
  //         clearInterval(timer)
  //         return 0
  //       }
  //       return prev - 1
  //     })
  //   }, 1000)

  //   return () => clearInterval(timer)
  // }, [timeRemaining])

  const handleAnswerChange = (
    questionId: string,
    answer: string | string[] | Record<string, string>,
    inputId?: string,
  ) => {
    const newAnswers = {
      ...answers,
      [questionId]: answer,
    }
    setAnswers(newAnswers)

    if (inputId && inputId.includes("_note_")) {
      return
    }

    const answersKey = `answers_${examId}_reading_${userId}`
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
    let rQuestionId: string
    if (questionId.includes("_note_")) {
      // For note completion: format is "questionGroupId_rQuestionId_note_index"
      rQuestionId = parts[1]
    } else if (questionId.includes("_row_")) {
      rQuestionId = parts[1]
    } else {
      rQuestionId =
        parts.length > 1 &&
        !questionId.includes("_table_") &&
        !questionId.startsWith("matching_") &&
        !questionId.includes("_summary_")
          ? parts[1]
          : parts[parts.length - 2]
    }

    const questionGroup = testData?.questions.find((qg) => qg.id.toString() === questionGroupId)
    const question = questionGroup?.r_questions?.find((rq) => rq.id.toString() === rQuestionId)
    const questionType = question?.q_type || "UNKNOWN"

    const examIdToUse = backendExamId || examId

    if (!answer || (Array.isArray(answer) && answer.length === 0) || answer.toString().trim() === "") {
      if (questionId.includes("_table_")) {
        const rowIndex = parts[parts.length - 2]
        const cellIndex = parts[parts.length - 1]
        const cellPosition = `${rowIndex}_${cellIndex}`
        answersArray = answersArray.filter(
          (item: any) => !(item.question_type === "TABLE_COMPLETION" && item.answer && item.answer[cellPosition]),
        )
      } else if (questionId.startsWith("matching_")) {
        const positionIndex = parts[1]
        answersArray = answersArray.filter((item: any) => {
          if (item.question_type === "MATCHING_HEADINGS" && item.answer) {
            return Object.keys(item.answer)[0] !== positionIndex
          }
          return true
        })
      } else if (questionId.includes("_row_")) {
        // Corrected logic to find and remove the specific MATCHING_INFORMATION answer
        const rowIndex = Number.parseInt(parts[parts.length - 1]) // Get the row index from the questionId
        answersArray = answersArray.filter((item: any) => {
          if (item.question_type === "MATCHING_INFORMATION") {
            // Ensure we're comparing the correct question group and question
            if (
              item.questionId === Number.parseInt(questionGroupId) &&
              item.r_questionsID === Number.parseInt(rQuestionId)
            ) {
              // Check if the answer corresponds to the specific row being cleared
              return item.answer[rowIndex.toString()] === undefined
            }
          }
          return true
        })
      } else if (questionType === "MCQ_MULTI") {
        answersArray = answersArray.filter(
          (item: any) =>
            !(
              item.questionId === Number.parseInt(questionGroupId) &&
              item.r_questionsID === Number.parseInt(rQuestionId) &&
              item.question_type === "MCQ_MULTI"
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
              !item.rowIndex &&
              !item.blankIndex
            ),
        )
      }

      localStorage.setItem(answersKey, JSON.stringify(answersArray))
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
        userId: getUserId(),
        questionId: Number.parseInt(questionGroupId),
        r_questionsID: Number.parseInt(rQuestionId),
        examId: Number.parseInt(examIdToUse),
        question_type: "TABLE_COMPLETION",
        answer: {
          [cellPosition]: answer,
        },
      })
    } else if (questionId.startsWith("matching_")) {
      const positionIndex = parts[1]

      answersArray = answersArray.filter((item: any) => {
        if (item.question_type === "MATCHING_HEADINGS" && item.answer) {
          return Object.keys(item.answer)[0] !== positionIndex
        }
        return true
      })

      const matchingQuestionGroup = testData?.questions.find((qg) =>
        qg.r_questions?.some((q) => q.q_type === "MATCHING_HEADINGS"),
      )
      const matchingQuestion = matchingQuestionGroup?.r_questions?.find((q) => q.q_type === "MATCHING_HEADINGS")

      if (matchingQuestion && matchingQuestionGroup) {
        answersArray.push({
          userId: getUserId(),
          questionId: matchingQuestionGroup.id,
          r_questionsID: matchingQuestion.id,
          examId: Number.parseInt(examIdToUse),
          question_type: "MATCHING_HEADINGS",
          answer: {
            [positionIndex]: answer,
          },
        })
      }
    } else if (questionId.includes("_row_")) {
      const rowIndex = Number.parseInt(parts[parts.length - 1]) + 1

      answersArray = answersArray.filter((item: any) => {
        if (item.question_type === "MATCHING_INFORMATION") {
          const itemRowIndex =
            item.rowIndex !== undefined
              ? item.rowIndex
              : item.answer && typeof item.answer === "object"
                ? Object.keys(item.answer)[0]
                : null
          return !(
            item.questionId === Number.parseInt(questionGroupId) &&
            item.r_questionsID === Number.parseInt(rQuestionId) &&
            itemRowIndex === rowIndex.toString()
          )
        }
        return true
      })

      answersArray.push({
        userId: getUserId(),
        questionId: Number.parseInt(questionGroupId),
        r_questionsID: Number.parseInt(rQuestionId),
        examId: Number.parseInt(examIdToUse),
        question_type: "MATCHING_INFORMATION",
        answer: {
          [rowIndex]: answer,
        },
      })
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
          userId: getUserId(),
          questionId: Number.parseInt(questionGroupId),
          r_questionsID: Number.parseInt(rQuestionId),
          examId: Number.parseInt(examIdToUse),
          question_type: "MCQ_MULTI",
          answer: selectedOption,
        })
      })
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
        userId: getUserId(),
        questionId: Number.parseInt(questionGroupId),
        r_questionsID: Number.parseInt(rQuestionId),
        examId: Number.parseInt(examIdToUse),
        question_type: questionType,
        answer: answer,
      })
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
        userId: getUserId(),
        questionId: Number.parseInt(questionGroupId),
        r_questionsID: Number.parseInt(rQuestionId),
        examId: Number.parseInt(examIdToUse),
        question_type: questionType,
        answer: answer,
      })
    }

    localStorage.setItem(answersKey, JSON.stringify(answersArray))
  }

  const handleNoteCompletionChange = (
    questionGroupId: string,
    rQuestionId: string,
    inputIndex: number,
    value: string,
  ) => {
    const inputId = `${questionGroupId}_${rQuestionId}_note_${inputIndex}`

    // Update UI immediately
    setAnswers((prev) => ({
      ...prev,
      [inputId]: value,
    }))

    // Clear existing timeout for this input
    if (noteCompletionDebounce[inputId]) {
      clearTimeout(noteCompletionDebounce[inputId])
    }

    // Set new timeout to save after user stops typing
    const timeoutId = setTimeout(() => {
      const answersKey = `answers_${examId}_reading_${userId}`
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

      const examIdToUse = backendExamId || examId

      // Remove existing answer for this specific input
      answersArray = answersArray.filter(
        (item: any) =>
          !(
            item.questionId === Number.parseInt(questionGroupId) &&
            item.r_questionsID === Number.parseInt(rQuestionId) &&
            item.question_type === "NOTE_COMPLETION" &&
            item.blankIndex === inputIndex
          ),
      )

      // Add new answer if not empty
      if (value && value.trim() !== "") {
        answersArray.push({
          userId: getUserId(),
          questionId: Number.parseInt(questionGroupId),
          r_questionsID: Number.parseInt(rQuestionId),
          examId: Number.parseInt(examIdToUse),
          question_type: "NOTE_COMPLETION",
          answer: value,
        })
      }

      localStorage.setItem(answersKey, JSON.stringify(answersArray))
    }, 500) // 500ms debounce delay

    setNoteCompletionDebounce((prev) => ({
      ...prev,
      [inputId]: timeoutId,
    }))
  }

  const handleMatchingInformationAnswer = (
    questionGroupId: string,
    rQuestionId: string,
    rowIndex: number,
    selectedChoice: string,
  ) => {
    const questionId = `${questionGroupId}_${rQuestionId}_row_${rowIndex}`
    handleAnswerChange(questionId, selectedChoice)
  }

  const handleSubmit = async () => {
    const currentUserId = getUserId()

    if (isSubmitted || isSubmitting || showSubmitLoading) {
      return
    }

    if (!currentUserId) {
      setAlert({
        title: "Error",
        message: "User not found. Please log in again.",
        type: "error",
      })
      return
    }

    setShowConfirmModal(true)
  }

  const submitAnswers = async () => {
    setIsSubmitting(true)
    setShowSubmitLoading(true)

    try {
      const currentUserId = getUserId()
      const answersKey = `answers_${examId}_reading_${currentUserId}`

      const answersData = localStorage.getItem(answersKey)

      if (!answersData) {
        throw new Error("No answers found")
      }

      let allAnswers: any[] = []
      try {
        allAnswers = JSON.parse(answersData)
        if (!Array.isArray(allAnswers)) {
          throw new Error("Invalid answers format")
        }
      } catch (error) {
        console.error("[v0] Error parsing answers:", error)
        throw new Error("Failed to parse answers")
      }

      if (allAnswers.length === 0) {
        throw new Error("No answers found")
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (!apiUrl) {
        console.error("[v0] API URL not configured")
        throw new Error("API URL not configured")
      }

      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      const examIdToUse = backendExamId || examId

      for (const answer of allAnswers) {
        try {
          const response = await fetch(`${apiUrl}/reading-answers`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: currentUserId,
              questionId: answer.questionId,
              examId: answer.examId || Number.parseInt(examIdToUse),
              answer: answer.answer,
              r_questionsID: answer.r_questionsID,
              question_type: answer.question_type,
              ...(answer.rowIndex !== undefined && { rowIndex: answer.rowIndex }),
              ...(answer.blankIndex !== undefined && { blankIndex: answer.blankIndex }),
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            failCount++
            errors.push(`Question ${answer.questionId}: ${errorData.message || "Failed"}`)
          } else {
            successCount++
          }
        } catch (error) {
          failCount++
          errors.push(`Question ${answer.questionId}: Network error`)
        }
      }

      if (failCount > 0) {
        setAlert({
          title: "Partial Submission",
          message: `${successCount} answers submitted successfully, ${failCount} failed.`,
          type: "warning",
        })
      }

      if (successCount > 0) {
        localStorage.removeItem(answersKey)

        setIsSubmitted(true)
        setIsCompleted(true)

        const readingCompleted = await checkSectionCompletionAPI(currentUserId, examIdToUse, "reading")

        if (readingCompleted) {
          markSectionCompleted(examIdToUse, "reading")
        }

        if (areAllSectionsCompleted(examIdToUse)) {
          setShowCompletionModal(true)
        } else {
          setAlert({
            title: "Submission Successful",
            message: `${successCount} answers submitted successfully!`,
            type: "success",
          })

          const redirectExamId = backendExamId || examId
          setTimeout(() => {
            router.push(`/mock/${redirectExamId}`)
          }, 1500)
        }
      } else {
        throw new Error("All submissions failed")
      }
    } catch (error) {
      setAlert({
        title: "Submission Failed",
        message: error instanceof Error ? error.message : "There was an error submitting your test. Please try again.",
        type: "error",
      })
    } finally {
      setIsSubmitting(false)
      setShowSubmitLoading(false)
      setShowConfirmModal(false)
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

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !passageRef.current) {
      setShowHighlightButton(false)
      return
    }

    const selectedText = selection.toString().trim()
    if (selectedText.length === 0) {
      setShowHighlightButton(false)
      return
    }

    // Check if selection is within passage
    const range = selection.getRangeAt(0)
    if (!passageRef.current.contains(range.commonAncestorContainer)) {
      setShowHighlightButton(false)
      return
    }

    // Check if selected text is already highlighted
    const parentElement = range.commonAncestorContainer.parentElement
    const isHighlighted =
      parentElement?.classList.contains("text-highlight") || parentElement?.closest(".text-highlight") !== null

    setIsHighlightedText(isHighlighted)
    setSelectedRange(range)

    // Position button near selection
    const rect = range.getBoundingClientRect()
    setHighlightButtonPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 40,
    })
    setShowHighlightButton(true)
  }, [])

  const addHighlight = useCallback(() => {
    if (!selectedRange) return

    const selection = window.getSelection()
    if (!selection) return

    const range = selectedRange.cloneRange()
    const span = document.createElement("span")
    span.className = "text-highlight bg-yellow-400 text-white dark:bg-yellow-500 dark:text-white font-medium"
    span.dataset.highlightId = `highlight-${Date.now()}`

    try {
      range.surroundContents(span)
      setHighlights((prev) => [
        ...prev,
        {
          id: span.dataset.highlightId!,
          text: span.textContent || "",
          range: range.toString(), // store the string representation of the range
        },
      ])
    } catch (e) {
      // If surroundContents fails (e.g., partial element selection), use extractContents
      const contents = range.extractContents()
      span.appendChild(contents)
      range.insertNode(span)
      setHighlights((prev) => [
        ...prev,
        {
          id: span.dataset.highlightId!,
          text: span.textContent || "",
          range: span.textContent || "", // Fallback range representation
        },
      ])
    }

    selection.removeAllRanges()
    setShowHighlightButton(false)
    setSelectedRange(null)
  }, [selectedRange, setHighlights]) // Include setHighlights in dependency array

  const removeHighlight = useCallback(() => {
    if (!selectedRange) return

    const selection = window.getSelection()
    if (!selection) return

    // Find the highlight element
    let element = selectedRange.commonAncestorContainer.parentElement
    while (element && !element.classList.contains("text-highlight")) {
      element = element.parentElement
    }

    if (element && element.classList.contains("text-highlight")) {
      const highlightId = element.dataset.highlightId
      const parent = element.parentNode
      while (element.firstChild) {
        parent?.insertBefore(element.firstChild, element)
      }
      parent?.removeChild(element)

      setHighlights((prev) => prev.filter((h) => h.id !== highlightId))
    }

    selection.removeAllRanges()
    setShowHighlightButton(false)
    setSelectedRange(null)
  }, [selectedRange, setHighlights]) // Include setHighlights in dependency array

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleTextSelection, 10) // Use a small timeout to allow selection to complete
    }

    document.addEventListener("mouseup", handleMouseUp)
    return () => document.removeEventListener("mouseup", handleMouseUp)
  }, [handleTextSelection])

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
              Object.entries(row).forEach(([cellKey, cellValue], cellIndex) => {
                if (cellValue === "" || cellValue === "_") {
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
        } else if (question.q_type === "NOTE_COMPLETION") {
          const blankCount = (question.q_text?.match(/____+/g) || []).length
          for (let i = 0; i < blankCount; i++) {
            const inputId = `${questionGroup.id}_${question.id}_note_${i}`
            if (answers[inputId]) {
              count++
            }
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
    const getCurrentPartPassages = testData?.passages?.filter((p) => p.part === `PART${partNumber}`) || []

    const partQuestions = testData?.questions.filter((q) => {
      return q.part === part
    })

    let count = 0

    for (const questionGroup of partQuestions) {
      if (questionGroup.r_questions && questionGroup.r_questions.length > 0) {
        questionGroup.r_questions.forEach((question) => {
          const questionId = `${questionGroup.id}_${question.id}`

          if (question.q_type === "TABLE_COMPLETION") {
            // Count empty cells in table
            if (question.rows && Array.isArray(question.rows)) {
              question.rows.forEach((row) => {
                if (row.cells && Array.isArray(row.cells)) {
                  row.cells.forEach((cell) => {
                    if (cell === "" || cell === "_") {
                      count++
                    }
                  })
                }
              })
            } else if (question.table_structure?.rows) {
              question.table_structure.rows.forEach((row) => {
                Object.entries(row).forEach(([cellKey, cellValue]) => {
                  if (cellValue === "" || cellValue === "_") {
                    count++
                  }
                })
              })
            }
          } else if (question.q_type === "MCQ_MULTI") {
            // Count number of correct answers
            count += question.correct_answers?.length || 1
          } else if (question.q_type === "MATCHING_INFORMATION") {
            // Count number of rows
            count += (question as any).rows?.length || 1
          } else if (question.q_type === "MATCHING_HEADINGS") {
            // Count number of answers in the answers object
            count += Object.keys(question.answers || {}).length
          } else if (question.q_type === "NOTE_COMPLETION") {
            // Count number of blanks
            const blankCount = (question.q_text?.match(/____+/g) || []).length
            count += blankCount
          } else if (question.q_type === "SENTENCE_COMPLETION" || question.q_type === "SUMMARY_COMPLETION") {
            // Count number of blanks or inputs
            const blankCount = (question.q_text?.match(/____+/g) || []).length
            count += blankCount > 0 ? blankCount : 1
          } else if (question.q_type === "DIAGRAM_LABELING") {
            // Count number of labels
            count += (question as any).labels?.length || 1
          } else if (question.q_type === "FLOW_CHART_COMPLETION") {
            // Count number of blanks in flow chart
            const blankCount = (question.q_text?.match(/____+/g) || []).length
            count += blankCount > 0 ? blankCount : 1
          } else {
            // For other question types (MCQ, TRUE_FALSE_NOT_GIVEN, etc.)
            count++
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
    const startNum = getQuestionNumber(firstQuestionId)

    let endNum = startNum

    questionGroup.r_questions.forEach((question, index) => {
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
      } else if (question.q_type === "NOTE_COMPLETION") {
        // Calculate range for NOTE_COMPLETION
        const blankCount = (question.q_text?.match(/____+/g) || []).length
        endNum = Math.max(endNum, currentStart + blankCount - 1)
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
                    const gapIndex = index
                    const matchingKey = `matching_${gapIndex}`

                    setMatchingAnswers((prev) => ({
                      ...prev,
                      [questionId]: {
                        ...(prev[questionId] || {}),
                        [gapIndex + 1]: draggedOption.key,
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
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-medium text-base ${colorStyles.text}`}>
                      {matchingAnswers[questionId][index + 1]}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const gapIndex = index
                        const matchingKey = `matching_${gapIndex}`

                        setMatchingAnswers((prev) => {
                          const updated = { ...prev }
                          if (updated[questionId]) {
                            delete updated[questionId][gapIndex + 1]
                          }
                          return updated
                        })

                        handleAnswerChange(matchingKey, "")
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1 transition-colors"
                      title="Remove answer"
                    >
                      ✕
                    </button>
                  </div>
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

  React.useEffect(() => {
    const questionsList: Array<{ id: string; groupId: string; part: number }> = []

    for (let part = 1; part <= 3; part++) {
      const partQuestions = getQuestionsForPart(part)
      partQuestions.forEach((questionGroup) => {
        const sortedRQuestions = questionGroup.r_questions
          ? [...questionGroup.r_questions].sort((a, b) => {
              const aOrder = a.order ?? a.q_number ?? a.id
              const bOrder = b.order ?? b.q_number ?? b.id
              return Number(aOrder) - Number(bOrder)
            })
          : []

        sortedRQuestions.forEach((question) => {
          questionsList.push({
            id: `${questionGroup.id}_${question.id}`,
            groupId: questionGroup.id,
            part: part,
          })
        })
      })
    }

    setAllQuestions(questionsList)
  }, [testData]) // Changed dependency to testData as it's where questions are fetched

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevQuestion = allQuestions[currentQuestionIndex - 1]
      if (prevQuestion.part !== currentPart) {
        switchToPart(prevQuestion.part)
      }
      scrollToQuestion(prevQuestion.id)
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const goToNextQuestion = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      const nextQuestion = allQuestions[currentQuestionIndex + 1]
      if (nextQuestion.part !== currentPart) {
        switchToPart(nextQuestion.part)
      }
      scrollToQuestion(nextQuestion.id)
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  // if (!user) {
  //   return (
  //     <div className={`min-h-screen ${colorStyles.bg} flex items-center justify-center`}>
  //       <div className="text-center max-w-md mx-auto p-8">
  //         <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
  //         <h1 className={`text-2xl font-bold mb-4 ${colorStyles.text}`}>Authentication Required</h1>
  //         <p className={`${colorStyles.text} mb-6`}>Please log in to access the test.</p>
  //         <Link href="/login">
  //           <Button className="bg-blue-500 hover:bg-blue-600 text-white">Go to Login</Button>
  //         </Link>
  //       </div>
  //     </div>
  //   )
  // }

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
                    <span className="bg-gray-700 text-white px-1.5 py-0.5 rounded text-xs font-medium mr-1">
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
    return partQuestions
      .filter((questionGroup) => {
        const hasMatchingHeadings = questionGroup.r_questions?.some((q) => q.q_type === "MATCHING_HEADINGS")
        return !hasMatchingHeadings
      })
      .map((questionGroup) => (
        <div
          key={questionGroup.id}
          className={`space-y-6 p-6 rounded-lg border-b ${colorStyles.border} last:border-b-0`}
          style={{ fontSize: `${textSize}px` }}
        >
          {(questionGroup.title || questionGroup.instruction) && (
            <div className="mb-6">
              {questionGroup.title && (
                <h3 className={`text-xl font-bold mb-3 ${colorStyles.text}`}>{questionGroup.title}</h3>
              )}
              {questionGroup.instruction && (
                <div>
                  <div className={`text-2xl font-bold mb-3 ${colorStyles.text}`}>
                    Questions {(() => {
                      const range = getQuestionGroupRange(questionGroup)
                      return range.start === range.end ? range.start : `${range.start}–${range.end}`
                    })()}
                  </div>
                  <div
                    className={`text-base leading-relaxed ${colorStyles.text}`}
                    dangerouslySetInnerHTML={{ __html: questionGroup.instruction }}
                  />
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
                {(question.q_type !== "MCQ_MULTI" &&
                  question.q_type !== "MATCHING_HEADINGS" &&
                  question.q_type !== "MATCHING_INFORMATION" &&
                  question.q_type !== "TFNG" &&
                  question.q_type !== "TRUE_FALSE_NOT_GIVEN" &&
                  question.q_type !== "MCQ_SINGLE" &&
                  question.q_type !== "NOTE_COMPLETION" &&
                  question.q_type !== "TABLE_COMPLETION" &&
                  question.q_type !== "DIAGRAM_LABELING" &&
                  question.q_type !== "FLOW_CHART_COMPLETION") ||
                question.q_text ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-gray-500 text-white px-3 py-1.5 rounded text-lg font-bold">
                        {(() => {
                          const startNum = getQuestionNumber(`${questionGroup.id}_${question.id}`)

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
                              question.table_structure.rows.forEach((row) => {
                                Object.values(row).forEach((value) => {
                                  if (value === "" || value === "_") {
                                    inputCount++
                                  }
                                })
                              })
                            }
                            const endNum = startNum + inputCount - 1
                            return inputCount > 1 ? `${startNum}–${endNum}` : startNum
                          } else if (question.q_type === "NOTE_COMPLETION") {
                            const blankCount = (question.q_text?.match(/____+/g) || []).length
                            const endNum = startNum + blankCount - 1
                            return blankCount > 1 ? `${startNum}–${endNum}` : startNum
                          } else if (question.q_type === "DIAGRAM_LABELING") {
                            const labelsCount = (question as any).labels?.length || 1
                            const endNum = startNum + labelsCount - 1
                            return labelsCount > 1 ? `${startNum}–${endNum}` : startNum
                          } else if (question.q_type === "FLOW_CHART_COMPLETION") {
                            const blankCount = (question.q_text?.match(/____+/g) || []).length
                            const endNum = startNum + blankCount - 1
                            return blankCount > 1 ? `${startNum}–${endNum}` : startNum
                          }

                          return startNum
                        })()}
                      </span>
                    </div>
                    {question.q_text && (
                      <div
                        className={`text-lg font-medium ${colorStyles.text}`}
                        dangerouslySetInnerHTML={{ __html: question.q_text }}
                      />
                    )}
                  </div>
                ) : null}

                {(question.q_type === "NOTE_COMPLETION" ||
                  question.q_type === "TABLE_COMPLETION" ||
                  question.q_type === "DIAGRAM_LABELING" ||
                  question.q_type === "FLOW_CHART_COMPLETION") &&
                  question.q_text && (
                    <div
                      className={`text-lg font-medium ${colorStyles.text}`}
                      dangerouslySetInnerHTML={{ __html: question.q_text }}
                    />
                  )}

                {(question.q_type === "TFNG" || question.q_type === "TRUE_FALSE_NOT_GIVEN") && (
                  <div className="space-y-[2px] mb-[6px]">
                    <div className="flex items-start gap-2 mb-[2px]">
                      <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[28px] h-[20px] px-1.5 text-[13px] font-semibold text-black border border-[#4B61D1] bg-white rounded-sm">
                        {getQuestionNumber(`${questionGroup.id}_${question.id}`)}
                      </span>
                      {question.q_text && (
                        <div
                          className="text-[15px] text-gray-900 font-normal leading-tight flex-1"
                          dangerouslySetInnerHTML={{ __html: question.q_text }}
                        />
                      )}
                    </div>

                    <div className="space-y-[1px] ml-[36px] mt-[1px]">
                      {["TRUE", "FALSE", "NOT GIVEN"].map((label, index) => {
                        const value = ["A", "B", "C"][index]
                        const isSelected = currentAnswer === value

                        return (
                          <label
                            key={value}
                            htmlFor={`q${question.id}-${value}`}
                            onClick={() => handleAnswerChange(questionId, value)}
                            className={`flex items-center gap-2 cursor-pointer select-none px-[2px] py-[1px] rounded-md transition-all duration-100 ${
                              isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="radio"
                              id={`q${question.id}-${value}`}
                              name={`q${question.id}`}
                              value={value}
                              checked={isSelected}
                              onChange={() => handleAnswerChange(questionId, value)}
                              className="peer relative w-[16px] h-[16px] rounded-full border border-black appearance-none cursor-pointer bg-white transition-all duration-150
                checked:before:content-[''] checked:before:absolute checked:before:top-[3px] checked:before:left-[3px]
                checked:before:w-[8px] checked:before:h-[8px] checked:before:bg-[#4B61D1] checked:before:rounded-full"
                            />

                            <span className="text-[15px] text-gray-900 leading-tight">{label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                {question.q_type === "MCQ_SINGLE" && question.options && (
                  <div className="space-y-[2px] mb-[6px]">
                    <div className="flex items-start gap-2 mb-[2px]">
                      <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[28px] h-[20px] px-1.5 text-[13px] font-semibold text-black border border-[#4B61D1] bg-white rounded-sm">
                        {getQuestionNumber(`${questionGroup.id}_${question.id}`)}
                      </span>
                      {question.q_text && (
                        <div
                          className="text-[15px] text-gray-900 font-normal leading-tight flex-1"
                          dangerouslySetInnerHTML={{ __html: question.q_text }}
                        />
                      )}
                    </div>

                    <div className="space-y-[1px] ml-[36px] mt-[1px]">
                      {question.options.map((option) => {
                        const isSelected = currentAnswer === option.key
                        return (
                          <label
                            key={option.key}
                            htmlFor={`q${question.id}-${option.key}`}
                            onClick={() => handleAnswerChange(questionId, option.key)}
                            className={`flex items-center gap-2 cursor-pointer select-none px-[2px] py-[1px] rounded-md transition-all duration-100 ${
                              isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="radio"
                              id={`q${question.id}-${option.key}`}
                              name={`q${question.id}`}
                              value={option.key}
                              checked={isSelected}
                              onChange={() => handleAnswerChange(questionId, option.key)}
                              className="peer relative w-[16px] h-[16px] rounded-full border border-black appearance-none cursor-pointer bg-white transition-all duration-150
                checked:before:content-[''] checked:before:absolute checked:before:top-[3px] checked:before:left-[3px]
                checked:before:w-[8px] checked:before:h-[8px] checked:before:bg-[#4B61D1] checked:before:rounded-full"
                            />

                            <span
                              className="text-[15px] text-gray-900 leading-tight"
                              dangerouslySetInnerHTML={{ __html: option.text }}
                            />
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                {question.q_type === "MCQ_MULTI" && question.options && (
                  <div className="space-y-[2px] mb-[8px] ml-[20px]">
                    {(() => {
                      const startNum = getQuestionNumber(`${questionGroup.id}_${question.id}`)
                      const correctCount = question.correct_answers?.length || 1
                      const subQuestions: Array<{ start: number; end: number; text: string }> = []
                      const qTexts = question.q_text?.split(/\n\n+/) || []

                      if (qTexts.length > 1) {
                        qTexts.forEach((text, index) => {
                          const subStart = startNum + index * correctCount
                          const subEnd = subStart + correctCount - 1
                          subQuestions.push({ start: subStart, end: subEnd, text: text.trim() })
                        })
                      } else {
                        subQuestions.push({
                          start: startNum,
                          end: startNum + correctCount - 1,
                          text: question.q_text || "",
                        })
                      }

                      return (
                        <>
                          {subQuestions.map((subQ, idx) => (
                            <div key={idx} className="space-y-3">
                              <div className="flex items-start gap-3">
                                <span className="border-2 border-blue-500 bg-white text-gray-900 font-semibold text-[14px] px-[6px] py-[1px] rounded-[4px]">
                                  {subQ.start}–{subQ.end}
                                </span>
                                {subQ.text && (
                                  <div
                                    className="text-[15px] text-gray-900 font-semibold flex-1 leading-snug"
                                    dangerouslySetInnerHTML={{ __html: subQ.text }}
                                  />
                                )}
                              </div>

                              <div className="space-y-1 ml-[30px]">
                                {question.options.map((option, index) => {
                                  const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(option.key)

                                  return (
                                    <label
                                      key={index}
                                      htmlFor={`q${question.id}-${idx}-${option.key}`}
                                      onClick={() => {
                                        const currentAnswers = Array.isArray(currentAnswer) ? currentAnswer : []
                                        if (isSelected) {
                                          // Always allow deselection
                                          const newAnswers = currentAnswers.filter((a) => a !== option.key)
                                          handleAnswerChange(questionId, newAnswers)
                                        } else if (currentAnswers.length < correctCount) {
                                          // Only allow selection if under the limit
                                          const newAnswers = [...currentAnswers, option.key]
                                          handleAnswerChange(questionId, newAnswers)
                                        }
                                        // If at limit and trying to select, do nothing (user must deselect first)
                                      }}
                                      className="flex items-center gap-3 cursor-pointer select-none px-[3px] py-[1px] rounded-md transition-all duration-100 hover:bg-gray-50"
                                    >
                                      <input
                                        type="checkbox"
                                        id={`q${question.id}-${idx}-${option.key}`}
                                        checked={isSelected}
                                        readOnly
                                        className="peer relative w-[16px] h-[16px] rounded-[3px] border border-black appearance-none cursor-pointer bg-white transition-all duration-150
                          checked:before:content-[''] checked:before:absolute checked:before:top-[3px] checked:before:left-[3px]
                          checked:before:w-[8px] checked:before:h-[8px] checked:before:bg-[#4B61D1] checked:before:rounded-[1px]"
                                      />
                                      <span
                                        className="text-[14px] text-gray-900 leading-tight"
                                        dangerouslySetInnerHTML={{ __html: option.text }}
                                      />
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </>
                      )
                    })()}
                  </div>
                )}
                {question.q_type === "NOTE_COMPLETION" && question.options && (
                  <div className="space-y-1">
                    <div className={`rounded-lg p-3 leading-[2.4] ${colorStyles.cardBg}`}>
                      {(() => {
                        const questionStartNum = getQuestionNumber(`${questionGroup.id}_${question.id}`)

                        const optionsText =
                          typeof question.options === "string" ? question.options : JSON.stringify(question.options)

                        // h1 elementlarini ajratamiz
                        const parts = optionsText.split(/(<h1>.*?<\/h1>)/g)
                        let currentInputIndex = 0

                        return parts.map((part, index) => {
                          // Agar <h1> bo'lsa, markazda chiqaramiz
                          if (/<h1>.*?<\/h1>/.test(part)) {
                            const headingText = part.replace(/<\/?h1>/g, "").trim()
                            return (
                              <div key={index} className={`text-center my-6 font-bold text-[22px] ${colorStyles.text}`}>
                                {headingText}
                              </div>
                            )
                          }

                          // Text ichidagi bo'sh joylarni (____) inputlarga aylantiramiz
                          const textParts = part.split(/(____+)/)

                          return (
                            <div key={index} className="my-3">
                              {textParts.map((subPart, subIndex) => {
                                if (subPart.match(/____+/)) {
                                  const questionNum = questionStartNum + currentInputIndex
                                  const inputId = `${questionGroup.id}_${question.id}_note_${currentInputIndex}`
                                  const currentAnswer = answers[inputId] || ""
                                  const currentIndex = currentInputIndex
                                  currentInputIndex++

                                  return (
                                    <span
                                      key={`${index}_${subIndex}`}
                                      className="inline-flex items-center mx-[4px] align-middle"
                                    >
                                      <Input
                                        type="text"
                                        value={currentAnswer}
                                        onChange={(e) =>
                                          handleNoteCompletionChange(
                                            questionGroup.id.toString(),
                                            question.id.toString(),
                                            currentIndex,
                                            e.target.value,
                                          )
                                        }
                                        placeholder={questionNum.toString()}
                                        className={`inline-block w-[150px] px-3 py-[3px] text-center text-sm
                                   bg-white border-2 border-black rounded-[4px]
                                   focus:outline-none focus:ring-[1px] focus:ring-[#4B61D1] focus:border-[#4B61D1]
                                   placeholder-gray-400 transition-all duration-150 ${colorStyles.text}`}
                                      />
                                    </span>
                                  )
                                } else {
                                  return (
                                    <span
                                      key={`${index}_${subIndex}`}
                                      className={`${colorStyles.text} leading-relaxed`}
                                      style={{ fontSize: `${textSize}px` }}
                                      dangerouslySetInnerHTML={{ __html: subPart }}
                                    />
                                  )
                                }
                              })}
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                )}

                {question.q_type === "TABLE_COMPLETION" && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border-2 border-black">
                      <tbody>
                        {question.rows?.map((row: any, rowIndex: number) => (
                          <tr key={rowIndex}>
                            {row.cells?.map((cell: string, cellIndex: number) => {
                              const isEmptyOrUnderscore = cell === "" || cell === "_"
                              const hasUnderscores = typeof cell === "string" && /_+/.test(cell) && !isEmptyOrUnderscore

                              if (isEmptyOrUnderscore || hasUnderscores) {
                                const tableAnswersKey = `${questionId}_answer`
                                const tableAnswers = answers[tableAnswersKey] || {}
                                const cellKey = `${rowIndex}_${cellIndex}`

                                // Har bir input uchun placeholder nomerini hisoblash
                                const inputQuestionNumber = getQuestionNumber(questionId) // Start with the base question number
                                let currentCellIndex = 0

                                // Iterate through rows and cells to find the correct sequential number
                                question.rows?.forEach((r: any, rIndex: number) => {
                                  r.cells?.forEach((c: string, cIndex: number) => {
                                    if (rIndex < rowIndex || (rIndex === rowIndex && cIndex < cellIndex)) {
                                      if (c === "" || c === "_" || (typeof c === "string" && /_+/.test(c))) {
                                        currentCellIndex++
                                      }
                                    }
                                  })
                                })

                                const finalQuestionNumber = inputQuestionNumber + currentCellIndex

                                return (
                                  <td key={cellIndex} className="border-2 border-black p-2">
                                    <div className="min-w-[150px]">
                                      {hasUnderscores ? (
                                        <div className="flex flex-wrap items-center gap-1">
                                          {cell.split(/(_+)/).map((part: string, partIndex: number) => {
                                            if (/_+/.test(part)) {
                                              return (
                                                <Input
                                                  key={partIndex}
                                                  value={tableAnswers[cellKey] || ""}
                                                  onChange={(e) =>
                                                    handleAnswerChange(tableAnswersKey, {
                                                      ...tableAnswers,
                                                      [cellKey]: e.target.value,
                                                    })
                                                  }
                                                  className="inline-block text-black w-32 text-sm bg-white border-2 border-black focus:border-black text-center"
                                                  placeholder={finalQuestionNumber.toString()}
                                                />
                                              )
                                            }
                                            return part ? (
                                              <span key={partIndex} className="text-gray-900 font-bold">
                                                {part}
                                              </span>
                                            ) : null
                                          })}
                                        </div>
                                      ) : (
                                        <Input
                                          value={tableAnswers[cellKey] || ""}
                                          onChange={(e) =>
                                            handleAnswerChange(tableAnswersKey, {
                                              ...tableAnswers,
                                              [cellKey]: e.target.value,
                                            })
                                          }
                                          className="w-full text-sm bg-white  text-black border-2 border-black focus:border-black text-center"
                                          placeholder={finalQuestionNumber.toString()}
                                        />
                                      )}
                                    </div>
                                  </td>
                                )
                              }

                              return (
                                <td key={cellIndex} className="border-2 border-black p-2">
                                  <span className="text-gray-900 font-bold">{cell}</span>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {question.q_type === "MATCHING_INFORMATION" && question.rows && question.choices && (
                  <div className="space-y-5">
                    {/* Instruction bo'lsa, tepada chiqadi */}
                    {/* questionStartNum and questionEndNum are undeclared, so removed them */}

                    {/* Jadval (asosiy qismlar) */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-2 border-black text-base">
                        <thead>
                          <tr className="bg-gray-100 border-b-2 border-black">
                            <th
                              className="p-2 text-left font-bold text-black border-r-2 border-black"
                              style={{ fontSize: `${textSize}px` }}
                            >
                              Questions {(() => {
                                const questionStartNum = getQuestionNumber(`${questionGroup.id}_${question.id}`)
                                const questionEndNum = getQuestionGroupRange(questionGroup).end
                                return questionStartNum === questionEndNum
                                  ? questionStartNum
                                  : `${questionStartNum}–${questionEndNum}`
                              })()}
                            </th>
                            {Object.keys(question.choices).map((choiceKey) => (
                              <th
                                key={choiceKey}
                                className="p-2 text-center font-bold text-black border-l-2 border-black w-14"
                                style={{ fontSize: `${textSize * 0.95}px` }}
                              >
                                {choiceKey}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {question.rows.map((rowText, index) => {
                            const questionNum = getQuestionNumber(`${questionGroup.id}_${question.id}`) + index
                            const inputName = `${questionGroup.id}_${question.id}_row_${index}`
                            const selected = answers[inputName]

                            return (
                              <tr
                                key={index}
                                className="border-b-2 border-black hover:bg-blue-50 transition-all duration-150"
                              >
                                {/* Chap ustun (raqam + matn) */}
                                <td className="border-r-2 border-black p-2 text-black font-semibold">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-white border-2 border-[#4B61D1] text-gray-900 w-6 h-6 rounded flex items-center justify-center text-xs font-bold">
                                      {questionNum}
                                    </span>
                                    <span
                                      className="text-gray-900 leading-tight"
                                      style={{ fontSize: `${textSize * 0.95}px` }}
                                      dangerouslySetInnerHTML={{ __html: rowText }}
                                    />
                                  </div>
                                </td>

                                {/* Variantlar (A, B, C ...) */}
                                {Object.keys(question.choices).map((choiceKey) => (
                                  <td key={choiceKey} className="border-l-2 border-black p-2 text-center">
                                    <input
                                      type="radio"
                                      name={inputName}
                                      value={choiceKey}
                                      checked={selected === choiceKey}
                                      onChange={(e) => handleAnswerChange(inputName, e.target.value)}
                                      className="w-4 h-4 accent-[#4B61D1] cursor-pointer"
                                    />
                                  </td>
                                ))}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Choices (pastdagi legend jadvali) */}
                    <div className="mt-5">
                      <h5 className="font-bold mb-2 text-black" style={{ fontSize: `${textSize}px` }}>
                        {question.q_text ? <span dangerouslySetInnerHTML={{ __html: question.q_text }} /> : "Choices:"}
                      </h5>

                      <div className="overflow-x-auto">
                        <table className="w-full border-2 border-black text-base">
                          <tbody>
                            {Object.entries(question.choices).map(([key, text]) => (
                              <tr
                                key={key}
                                className="border-b-2 border-black hover:bg-blue-50 transition-all duration-150"
                              >
                                <td
                                  className="border-r-2 border-black p-2 w-14 text-center font-bold bg-white text-black"
                                  style={{ fontSize: `${textSize * 0.95}px` }}
                                >
                                  {key}
                                </td>
                                <td
                                  className="border-l-2 border-black p-2 text-black font-semibold"
                                  style={{ fontSize: `${textSize * 0.95}px` }}
                                >
                                  <span dangerouslySetInnerHTML={{ __html: text as string }} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Diagram Labeling */}
                {question.q_type === "DIAGRAM_LABELING" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-gray-500 text-white px-3 py-1.5 rounded text-lg font-bold">
                        {(() => {
                          const startNum = getQuestionNumber(`${questionGroup.id}_${question.id}`)
                          const labelsCount = (question as any).labels?.length || 1
                          const endNum = startNum + labelsCount - 1
                          return labelsCount > 1 ? `${startNum}–${endNum}` : startNum
                        })()}
                      </span>
                    </div>
                    {question.q_text && (
                      <div
                        className={`text-lg font-medium ${colorStyles.text}`}
                        dangerouslySetInnerHTML={{ __html: question.q_text }}
                      />
                    )}
                    {question.photo && (
                      <img
                        src={question.photo || "/placeholder.svg"}
                        alt="Diagram"
                        className="max-w-full h-auto rounded-lg shadow-md"
                      />
                    )}
                    {(question as any).labels?.map((label: { id: string; text: string }, index: number) => {
                      const labelQuestionId = `${questionId}_label_${label.id}`
                      const currentLabelAnswer = answers[labelQuestionId] || ""
                      return (
                        <div key={label.id} className="flex items-center gap-3">
                          <span className="bg-gray-700 text-white px-2.5 py-1 rounded text-sm font-bold shrink-0">
                            {getQuestionNumber(`${questionGroup.id}_${question.id}`) + index}
                          </span>
                          <Input
                            value={currentLabelAnswer}
                            onChange={(e) => handleAnswerChange(labelQuestionId, e.target.value)}
                            className={`flex-1 text-sm bg-white text-black border-2 border-black focus:border-black ${colorStyles.inputBg}`}
                            placeholder="Enter label"
                          />
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Flow Chart Completion */}
                {question.q_type === "FLOW_CHART_COMPLETION" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="bg-gray-500 text-white px-3 py-1.5 rounded text-lg font-bold">
                        {(() => {
                          const startNum = getQuestionNumber(`${questionGroup.id}_${question.id}`)
                          const blankCount = (question.q_text?.match(/____+/g) || []).length
                          const endNum = startNum + blankCount - 1
                          return blankCount > 1 ? `${startNum}–${endNum}` : startNum
                        })()}
                      </span>
                    </div>
                    {question.q_text && (
                      <div
                        className={`text-lg font-medium ${colorStyles.text}`}
                        dangerouslySetInnerHTML={{ __html: question.q_text }}
                      />
                    )}
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

  const formatAudioTimeRemaining = () => {
    const totalTime = 3600
    const remaining = Math.max(0, timeRemaining ?? totalTime) // Use timeRemaining if available, otherwise use totalTime
    const minutes = Math.floor(remaining / 60)
    const seconds = Math.floor(remaining % 60)

    if (minutes <= 5 && minutes > 0) {
      return `${minutes} minutes ${seconds} seconds`
    }

    if (minutes === 0) {
      return `${seconds} seconds`
    }

    return `${minutes} minutes`
  }

  return (
    <div className={`flex flex-col h-screen ${colorStyles.bg}`}>
      {/* Header */}
      <div className="border-b">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-red-600">IELTS</div>
            <div className="text-base font-medium text-gray-700">Test taker ID : {userId}</div>

            <span className="text-black">• {formatAudioTimeRemaining()} remaining</span>
          </div>

          <div className="flex items-center gap-4">
            {isOnline ? <Wifi className="h-6 w-6 text-gray-700" /> : <WifiOff className="h-6 w-6 text-red-500" />}

            <Button variant="ghost" size="icon">
              <Bell className="h-6 w-6 text-gray-700" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6 text-gray-700" />
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
        <div className="absolute top-[60px] left-0 right-0 z-10">
          <div className={`${colorStyles.cardBg} border-b-2 ${colorStyles.border} px-6 py-4`}>
            <h2 className={`text-xl font-bold ${colorStyles.text} mb-1`}>Part {currentPart}</h2>
            <p className={`text-base ${colorStyles.text}`}>
              Read the text and answer questions {(() => {
                const range = getPartQuestionRange(currentPart)
                return range.start === range.end ? range.start : `${range.start}–${range.end}`
              })()}.
            </p>
          </div>
        </div>

        {/* Passage Panel - Independent Scroll */}
        <div
          className={`${colorStyles.bg} border-r ${colorStyles.border} flex flex-col overflow-hidden`}
          style={{ width: `${passageWidth * 100}%` }}
        >
          <div className="flex-1 overflow-y-auto" style={{ paddingTop: "100px" }}>
            <div className="p-6">
              <div className={`${colorStyles.cardBg} rounded-lg p-6 shadow-sm`} style={{ fontSize: `${textSize}px` }}>
                <div className="prose max-w-none" ref={passageRef}>
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
          <div className="flex-1 overflow-y-auto pb-20" style={{ fontSize: `${textSize}px`, paddingTop: "100px" }}>
            <div className="p-6">
              {(() => {
                const matchingDetails = getMatchingQuestionDetails()
                if (!matchingDetails) return null

                const { questionGroup, question, questionId } = matchingDetails

                const answerCount = Object.keys(question.options || {}).length

                return (
                  <div className={`mb-8 p-6 border rounded-lg ${colorStyles.cardBg} ${colorStyles.border}`}>
                    <div className={`text-2xl font-bold mb-3 ${colorStyles.text}`}>
                      Questions {(() => {
                        const questionStartNum = getQuestionNumber(`${questionGroup.id}_${question.id}`)
                        const endNum = questionStartNum + answerCount - 1
                        return questionStartNum === endNum ? questionStartNum : `${questionStartNum}–${endNum}`
                      })()}
                    </div>

                    {questionGroup.instruction && (
                      <div
                        className={`text-base leading-relaxed mb-6 ${colorStyles.text}`}
                        dangerouslySetInnerHTML={{ __html: questionGroup.instruction }}
                      />
                    )}

                    {question.q_text && question.q_text !== "-" && (
                      <div
                        className={`text-lg font-medium mb-4 ${colorStyles.text}`}
                        dangerouslySetInnerHTML={{ __html: question.q_text }}
                      />
                    )}

                    <h3 className={`text-lg font-bold ${colorStyles.text} mb-4`}>List of Headings</h3>

                    <div className="space-y-3">
                      {question.options
                        ?.filter((option) => {
                          const isPlaced = Object.values(matchingAnswers[questionId] || {}).includes(option.key)
                          return !isPlaced
                        })
                        .map((option) => {
                          return (
                            <div
                              key={option.key}
                              draggable={true}
                              onDragStart={() => {
                                setDraggedOption({ key: option.key, text: option.text })
                              }}
                              onDragEnd={() => setDraggedOption(null)}
                              className={`flex items-start gap-3 p-4 border-2 rounded-lg transition-all cursor-move hover:border-blue-400 hover:shadow-md border-blue-300 ${colorStyles.border} ${colorStyles.cardBg}`}
                            >
                              <span className="font-bold text-blue-600 shrink-0 mt-0.5">{option.key}</span>
                              <span className={`text-base leading-relaxed ${colorStyles.text}`}>{option.text}</span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )
              })()}

              <div className="space-y-6">{renderQuestions(currentPart)}</div>
            </div>
          </div>
        </div>
      </div>

      {showHighlightButton && (
        <div
          className="fixed z-50"
          style={{
            left: `${highlightButtonPosition.x}px`,
            top: `${highlightButtonPosition.y}px`,
            transform: "translateX(-50%)",
          }}
        >
          <Button
            onClick={isHighlightedText ? removeHighlight : addHighlight}
            size="sm"
            className={isHighlightedText ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"}
          >
            {isHighlightedText ? "Remove Highlight" : "Add Highlight"}
          </Button>
        </div>
      )}

      {/* Bottom Navigation */}
      <div
        className={`fixed bottom-0 left-0 right-0 ${colorStyles.headerBg} border-t ${colorStyles.border} px-6 py-4 z-50`}
      >
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className={`md:hidden ${colorStyles.bg} border-b ${colorStyles.border} p-4`}>
            <div className="flex flex-col space-y-4">
              {/* Mobile Part Navigation */}
              <div className="flex flex-col space-y-2">
                <h3 className={`text-lg font-semibold ${colorStyles.text}`}>Parts</h3>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((partNum) => {
                    const totalQuestions = getPartQuestionCount(partNum)
                    const answeredCount = getAnsweredCountForPart(partNum)
                    const isComplete = answeredCount === totalQuestions
                    return (
                      <button
                        key={partNum}
                        onClick={() => {
                          switchToPart(partNum)
                          setIsMobileMenuOpen(false)
                        }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
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
              </div>
              {/* Mobile Question Navigation */}
              <div className="flex flex-col space-y-2">
                <h3 className={`text-lg font-semibold ${colorStyles.text}`}>Questions</h3>
                <div className="flex flex-wrap gap-1">
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
                                  onClick={() => {
                                    scrollToQuestion(questionId)
                                    setIsMobileMenuOpen(false)
                                  }}
                                  className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
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
                                onClick={() => {
                                  scrollToQuestion(questionId)
                                  setIsMobileMenuOpen(false)
                                }}
                                className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
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
                                        onClick={() => {
                                          scrollToQuestion(questionId)
                                          setIsMobileMenuOpen(false)
                                        }}
                                        className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
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
                                      onClick={() => {
                                        scrollToQuestion(questionId)
                                        setIsMobileMenuOpen(false)
                                      }}
                                      className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
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
                                onClick={() => {
                                  scrollToQuestion(questionId)
                                  setIsMobileMenuOpen(false)
                                }}
                                className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
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
                                onClick={() => {
                                  scrollToQuestion(questionId)
                                  setIsMobileMenuOpen(false)
                                }}
                                className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
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
                              onClick={() => {
                                scrollToQuestion(questionId)
                                setIsMobileMenuOpen(false)
                              }}
                              className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
                                isAnswered
                                  ? "bg-green-500 text-white hover:bg-green-600"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              {startNum}
                            </button>,
                          )
                        } else if (question.q_type === "NOTE_COMPLETION") {
                          // Add buttons for NOTE_COMPLETION
                          const blanks = question.q_text?.match(/____+/g) || []
                          blanks.forEach((_, index) => {
                            const inputId = `${questionId}_note_${index}`
                            const isAnswered = !!answers[inputId]
                            questionButtons.push(
                              <button
                                key={`${questionId}_note_${index}`}
                                onClick={() => {
                                  scrollToQuestion(questionId)
                                  setIsMobileMenuOpen(false)
                                }}
                                className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
                                  isAnswered
                                    ? "bg-green-500 text-white hover:bg-green-600"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                }`}
                              >
                                {startNum + index}
                              </button>,
                            )
                          })
                        } else {
                          const isAnswered = !!answers[questionId]
                          questionButtons.push(
                            <button
                              key={questionId}
                              onClick={() => {
                                scrollToQuestion(questionId)
                                setIsMobileMenuOpen(false)
                              }}
                              className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
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
            </div>
          </div>
        )}

        <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
          {/* Desktop Navigation - CHANGE: Simplified layout to show parts inline with question numbers only for active part */}
          <div className="hidden md:flex items-center space-x-4 flex-1">
            {/* Part Navigation */}
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map((partNum) => {
                const totalQuestions = getPartQuestionCount(partNum)
                const answeredCount = getAnsweredCountForPart(partNum)
                const isActive = currentPart === partNum

                return (
                  <div key={partNum} className="flex items-center space-x-2">
                    <button
                      onClick={() => switchToPart(partNum)}
                      className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                        isActive ? "bg-gray-800 text-white" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Part {partNum}
                    </button>

                    {/* Show question numbers only for active part */}
                    {isActive && (
                      <div className="flex items-center space-x-1">
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
                                            : "bg-gray-300 text-gray-700 hover:bg-gray-400"
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
                                          : "bg-gray-300 text-gray-700 hover:bg-gray-400"
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
                                                  : "bg-gray-300 text-gray-700 hover:bg-gray-400"
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
                                                : "bg-gray-300 text-gray-700 hover:bg-gray-400"
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
                                          : "bg-gray-300 text-gray-700 hover:bg-gray-400"
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
                                          : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                      }`}
                                    >
                                      {startNum + i}
                                    </button>,
                                  )
                                }
                              } else if (question.q_type === "NOTE_COMPLETION") {
                                // Add buttons for NOTE_COMPLETION
                                const blanks = question.q_text?.match(/____+/g) || []
                                blanks.forEach((_, index) => {
                                  const inputId = `${questionId}_note_${index}`
                                  const isAnswered = !!answers[inputId]
                                  questionButtons.push(
                                    <button
                                      key={`${questionId}_note_${index}`}
                                      onClick={() => {
                                        scrollToQuestion(questionId)
                                      }}
                                      className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                                        isAnswered
                                          ? "bg-green-500 text-white hover:bg-green-600"
                                          : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                      }`}
                                    >
                                      {startNum + index}
                                    </button>,
                                  )
                                })
                              } else {
                                const isAnswered = !!answers[questionId]
                                questionButtons.push(
                                  <button
                                    key={questionId}
                                    onClick={() => scrollToQuestion(questionId)}
                                    className={`w-8 h-8 text-xs font-medium rounded transition-colors ${
                                      isAnswered
                                        ? "bg-green-500 text-white hover:bg-green-600"
                                        : "bg-gray-300 text-gray-700 hover:bg-gray-400"
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
                    )}

                    {/* Show "X of Y" for inactive parts */}
                    {!isActive && (
                      <span className="text-sm text-gray-600">
                        {answeredCount} of {totalQuestions}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-10 h-10 bg-gray-900 text-white rounded flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            ✓
          </button>
        </div>
      </div>

      {AlertComponent}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Confirm Submission</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to submit your test? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitAnswers}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Submitting..." : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

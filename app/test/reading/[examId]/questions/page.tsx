"use client"

import React from "react"

import { useEffect, useState, useRef, use, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../../../../../components/ui/button"
import { useAuth } from "../../../../../contexts/auth-context"
import { AlertTriangle } from "lucide-react"
import { useCustomAlert } from "../../../../../hooks/use-custom-alert"
import Link from "next/link"
import { Input } from "../../../../../components/ui/input"
import { RadioGroup, RadioGroupItem } from "../../../../../components/ui/radio-group"
import { Label } from "../../../../../components/ui/label"

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
  text?: string // Added for SUMMARY_COMPLETION and SUMMARY_DRAG
  type?: string // Added for question type filtering
  title?: string // Added for MATCHING_HEADINGS
  instruction?: string // Added for MATCHING_HEADINGS
  choices?: { [key: string]: string } // Added for MATCHING_HEADINGS
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
  instructions?: string // Added for question group instructions
  passage?: string // Added for passage text
  order?: number // Added for sorting questions within a part
  choices?: { [key: string]: string } // Added for MATCHING_HEADINGS
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
  passage?: string // Added for passage text
  reading_text?: string // Added for passage text
  passages?: Passage[] // Added passages array
}

const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = timeInSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
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
  const [showContrastModal, setShowContrastModal] = useState(false)
  const [contrastMode, setContrastMode] = useState<"default" | "white-on-black" | "yellow-on-black">("default")
  const [textSize, setTextSize] = useState(16)
  const [questionNumbers, setQuestionNumbers] = useState<Record<string, number>>({})
  const { showAlert, AlertComponent, setAlert } = useCustomAlert()
  const [contrast, setContrast] = useState<"normal" | "high">("normal")

  // New resizable layout with separate scrolling areas
  const [passageWidth, setPassageWidth] = useState(0.5) // Initial split 50/50
  const [isResizing, setIsResizing] = useState(false)
  const mainContentContainerRef = useRef<HTMLDivElement>(null)

  // State for the new header and bottom nav
  const [showContrastMenu, setShowContrastMenu] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null) // For header timer

  // Hooks for SUMMARY_DRAG
  const [draggedOption, setDraggedOption] = useState<{ key: string; text: string } | null>(null)
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, Record<number, string>>>({}) // Store matching answers by question ID and position index

  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(0)

  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium")
  // const [contrast, setContrast] = useState<'normal' | 'high'>('normal') // This was a duplicate, removed
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)

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

          data.questions.forEach((questionGroup) => {
            questionGroup.r_questions?.forEach((question) => {
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
                // Reconstruct the questionId from the stored data
                if (item.question_type === "TABLE_COMPLETION" && item.answer && typeof item.answer === "object") {
                  // TABLE: answer is like {"0_2": "warm"}
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
                  // MATCHING_HEADINGS: answer is like {"1": "A"}
                  const positionIndex = Object.keys(item.answer)[0]
                  const value = item.answer[positionIndex]
                  const questionId = `matching_${positionIndex}`
                  loadedAnswers[questionId] = value

                  // Also update matchingAnswers state
                  const matchingQuestionId = `${item.questionId}_${item.r_questionsID}`
                  setMatchingAnswers((prev) => ({
                    ...prev,
                    [matchingQuestionId]: {
                      ...(prev[matchingQuestionId] || {}),
                      [Number.parseInt(positionIndex)]: value,
                    },
                  }))
                } else if (item.question_type === "MCQ_MULTI") {
                  // MCQ_MULTI: collect all answers for the same question
                  const questionId = `${item.questionId}_${item.r_questionsID}`
                  if (!loadedAnswers[questionId]) {
                    loadedAnswers[questionId] = []
                  }
                  if (Array.isArray(loadedAnswers[questionId])) {
                    ;(loadedAnswers[questionId] as string[]).push(item.answer)
                  }
                } else if (item.rowIndex !== undefined) {
                  // MATCHING_INFORMATION: has rowIndex
                  const questionId = `${item.questionId}_${item.r_questionsID}_row_${item.rowIndex}`
                  loadedAnswers[questionId] = item.answer
                } else if (item.blankIndex !== undefined) {
                  // SUMMARY_COMPLETION: has blankIndex
                  const questionId = `${item.questionId}_${item.r_questionsID}_summary_${item.blankIndex}`
                  loadedAnswers[questionId] = item.answer
                } else if (item.question_type === "SENTENCE_COMPLETION") {
                  // SENTENCE_COMPLETION: answer can be a string or an object for multiple blanks
                  const questionId = `${item.questionId}_${item.r_questionsID}`
                  loadedAnswers[questionId] = item.answer
                } else {
                  // Regular questions
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
          id: examId,
          exam_id: examId,
          passage_title: "Reading Test",
          passage_text: "IELTS Reading Test",
          created_at: null,
          questions: [],
        })

        showAlert({
          title: "Connection Error",
          description: "Unable to load test data. Please check your internet connection and try again.",
          type: "error",
          confirmText: "Retry",
          showCancel: true,
          cancelText: "Continue Offline",
          onConfirm: () => fetchTestData(),
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
        if (prev === null || prev <= 1) {
          if (!isSubmitted && !isSubmitting) {
            handleSubmit()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, isSubmitted, isSubmitting])

  const handleAnswerChange = (questionId: string, answer: string | string[] | Record<string, string>) => {
    console.log("[v0] handleAnswerChange called:", { questionId, answer })

    // Update local state
    const newAnswers = {
      ...answers,
      [questionId]: answer,
    }
    setAnswers(newAnswers)

    // Get existing answers from localStorage
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

    // Parse questionId to get components
    const parts = questionId.split("_")
    const questionGroupId = parts[0]
    const rQuestionId = parts[1] || parts[0]

    // Find the question to get its type
    const questionGroup = testData?.questions.find((qg) => qg.id.toString() === questionGroupId)
    const question = questionGroup?.r_questions?.find((rq) => rq.id.toString() === rQuestionId)
    const questionType = question?.q_type || "UNKNOWN"

    console.log("[v0] Question info:", { questionGroupId, rQuestionId, questionType, question })

    // Handle empty answer (deletion)
    if (!answer || (Array.isArray(answer) && answer.length === 0) || answer.toString().trim() === "") {
      console.log("[v0] Deleting answer for:", questionId)

      // Remove from localStorage based on question type
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
      } else if (questionId.includes("_summary_")) {
        const blankIndex = parts[parts.length - 1]
        answersArray = answersArray.filter(
          (item: any) =>
            !(
              item.questionId === Number.parseInt(questionGroupId) &&
              item.r_questionsID === Number.parseInt(rQuestionId) &&
              item.blankIndex === blankIndex
            ),
        )
      } else if (questionType === "SENTENCE_COMPLETION") {
        answersArray = answersArray.filter(
          (item: any) =>
            !(
              item.questionId === Number.parseInt(questionGroupId) &&
              item.r_questionsID === Number.parseInt(rQuestionId) &&
              item.question_type === "SENTENCE_COMPLETION"
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
      console.log("[v0] Saved answers after deletion:", answersArray)
      return
    }

    // Handle TABLE_COMPLETION
    if (questionId.includes("_table_")) {
      const rowIndex = parts[parts.length - 2]
      const cellIndex = parts[parts.length - 1]
      const cellPosition = `${rowIndex}_${cellIndex}`

      // Remove existing entry for this cell
      answersArray = answersArray.filter(
        (item: any) => !(item.question_type === "TABLE_COMPLETION" && item.answer && item.answer[cellPosition]),
      )

      // Add new entry
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
    }
    // Handle MATCHING_HEADINGS
    else if (questionId.startsWith("matching_")) {
      const positionIndex = parts[1]

      // Remove existing entry for this position
      answersArray = answersArray.filter(
        (item: any) => !(item.question_type === "MATCHING_HEADINGS" && item.answer && item.answer[positionIndex]),
      )

      // Find the matching question to get proper IDs
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
    }
    // Handle MCQ_MULTI
    else if (questionType === "MCQ_MULTI" && Array.isArray(answer)) {
      // Remove all existing entries for this question
      answersArray = answersArray.filter(
        (item: any) =>
          !(
            item.questionId === Number.parseInt(questionGroupId) &&
            item.r_questionsID === Number.parseInt(rQuestionId) &&
            item.question_type === "MCQ_MULTI"
          ),
      )

      // Add separate entry for each selected option
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
    }
    // Handle MATCHING_INFORMATION (with rowIndex)
    else if (questionId.includes("_row_")) {
      const rowIndex = Number.parseInt(parts[parts.length - 1])

      // Remove existing entry for this row
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
    }
    // Handle SUMMARY_COMPLETION (with blankIndex)
    else if (questionId.includes("_summary_")) {
      const blankIndex = parts[parts.length - 1]

      // Remove existing entry for this blank
      answersArray = answersArray.filter(
        (item: any) =>
          !(
            item.questionId === Number.parseInt(questionGroupId) &&
            item.r_questionsID === Number.parseInt(rQuestionId) &&
            item.blankIndex === blankIndex
          ),
      )

      answersArray.push({
        userId: String(user?.id) || "1",
        questionId: Number.parseInt(questionGroupId),
        r_questionsID: Number.parseInt(rQuestionId),
        examId: Number.parseInt(examId),
        question_type: questionType,
        blankIndex: blankIndex,
        answer: answer,
      })

      console.log("[v0] Saved SUMMARY answer:", { blankIndex, answer })
    }
    // Handle SENTENCE_COMPLETION
    else if (questionType === "SENTENCE_COMPLETION") {
      // Remove existing entry for this question
      answersArray = answersArray.filter(
        (item: any) =>
          !(
            item.questionId === Number.parseInt(questionGroupId) &&
            item.r_questionsID === Number.parseInt(rQuestionId) &&
            item.question_type === "SENTENCE_COMPLETION"
          ),
      )
      answersArray.push({
        userId: String(user?.id) || "1",
        questionId: Number.parseInt(questionGroupId),
        r_questionsID: Number.parseInt(rQuestionId),
        examId: Number.parseInt(examId),
        question_type: "SENTENCE_COMPLETION",
        answer: answer,
      })
      console.log("[v0] Saved SENTENCE_COMPLETION answer:", answer)
    }
    // Handle regular questions
    else {
      // Remove existing entry for this question
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

    const confirmed = window.confirm("Are you really sure you want to finish the test?")
    if (!confirmed) return

    setIsSubmitting(true)
    setShowSubmitLoading(true)

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      const answersKey = `answers_${examId}_reading`
      const savedAnswers = localStorage.getItem(answersKey)
      const submissionData = savedAnswers ? JSON.parse(savedAnswers) : []

      // If no saved answers, create from current state
      if (submissionData.length === 0) {
        for (const [key, answer] of Object.entries(answers)) {
          if (answer && answer.toString().trim()) {
            // Handle array type for MCQ_MULTI
            const parts = key.split("_")
            const questionGroupId = parts[0]
            const rQuestionId = parts[1] || parts[0]

            const formattedAnswer = answer

            // Find the question to get its type
            const questionGroup = testData?.questions.find((qg) => qg.id === questionGroupId)
            const question = questionGroup?.r_questions?.find((rq) => rq.id.toString() === rQuestionId)
            const questionType = question?.q_type || "UNKNOWN"

            if (key.includes("_table_")) {
              const rowIndex = parts[parts.length - 2]
              const cellIndex = parts[parts.length - 1]
              const cellPosition = `${rowIndex}_${cellIndex}`

              // Calculate unique r_questionsID for this cell
              let startQuestionNum = 1
              for (const qg of testData?.questions || []) {
                if (qg.id === questionGroupId) {
                  break
                }
                startQuestionNum += qg.r_questions?.length || 0
              }

              let cellsBefore = 0
              if (question?.rows && Array.isArray(question.rows)) {
                for (let r = 0; r < question.rows.length; r++) {
                  if (r < Number.parseInt(rowIndex)) {
                    cellsBefore += question.rows[r].cells?.filter((c: string) => c === "" || c === "_").length || 0
                  } else if (r === Number.parseInt(rowIndex)) {
                    for (let c = 0; c < Number.parseInt(cellIndex); c++) {
                      if (question.rows[r].cells?.[c] === "" || question.rows[r].cells?.[c] === "_") {
                        cellsBefore++
                      }
                    }
                    break
                  }
                }
              } else if (question?.table_structure?.rows) {
                for (let r = 0; r < question.table_structure.rows.length; r++) {
                  if (r < Number.parseInt(rowIndex)) {
                    cellsBefore += Object.values(question.table_structure.rows[r]).filter(
                      (v) => v === "" || v === "_",
                    ).length
                  } else if (r === Number.parseInt(rowIndex)) {
                    const rowValues = Object.values(question.table_structure.rows[r])
                    for (let c = 0; c < Number.parseInt(cellIndex); c++) {
                      if (rowValues[c] === "" || rowValues[c] === "_") {
                        cellsBefore++
                      }
                    }
                    break
                  }
                }
              }

              const uniqueRQuestionId = startQuestionNum + cellsBefore

              // Find existing submission for this r_question and specific cell
              const existingSubmissionIndex = submissionData.findIndex(
                (item: any) => item.r_questionsID === uniqueRQuestionId && item.question_type === "TABLE_COMPLETION",
              )

              if (existingSubmissionIndex !== -1) {
                submissionData[existingSubmissionIndex].answer = formattedAnswer
              } else {
                submissionData.push({
                  userId: String(user.id),
                  questionId: Number.parseInt(questionGroupId),
                  r_questionsID: uniqueRQuestionId,
                  examId: Number.parseInt(examId),
                  question_type: "TABLE_COMPLETION",
                  cellPosition: cellPosition,
                  answer: formattedAnswer,
                })
              }
            } else if (key.includes("_matching_")) {
              const positionIndex = Number.parseInt(parts[1])

              // Find the correct group and question ID for matching headings
              const matchingHeadingsQuestion = testData?.questions
                .flatMap((qg) => qg.r_questions || [])
                .find((q) => q.q_type === "MATCHING_HEADINGS")
              const matchingQuestionGroupId = testData?.questions.find((qg) =>
                qg.r_questions?.some((q) => q.id === matchingHeadingsQuestion?.id),
              )?.id
              const matchingRQuestionId = matchingHeadingsQuestion?.id.toString()

              if (!matchingRQuestionId || !matchingQuestionGroupId) continue

              // Calculate the unique r_questionsID for this specific position in the matching headings
              let startQuestionNum = 1
              for (const qg of testData?.questions || []) {
                if (qg.id === matchingQuestionGroupId) {
                  break
                }
                startQuestionNum += qg.r_questions?.length || 0
              }
              const uniqueRQuestionId = startQuestionNum + positionIndex - 1

              const existingSubmissionIndex = submissionData.findIndex(
                (item: any) => item.r_questionsID === uniqueRQuestionId && item.question_type === "MATCHING_HEADINGS",
              )

              if (existingSubmissionIndex !== -1) {
                submissionData[existingSubmissionIndex].answer = formattedAnswer
              } else {
                submissionData.push({
                  userId: String(user.id),
                  questionId: Number.parseInt(matchingQuestionGroupId),
                  r_questionsID: uniqueRQuestionId,
                  examId: Number.parseInt(examId),
                  question_type: "MATCHING_HEADINGS",
                  answer: formattedAnswer,
                })
              }
            } else if (key.includes("_drop_")) {
              const dropParts = key.split("_drop_")
              const positionNumber = dropParts[1]

              const matchingQuestion = testData?.questions
                .flatMap((qg) => qg.r_questions || [])
                .find((q) => q.q_type === "MATCHING_HEADINGS")

              if (!matchingQuestion) continue

              const matchingRQuestionId = matchingQuestion.id.toString()
              const submissionQuestionGroupId = testData?.questions.find((qg) =>
                qg.r_questions?.some((q) => q.id === matchingQuestion.id),
              )?.id

              // Find if an answer for this specific drop position already exists
              const existingSubmissionIndex = submissionData.findIndex(
                (item: any) =>
                  item.r_questionsID === Number.parseInt(matchingRQuestionId) && item.dropPosition === positionNumber,
              )

              if (existingSubmissionIndex !== -1) {
                submissionData[existingSubmissionIndex].answer = formattedAnswer
              } else {
                submissionData.push({
                  userId: String(user.id),
                  questionId: Number.parseInt(submissionQuestionGroupId || "0"),
                  r_questionsID: Number.parseInt(matchingRQuestionId),
                  examId: Number.parseInt(examId),
                  question_type: "MATCHING_HEADINGS", // Always MATCHING_HEADINGS for drag and drop
                  dropPosition: positionNumber,
                  answer: formattedAnswer,
                })
              }
            } else if (key.includes("_row_")) {
              const rowParts = key.split("_row_")
              const rowIndex = Number.parseInt(rowParts[1])

              const existingSubmissionIndex = submissionData.findIndex(
                (item: any) =>
                  item.questionId === Number.parseInt(questionGroupId) &&
                  item.r_questionsID === Number.parseInt(rQuestionId) &&
                  item.rowIndex === rowIndex,
              )

              if (existingSubmissionIndex !== -1) {
                submissionData[existingSubmissionIndex].answer = formattedAnswer
              } else {
                submissionData.push({
                  userId: String(user.id),
                  questionId: Number.parseInt(questionGroupId),
                  r_questionsID: Number.parseInt(rQuestionId),
                  examId: Number.parseInt(examId),
                  question_type: questionType,
                  rowIndex: rowIndex,
                  answer: formattedAnswer,
                })
              }
            } else if (key.includes("_summary_")) {
              const summaryParts = key.split("_summary_")
              const blankIndex = summaryParts[1]

              const existingSubmissionIndex = submissionData.findIndex(
                (item: any) =>
                  item.questionId === Number.parseInt(questionGroupId) &&
                  item.r_questionsID === Number.parseInt(rQuestionId) &&
                  item.blankIndex === blankIndex,
              )

              if (existingSubmissionIndex !== -1) {
                submissionData[existingSubmissionIndex].answer = formattedAnswer
              } else {
                submissionData.push({
                  userId: String(user.id),
                  questionId: Number.parseInt(questionGroupId),
                  r_questionsID: Number.parseInt(rQuestionId),
                  examId: Number.parseInt(examId),
                  question_type: questionType,
                  blankIndex: blankIndex,
                  answer: formattedAnswer,
                })
              }
            } else if (questionType === "SENTENCE_COMPLETION") {
              const existingSubmissionIndex = submissionData.findIndex(
                (item: any) =>
                  item.questionId === Number.parseInt(questionGroupId) &&
                  item.r_questionsID === Number.parseInt(rQuestionId) &&
                  item.question_type === "SENTENCE_COMPLETION",
              )

              if (existingSubmissionIndex !== -1) {
                submissionData[existingSubmissionIndex].answer = formattedAnswer
              } else {
                submissionData.push({
                  userId: String(user.id),
                  questionId: Number.parseInt(questionGroupId),
                  r_questionsID: Number.parseInt(rQuestionId),
                  examId: Number.parseInt(examId),
                  question_type: "SENTENCE_COMPLETION",
                  answer: formattedAnswer,
                })
              }
            } else {
              // Regular questions
              // Calculate unique r_questionsID for this question
              let startQuestionNum = 1
              for (const qg of testData?.questions || []) {
                if (qg.id === questionGroupId) {
                  break
                }
                startQuestionNum += qg.r_questions?.length || 0
              }
              const questionIndex = questionGroup?.r_questions?.findIndex((rq) => rq.id.toString() === rQuestionId) || 0
              const uniqueRQuestionId = startQuestionNum + questionIndex

              const existingSubmissionIndex = submissionData.findIndex(
                (item: any) =>
                  item.r_questionsID === uniqueRQuestionId &&
                  !item.cellPosition &&
                  !item.rowIndex &&
                  !item.dropPosition &&
                  !item.blankIndex,
              )

              if (existingSubmissionIndex !== -1) {
                submissionData[existingSubmissionIndex].answer = formattedAnswer
              } else {
                submissionData.push({
                  userId: String(user.id),
                  questionId: Number.parseInt(questionGroupId),
                  r_questionsID: uniqueRQuestionId,
                  examId: Number.parseInt(examId),
                  question_type: questionType,
                  answer: formattedAnswer,
                })
              }
            }
          }
        }
      }

      // Process MATCHING_HEADINGS separately
      const matchingHeadingsQuestion = testData?.questions
        .flatMap((qg) => qg.r_questions || [])
        .find((q) => q.q_type === "MATCHING_HEADINGS")

      if (matchingHeadingsQuestion) {
        const matchingQuestionGroupId = testData?.questions.find((qg) =>
          qg.r_questions?.some((q) => q.id === matchingHeadingsQuestion.id),
        )?.id
        const matchingRQuestionId = matchingHeadingsQuestion.id.toString()
        const allMatchingAnswers: Record<string, string> = {}
        let hasAnyMatchingAnswer = false

        // Collect all current matching answers from the 'answers' state
        Object.keys(answers).forEach((key) => {
          if (key.startsWith("matching_")) {
            const posIndex = key.split("_")[1]
            allMatchingAnswers[posIndex] = answers[key] as string
            hasAnyMatchingAnswer = true
          }
        })

        // Only add if there are answers, and ensure it's not already in submissionData
        if (hasAnyMatchingAnswer) {
          // Find the unique r_questionsID for the MATCHING_HEADINGS question
          let startQuestionNum = 1
          for (const qg of testData?.questions || []) {
            if (qg.id === matchingQuestionGroupId) {
              break
            }
            startQuestionNum += qg.r_questions?.length || 0
          }
          const uniqueRQuestionId = startQuestionNum

          const alreadyExists = submissionData.some(
            (item: any) => item.r_questionsID === uniqueRQuestionId && item.question_type === "MATCHING_HEADINGS",
          )
          if (!alreadyExists) {
            submissionData.push({
              userId: String(user.id),
              questionId: Number.parseInt(matchingQuestionGroupId || "0"),
              r_questionsID: uniqueRQuestionId, // Use the calculated unique ID
              examId: Number.parseInt(examId),
              question_type: "MATCHING_HEADINGS",
              answer: allMatchingAnswers, // answers emas, answer
            })
          }
        }
      }

      for (const answerData of submissionData) {
        await fetch(`${API_BASE_URL}/reading-answers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify(answerData),
        })
      }

      localStorage.removeItem(`answers_${examId}_reading`)

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
      })
    }
  }

  const getCurrentPartQuestions = useMemo((): Question[] => {
    if (!testData?.questions) return []
    const partName = `PART${currentPart}`

    const filteredQuestions = testData.questions.filter((question) => {
      if (typeof question.part === "string") {
        return (
          question.part.toUpperCase().replace(/\s+/g, "") === partName ||
          question.part.toUpperCase() === `PART ${currentPart}` ||
          question.part === currentPart.toString()
        )
      }
      return question.part === currentPart
    })

    return filteredQuestions.sort((a, b) => {
      if (a.order && b.order) return a.order - b.order
      return String(a.id).localeCompare(String(b.id))
    })
  }, [testData?.questions, currentPart])

  const getQuestionsForPart = (partNumber: number): Question[] => {
    if (!testData?.questions) return []
    const partName = `PART${partNumber}`
    const filteredQuestions = testData.questions.filter((question) => {
      if (typeof question.part === "string") {
        return (
          question.part.toUpperCase().replace(/\s+/g, "") === partName ||
          question.part.toUpperCase() === `PART ${partNumber}` ||
          question.part === partNumber.toString()
        )
      }
      return question.part === partNumber
    })

    return filteredQuestions.sort((a, b) => {
      if (a.order && b.order) return a.order - b.order
      return String(a.id).localeCompare(String(b.id))
    })
  }

  const getAvailableParts = (): number[] => {
    if (!testData?.questions) return []

    const parts = new Set<string>()
    testData.questions.forEach((question) => {
      if (question.part) {
        parts.add(question.part)
      }
    })

    return Array.from(parts)
      .map((part) => Number.parseInt(part.replace("PART", "")))
      .sort()
  }

  const getCurrentPartPassages = useMemo((): Passage[] => {
    if (!testData?.passages) return []
    const partName = `PART${currentPart}`

    return testData.passages.filter((passage) => {
      if (typeof passage.part === "string") {
        return (
          passage.part.toUpperCase().replace(/\s+/g, "") === partName ||
          passage.part.toUpperCase() === `PART ${currentPart}` ||
          passage.part === currentPart.toString()
        )
      }
      return passage.part === currentPart.toString()
    })
  }, [testData?.passages, currentPart])

  const getPartQuestionCount = (part: number): number => {
    if (!testData?.questions) return 0
    let count = 0
    const partQuestions = testData.questions.filter((q) => {
      if (typeof q.part === "string") {
        return q.part.toUpperCase().replace(/\s+/g, "") === `PART${part}` || q.part === part.toString()
      }
      return q.part === part
    })

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

  const getAnsweredCountForPart = (partNumber: number): number => {
    const partQuestions = getQuestionsForPart(partNumber)
    let answeredCount = 0

    partQuestions.forEach((questionGroup) => {
      if (questionGroup.r_questions) {
        questionGroup.r_questions.forEach((question) => {
          const questionId = `${questionGroup.id}_${question.id}`

          if (question.q_type === "TABLE_COMPLETION") {
            // Check each table input
            if (question.rows && Array.isArray(question.rows)) {
              question.rows.forEach((row, rowIndex) => {
                if (row.cells && Array.isArray(row.cells)) {
                  row.cells.forEach((cell, cellIndex) => {
                    if (cell === "" || cell === "_") {
                      const tableQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                      if (answers[tableQuestionId]) answeredCount++
                    }
                  })
                }
              })
            } else if (question.table_structure?.rows) {
              // Handle table_structure as well
              question.table_structure.rows.forEach((row, rowIndex) => {
                Object.entries(row).forEach(([key, value], cellIndex) => {
                  if (value === "" || value === "_") {
                    const tableQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                    if (answers[tableQuestionId]) answeredCount++
                  }
                })
              })
            }
          } else if (question.q_type === "MCQ_MULTI") {
            // For MCQ_MULTI, check if any options are selected
            const selectedOptions = answers[questionId]
            if (selectedOptions && Array.isArray(selectedOptions) && selectedOptions.length > 0) {
              answeredCount += selectedOptions.length // Count each selected option as answered
            }
          } else if (question.q_type === "MATCHING_INFORMATION") {
            // Check each row
            const rowCount = (question as any).rows?.length || 1
            for (let i = 0; i < rowCount; i++) {
              const rowQuestionId = `${questionId}_row_${i}`
              if (answers[rowQuestionId]) answeredCount++
            }
          } else if (question.q_type === "MATCHING_HEADINGS") {
            // Check each drag position
            const matchingPassage = getCurrentPartPassages.find((p) => p.type === "matching")
            if (matchingPassage) {
              const underscorePattern = /_{2,}/g
              const matches = [...matchingPassage.reading_text.matchAll(underscorePattern)]
              for (let i = 0; i < matches.length; i++) {
                const positionIndex = i + 1
                if (matchingAnswers[questionId]?.[positionIndex]) {
                  answeredCount++
                }
              }
            }
          } else if (question.q_type === "SENTENCE_COMPLETION") {
            const currentAnswer = answers[questionId]
            if (currentAnswer) {
              if (typeof currentAnswer === "string" && currentAnswer.trim() !== "") {
                answeredCount++
              } else if (
                typeof currentAnswer === "object" &&
                Object.values(currentAnswer).some((val) => val.trim() !== "")
              ) {
                answeredCount += Object.values(currentAnswer).filter((val) => val.trim() !== "").length
              }
            }
          } else {
            // Regular question
            if (answers[questionId]) answeredCount++
          }
        })
      }
    })

    return answeredCount
  }

  const getTotalQuestions = () => {
    if (!testData?.questions) return 0
    let total = 0
    testData.questions.forEach((questionGroup) => {
      if (questionGroup.r_questions) {
        questionGroup.r_questions.forEach((question) => {
          if (question.q_type === "MATCHING_HEADINGS") {
            const matchingPassage = getCurrentPartPassages.find((p) => p.type === "matching")
            if (matchingPassage) {
              const underscorePattern = /_{2,}/g
              const matches = [...matchingPassage.reading_text.matchAll(underscorePattern)]
              total += matches.length
            } else {
              total += 1
            }
          } else if (question.q_type === "MCQ_MULTI") {
            total += question.correct_answers?.length || 1
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
            total += inputCount
          } else if (question.q_type === "MATCHING_INFORMATION") {
            total += (question as any).rows?.length || 1
          } else if (question.q_type === "SUMMARY_COMPLETION" || question.q_type === "SUMMARY_DRAG") {
            const blankCount = (question.q_text?.match(/_+/g) || []).length
            total += blankCount > 0 ? blankCount : 1
          } else if (question.q_type === "SENTENCE_COMPLETION") {
            const blankCount = (question.q_text?.match(/_+/g) || []).length
            total += blankCount
          } else {
            total += 1
          }
        })
      }
    })
    return total
  }

  const jumpToQuestion = (questionGroupId: string, questionId: string) => {
    const questionIdentifier = `${questionGroupId}_${questionId}`
    const element = document.getElementById(`question-${questionIdentifier}`)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
      const questionNum = questionNumbers[questionIdentifier]
      if (questionNum) {
        setCurrentQuestionNumber(questionNum)
      }
    }
  }

  // Helper to get the global question number for a specific question ID
  const getGlobalQuestionNumber = (question: RQuestion, blankIndex = 0): string => {
    const questionGroupId = testData?.questions.find((qg) => qg.r_questions?.some((rq) => rq.id === question.id))?.id
    if (!questionGroupId) return "?"

    const questionId = `${questionGroupId}_${question.id}`
    const baseNumber = questionNumbers[questionId]

    if (question.q_type === "SUMMARY_COMPLETION" || question.q_type === "SUMMARY_DRAG") {
      const blanks = question.q_text?.match(/_+/g) || []
      if (blanks.length > 0) {
        return `${baseNumber}.${blankIndex + 1}`
      }
    }
    return baseNumber?.toString() || "?"
  }

  const getQuestionNumber = useMemo(() => {
    if (!testData?.questions) return () => 1

    let questionCounter = 1
    const questionNumbersMap: { [key: string]: number } = {}

    const allQuestions = testData.questions.sort((a, b) => {
      const partA = typeof a.part === "string" ? Number.parseInt(a.part.replace(/\D/g, "")) : a.part
      const partB = typeof b.part === "string" ? Number.parseInt(b.part.replace(/\D/g, "")) : b.part
      if (partA !== partB) return partA - partB
      if (a.order && b.order) return a.order - b.order
      return String(a.id).localeCompare(String(b.id))
    })

    allQuestions.forEach((questionGroup) => {
      if (questionGroup.r_questions && questionGroup.r_questions.length > 0) {
        questionGroup.r_questions.forEach((question) => {
          const questionId = `${questionGroup.id}_${question.id}`

          if (question.q_type === "TABLE_COMPLETION") {
            let inputCount = 0
            if (question.rows && Array.isArray(question.rows)) {
              question.rows.forEach((row, rowIndex) => {
                if (row.cells && Array.isArray(row.cells)) {
                  row.cells.forEach((cell, cellIndex) => {
                    if (cell === "" || cell === "_") {
                      const tableQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                      questionNumbersMap[tableQuestionId] = questionCounter++
                      inputCount++
                    }
                  })
                }
              })
            } else if (question.table_structure?.rows) {
              question.table_structure.rows.forEach((row, rowIndex) => {
                Object.entries(row).forEach(([key, value], cellIndex) => {
                  if (value === "" || value === "_") {
                    const tableQuestionId = `${questionId}_table_${rowIndex}_${cellIndex}`
                    questionNumbersMap[tableQuestionId] = questionCounter++
                    inputCount++
                  }
                })
              })
            }
            if (inputCount > 0) {
              questionNumbersMap[questionId] = questionCounter - inputCount
            }
          } else if (question.q_type === "MCQ_MULTI") {
            const correctAnswersCount = question.correct_answers?.length || 1
            questionNumbersMap[questionId] = questionCounter
            questionCounter += correctAnswersCount
          } else if (question.q_type === "SUMMARY_COMPLETION" || question.q_type === "SUMMARY_DRAG") {
            const blanks = question.q_text?.match(/_+/g) || []
            blanks.forEach((_, blankIndex) => {
              const summaryQuestionId = `${questionId}_summary_${blankIndex}`
              questionNumbersMap[summaryQuestionId] = questionCounter++
            })
            if (blanks.length > 0) {
              questionNumbersMap[questionId] = questionCounter - blanks.length
            }
          } else if (question.q_type === "SENTENCE_COMPLETION") {
            const blanks = question.q_text?.match(/_+/g) || []
            blanks.forEach((_, blankIndex) => {
              const sentenceCompletionId = `${questionId}_${blankIndex}`
              questionNumbersMap[sentenceCompletionId] = questionCounter++
            })
            if (blanks.length > 0) {
              questionNumbersMap[questionId] = questionCounter - blanks.length
            }
          } else if (question.q_type === "MATCHING_INFORMATION") {
            const rowCount = (question as any).rows?.length || 1
            questionNumbersMap[questionId] = questionCounter
            questionCounter += rowCount
          } else if (question.q_type === "MATCHING_HEADINGS") {
            const matchingPassage = testData.passages?.find((p) => p.type === "matching")
            if (matchingPassage) {
              const underscorePattern = /_{2,}/g
              const matches = [...matchingPassage.reading_text.matchAll(underscorePattern)]
              questionNumbersMap[questionId] = questionCounter
              questionCounter += matches.length
            } else {
              questionNumbersMap[questionId] = questionCounter++
            }
          } else {
            questionNumbersMap[questionId] = questionCounter++
          }
        })
      }
    })

    return (questionIdentifier: string) => questionNumbersMap[questionIdentifier] || 1
  }, [testData?.questions, testData?.passages])

  const isQuestionAnswered = (questionNumber: number) => {
    return Object.values(answers).some((answer) => answer.includes(questionNumber.toString()))
  }

  useEffect(() => {
    // Ensure consistent white background and black text
    const root = document.documentElement
    root.style.setProperty("--background-color", "#ffffff")
    root.style.setProperty("--text-color", "#000000")
    root.style.setProperty("--bg-color", "#ffffff")
  }, [])

  const increaseTextSize = () => {
    setTextSize((prev) => Math.min(prev + 2, 24))
  }

  const decreaseTextSize = () => {
    setTextSize((prev) => Math.max(prev - 2, 12))
  }

  useEffect(() => {
    if (timeRemaining !== null) {
      setTimeLeft(timeRemaining)
    }
  }, [timeRemaining])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !mainContentContainerRef.current) return

      const container = mainContentContainerRef.current
      const containerRect = container.getBoundingClientRect()
      const newWidth = (e.clientX - containerRect.left) / containerRect.width

      // Constrain between 20% and 80%
      const constrainedWidth = Math.max(0.2, Math.min(0.8, newWidth))
      setPassageWidth(constrainedWidth)
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const questionId = entry.target.id.replace("question-", "")
            const questionNum = questionNumbers[questionId]
            if (questionNum) {
              setCurrentQuestionNumber(questionNum)
            }
          }
        })
      },
      { threshold: 0.5, rootMargin: "-20% 0px -20% 0px" },
    )

    // Observe all question elements
    Object.keys(questionNumbers).forEach((questionId) => {
      const element = document.getElementById(`question-${questionId}`)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [questionNumbers])

  const switchToPart = (partNumber: number) => {
    setCurrentPart(partNumber)
    const root = document.documentElement
    root.style.setProperty("--background-color", "#ffffff")
    root.style.setProperty("--text-color", "#000000")

    // Scroll to top of questions when switching parts
    const questionsContainer = document.querySelector(".questions-container")
    if (questionsContainer) {
      questionsContainer.scrollTop = 0
    }
  }

  const applyContrastMode = (mode: "default" | "white-on-black" | "yellow-on-black") => {
    const root = document.documentElement
    switch (mode) {
      case "white-on-black":
        root.style.setProperty("--background-color", "#000000")
        root.style.setProperty("--text-color", "#ffffff")
        root.style.setProperty("--bg-color", "#000000")
        break
      case "yellow-on-black":
        root.style.setProperty("--background-color", "#000000")
        root.style.setProperty("--text-color", "#ffff00")
        root.style.setProperty("--bg-color", "#000000")
        break
      default:
        root.style.setProperty("--background-color", "#ffffff")
        root.style.setProperty("--text-color", "#000000")
        root.style.setProperty("--bg-color", "#ffffff")
        break
    }
  }

  useEffect(() => {
    applyContrastMode(contrastMode)
  }, [contrastMode])

  const getMatchingHeadingsChoices = (questionId: string) => {
    const [groupId, qId] = questionId.split("_").map(Number)
    const currentQuestions = getCurrentPartQuestions
    const matchingQuestion = currentQuestions.find((qg) => qg.id === groupId)

    if (!matchingQuestion) return null

    const question = matchingQuestion.r_questions?.find((q) => q.id === qId && q.q_type === "MATCHING_HEADINGS")
    return question?.choices || null
  }

  const parseMatchingPassage = (text: string, questionId: string): React.ReactNode => {
    const underscorePattern = /_{2,}/g
    const parts = text.split(underscorePattern)
    const matches = [...text.matchAll(underscorePattern)]

    if (matches.length === 0) {
      return <div className="text-gray-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: text }} />
    }

    // Get the starting question number for this MATCHING_HEADINGS question
    const startQuestionNum = getQuestionNumber(questionId)

    return (
      <div className="text-gray-900 leading-relaxed space-y-2">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <span dangerouslySetInnerHTML={{ __html: part }} />
            {index < matches.length && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggedOption) {
                    const positionIndex = index + 1
                    const matchingKey = `matching_${positionIndex}`

                    // Update matchingAnswers state
                    setMatchingAnswers((prev) => ({
                      ...prev,
                      [questionId]: {
                        ...(prev[questionId] || {}),
                        [positionIndex]: draggedOption.key,
                      },
                    }))

                    // Save to localStorage with proper format
                    handleAnswerChange(matchingKey, draggedOption.key)
                  }
                }}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  if (draggedOption) {
                    const positionIndex = index + 1
                    const matchingKey = `matching_${positionIndex}`

                    setMatchingAnswers((prev) => ({
                      ...prev,
                      [questionId]: {
                        ...(prev[questionId] || {}),
                        [positionIndex]: draggedOption.key,
                      },
                    }))

                    handleAnswerChange(matchingKey, draggedOption.key)
                    setDraggedOption(null)
                  }
                }}
                className="inline-flex items-center gap-2 mx-1 px-3 py-1 border-2 border-dashed border-gray-400 bg-gray-100 rounded min-w-[100px] cursor-pointer hover:bg-gray-200 transition-colors"
              >
                <span className="bg-gray-700 text-white px-2 py-0.5 rounded text-xs font-bold">
                  {startQuestionNum + index}
                </span>
                {matchingAnswers[questionId]?.[index + 1] ? (
                  <span className={`font-medium text-sm ${contrast === "high" ? "text-white" : "text-gray-900"}`}>
                    {matchingAnswers[questionId][index + 1]}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">Drop here</span>
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

    // Check if current part has a matching type passage
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

  // Helper function to render questions for a given part
  const renderQuestions = (partNumber: number) => {
    const partQuestions = getQuestionsForPart(partNumber)
    return partQuestions.map((questionGroup) => (
      <div
        key={questionGroup.id}
        className={`space-y-6 p-6 border rounded-lg ${contrast === "high" ? "bg-black border-gray-700" : "bg-white border-gray-200"}`}
      >
        {(questionGroup.title || questionGroup.instruction) && (
          <div
            className={`p-4 rounded-lg border ${contrast === "high" ? "bg-gray-900 border-gray-700" : "bg-gray-100 border-gray-300"}`}
          >
            {questionGroup.title && (
              <h3 className={`text-xl font-bold mb-3 ${contrast === "high" ? "text-white" : "text-gray-900"}`}>
                {questionGroup.title}
              </h3>
            )}
            {questionGroup.instruction && (
              <div className={`text-base leading-relaxed ${contrast === "high" ? "text-gray-300" : "text-gray-700"}`}>
                {questionGroup.instruction}
              </div>
            )}
          </div>
        )}

        {questionGroup.r_questions?.map((question) => {
          const questionId = `${questionGroup.id}_${question.id}`
          const currentAnswer = answers[questionId]

          return (
            <div key={question.id} id={`question-${questionGroup.id}_${question.id}`} className="space-y-4">
              {question.q_type !== "MCQ_MULTI" && question.q_type !== "MATCHING_HEADINGS" && (
                <div
                  className={`text-lg font-semibold mb-4 ${contrast === "high" ? "text-gray-400" : "text-gray-700"}`}
                >
                  Question {getQuestionNumber(`${questionGroup.id}_${question.id}`)}
                </div>
              )}

              {question.q_type !== "SENTENCE_COMPLETION" && (
                <div className={`text-lg mb-6 ${contrast === "high" ? "text-white" : "text-gray-900"}`}>
                  {question.q_text}
                </div>
              )}

              {/* TFNG and TRUE_FALSE_NOT_GIVEN - Question with options, select one */}
              {(question.q_type === "TFNG" || question.q_type === "TRUE_FALSE_NOT_GIVEN") && (
                <div className="space-y-3">
                  <RadioGroup
                    value={currentAnswer || ""}
                    onValueChange={(value) => handleAnswerChange(questionId, value)}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="TRUE" id={`q${question.id}-true`} />
                      <Label
                        htmlFor={`q${question.id}-true`}
                        className={`cursor-pointer text-base ${contrast === "high" ? "text-white" : "text-black"}`}
                      >
                        TRUE
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="FALSE" id={`q${question.id}-false`} />
                      <Label
                        htmlFor={`q${question.id}-false`}
                        className={`cursor-pointer text-base ${contrast === "high" ? "text-white" : "text-black"}`}
                      >
                        FALSE
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="NOT_GIVEN" id={`q${question.id}-ng`} />
                      <Label
                        htmlFor={`q${question.id}-ng`}
                        className={`cursor-pointer text-base ${contrast === "high" ? "text-white" : "text-black"}`}
                      >
                        NOT GIVEN
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* MCQ_SINGLE - Question with options, select one */}
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
                          className={`cursor-pointer text-base ${contrast === "high" ? "text-white" : "text-black"}`}
                        >
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* MCQ_MULTI - Question with options, select multiple */}
              {question.q_type === "MCQ_MULTI" && question.options && (
                <div className="space-y-3">
                  <div
                    className={`text-lg font-semibold mb-4 ${contrast === "high" ? "text-gray-400" : "text-gray-700"}`}
                  >
                    {(() => {
                      const startNum = getQuestionNumber(`${questionGroup.id}_${question.id}`)
                      const correctCount = question.correct_answers?.length || 1
                      const endNum = startNum + correctCount - 1
                      return correctCount > 1 ? `Questions ${startNum}-${endNum}` : `Question ${startNum}`
                    })()}
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
                          className={`flex-1 cursor-pointer ${contrast === "high" ? "text-white" : "text-gray-900"}`}
                        >
                          {option.text}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SENTENCE_COMPLETION - Updated to support multiple underscores with multiple inputs inline */}
              {question.q_type === "SENTENCE_COMPLETION" && (
                <div className="space-y-4">
                  <div className={`text-lg font-medium ${contrast === "high" ? "text-white" : "text-black"}`}>
                    {(() => {
                      const text = question.q_text || ""
                      if (text.includes("_")) {
                        // Split by one or more underscores
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
                                        // Multiple blanks - store as object
                                        const newAnswer = {
                                          ...(typeof currentAnswer === "object" && currentAnswer !== null
                                            ? currentAnswer
                                            : {}),
                                          [index.toString()]: e.target.value,
                                        }
                                        handleAnswerChange(questionId, newAnswer)
                                      } else {
                                        // Single blank - store as string
                                        handleAnswerChange(questionId, e.target.value)
                                      }
                                    }}
                                    placeholder="Your answer"
                                    className={`inline-block w-48 mx-1 px-2 py-1 text-base ${
                                      contrast === "high"
                                        ? "bg-black border-gray-700 focus:border-gray-500"
                                        : "bg-white border-gray-300 focus:border-gray-500"
                                    }`}
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
                <div
                  className={`mt-4 p-4 rounded-lg border ${contrast === "high" ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"}`}
                >
                  <h4 className={`font-semibold mb-3 ${contrast === "high" ? "text-white" : "text-gray-900"}`}></h4>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(question.choices).map(([key, text]) => (
                      <div
                        key={key}
                        draggable
                        onDragStart={() => setDraggedOption({ key, text: text as string })}
                        onDragEnd={() => setDraggedOption(null)}
                        onTouchStart={() => setDraggedOption({ key, text: text as string })}
                        className={`flex items-center gap-2 p-3 border rounded cursor-move transition-colors touch-none ${
                          contrast === "high"
                            ? "bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-blue-500"
                            : "bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400"
                        }`}
                      >
                        <span className={`font-bold ${contrast === "high" ? "text-blue-400" : "text-blue-600"}`}>
                          {key}
                        </span>
                        <span className={contrast === "high" ? "text-white" : "text-gray-900"}>{text as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TABLE_COMPLETION - Create table with inputs for empty cells */}
              {question.q_type === "TABLE_COMPLETION" && (question.columns || question.table_structure) && (
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table
                      className={`w-full border text-base ${contrast === "high" ? "border-gray-700" : "border-gray-300"}`}
                    >
                      <thead>
                        <tr className={`${contrast === "high" ? "bg-gray-800" : "bg-gray-50"}`}>
                          <th
                            className={`border p-3 text-left font-semibold ${contrast === "high" ? "text-white border-gray-700" : "text-black border-gray-300"}`}
                          >
                            Species
                          </th>
                          {(question.columns || question.table_structure?.headers || []).map((header, index) => (
                            <th
                              key={index}
                              className={`border p-3 text-left font-semibold ${contrast === "high" ? "text-white border-gray-700" : "text-black border-gray-300"}`}
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
                                  className={`border p-3 font-medium ${contrast === "high" ? "bg-gray-900 text-white border-gray-700" : "bg-gray-50 text-black border-gray-300"}`}
                                >
                                  {row.label || ""}
                                </td>
                                {(row.cells && Array.isArray(row.cells) ? row.cells : []).map((cell, cellIndex) => (
                                  <td
                                    key={cellIndex}
                                    className={`border p-3 ${contrast === "high" ? "border-gray-700" : "border-gray-300"}`}
                                  >
                                    {cell === "" || cell === "_" ? (
                                      <div className="flex items-center gap-2">
                                        <span className="bg-gray-700 text-white px-1 py-0.5 rounded text-xs font-medium">
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
                                          className={`w-full text-xs ${contrast === "high" ? "bg-black border-gray-700 focus:border-gray-500" : "bg-white border-gray-300 focus:border-gray-500"}`}
                                          placeholder="Answer"
                                        />
                                      </div>
                                    ) : (
                                      <span className={`${contrast === "high" ? "text-white" : "text-black"}`}>
                                        {cell}
                                      </span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))
                          : question.table_structure?.rows?.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {/* Assuming the first column is always a label for the row */}
                                <td
                                  className={`border p-3 font-medium ${contrast === "high" ? "bg-gray-900 text-white border-gray-700" : "bg-gray-50 text-black border-gray-300"}`}
                                >
                                  {Object.values(row)[0]}
                                </td>
                                {/* Iterate over remaining cells */}
                                {Object.entries(row)
                                  .slice(1)
                                  .map(([key, value], cellIndex) => (
                                    <td
                                      key={cellIndex}
                                      className={`border p-3 ${contrast === "high" ? "border-gray-700" : "border-gray-300"}`}
                                    >
                                      {value === "" || value === "_" ? (
                                        <div className="flex items-center gap-2">
                                          <span className="bg-gray-700 text-white px-1 py-0.5 rounded text-xs font-medium">
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
                                            className={`w-full text-xs ${contrast === "high" ? "bg-black border-gray-700 focus:border-gray-500" : "bg-white border-gray-300 focus:border-gray-500"}`}
                                            placeholder="Answer"
                                          />
                                        </div>
                                      ) : (
                                        <span className={`${contrast === "high" ? "text-white" : "text-black"}`}>
                                          {value}
                                        </span>
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

              {/* SENTENCE_ENDINGS - Questions with drag areas below each sentence */}
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
                      className={`border-2 border-dashed border-gray-400 bg-gray-50 p-3 rounded-lg min-h-[40px] flex items-center transition-colors ${contrast === "high" ? "bg-gray-800" : ""}`}
                    >
                      {currentAnswer ? (
                        <span className={`font-medium ${contrast === "high" ? "text-white" : "text-gray-900"}`}>
                          {currentAnswer}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Drag an option here</span>
                      )}
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <p className={`text-xs text-gray-600 mb-2 ${contrast === "high" ? "text-gray-300" : ""}`}>
                      Choose from:
                    </p>
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
                              : contrast === "high"
                                ? "text-white border-gray-700 hover:bg-gray-800"
                                : "bg-white text-black border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <span className="font-medium">{option.key}</span> {option.text}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MATCHING_INFORMATION - Table format with questions and choices */}
              {question.q_type === "MATCHING_INFORMATION" && (
                <div className="space-y-6">
                  {/* Main matching table */}
                  <div className="overflow-x-auto">
                    <table
                      className={`w-full border text-base ${contrast === "high" ? "border-gray-700" : "border-gray-300"}`}
                    >
                      <thead>
                        <tr className={`${contrast === "high" ? "bg-gray-800" : "bg-gray-50"}`}>
                          <th
                            className={`border p-3 text-left font-semibold ${contrast === "high" ? "text-white border-gray-700" : "text-black border-gray-300"}`}
                          >
                            Questions {getQuestionNumber(`${questionGroup.id}_${question.id}`)}–
                            {getQuestionNumber(`${questionGroup.id}_${question.id}`) +
                              ((question as any).rows?.length || 1) -
                              1}
                          </th>
                          {(question as any).choices &&
                            Object.keys((question as any).choices).map((choiceKey) => (
                              <th
                                key={choiceKey}
                                className={`border p-3 text-center font-semibold w-16 ${contrast === "high" ? "text-white border-gray-700" : "text-black border-gray-300"}`}
                              >
                                {choiceKey}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(question as any).rows?.map((rowText: string, index: number) => (
                          <tr key={index}>
                            <td
                              className={`border p-3 ${contrast === "high" ? "border-gray-700 text-white" : "border-gray-300 text-black"}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium">
                                  {getQuestionNumber(`${questionGroup.id}_${question.id}`) + index}
                                </span>
                                <span className="font-medium">{rowText}</span>
                              </div>
                            </td>
                            {(question as any).choices &&
                              Object.keys((question as any).choices).map((choiceKey) => (
                                <td
                                  key={choiceKey}
                                  className={`border p-3 text-center ${contrast === "high" ? "border-gray-700" : "border-gray-300"}`}
                                >
                                  <input
                                    type="radio"
                                    name={`matching_${questionId}_${index}`}
                                    value={choiceKey}
                                    checked={answers[`${questionId}_row_${index}`] === choiceKey}
                                    onChange={(e) => handleAnswerChange(`${questionId}_row_${index}`, e.target.value)}
                                    className="w-4 h-4"
                                  />
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6">
                    <h5 className={`font-semibold mb-3 ${contrast === "high" ? "text-white" : "text-black"}`}>
                      {question.q_text || "Choices:"}
                    </h5>
                    <div className="overflow-x-auto">
                      <table
                        className={`w-full border text-base ${contrast === "high" ? "border-gray-700" : "border-gray-300"}`}
                      >
                        <tbody>
                          {(question as any).choices &&
                            Object.entries((question as any).choices).map(([key, text]) => (
                              <tr key={key}>
                                <td
                                  className={`border p-3 w-16 text-center font-semibold ${contrast === "high" ? "bg-gray-800 text-white border-gray-700" : "bg-gray-50 text-black border-gray-300"}`}
                                >
                                  {key}
                                </td>
                                <td
                                  className={`border p-3 ${contrast === "high" ? "border-gray-700 text-white" : "border-gray-300 text-black"}`}
                                >
                                  {text}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">Choose the correct group for each item.</p>
                </div>
              )}
            </div>
          )
        })}

        {/* SUMMARY_COMPLETION - Display all questions as continuous flowing text */}
        {(() => {
          const summaryQuestions = questionGroup.r_questions?.filter((q) => q.q_type === "SUMMARY_COMPLETION") || []
          if (summaryQuestions.length === 0) return null

          const processText = (text: string, questionId: string, blankIndex: number) => {
            if (text.includes("_")) {
              const parts = text.split(/_+/)
              return (
                <span>
                  {parts[0]}
                  <Input
                    value={answers[`${questionId}_summary_${blankIndex}`] || ""}
                    onChange={(e) => handleAnswerChange(`${questionId}_summary_${blankIndex}`, e.target.value)}
                    className={`inline-block w-24 mx-1 px-2 py-1 text-xs ${contrast === "high" ? "bg-black border-gray-700 focus:border-gray-500" : "bg-white border-gray-300 focus:border-gray-500"}`}
                    placeholder={getQuestionNumber(`${questionId}_summary_${blankIndex}`).toString()}
                  />
                  {parts[1] || ""}
                </span>
              )
            }
            return text
          }

          return (
            <div
              className={`mb-6 p-6 rounded-lg border ${contrast === "high" ? "bg-black border-gray-700" : "bg-white border-gray-200"}`}
            >
              <h4 className={`font-semibold text-lg ${contrast === "high" ? "text-white" : "text-black"} mb-4`}>
                Summary
              </h4>
              <div className={`text-base leading-relaxed ${contrast === "high" ? "text-white" : "text-black"}`}>
                {summaryQuestions.map((question, index) => {
                  const questionId = `${questionGroup.id}_${question.id}`
                  const blanks = question.q_text?.match(/_+/g) || []
                  return (
                    <span key={question.id}>
                      {blanks.map((_, blankIndex) => (
                        <React.Fragment key={blankIndex}>
                          {processText(question.q_text, questionId, blankIndex)}
                          {blankIndex < blanks.length - 1 && " "}
                        </React.Fragment>
                      ))}
                      {index < summaryQuestions.length - 1 && " "}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* SUMMARY_DRAG - Display all questions with drag and drop */}
        {(() => {
          const summaryDragQuestions = questionGroup.r_questions?.filter((q) => q.q_type === "SUMMARY_DRAG") || []
          if (summaryDragQuestions.length === 0) return null

          // Collect all unique options from all SUMMARY_DRAG questions
          const allOptions = Array.from(
            new Map(summaryDragQuestions.flatMap((q) => q.options?.map((opt) => [opt.key, opt]) || [])).values(),
          )

          return (
            <div
              className={`mb-6 p-6 rounded-lg border ${contrast === "high" ? "bg-black border-gray-700" : "bg-white border-gray-200"}`}
            >
              <h4 className={`font-semibold text-lg ${contrast === "high" ? "text-white" : "text-black"} mb-4`}>
                Summary - Drag and Drop
              </h4>
              <div className="space-y-4">
                {summaryDragQuestions.map((question, index) => {
                  const questionId = `${questionGroup.id}_${question.id}`
                  const currentAnswer = answers[questionId]

                  const renderQuestionWithDrag = (text: string) => {
                    const parts = text.split(/_{1,}/)
                    if (parts.length === 1) {
                      // No underscore found, show drag area below
                      return (
                        <div className="space-y-3">
                          <p className={`text-base font-medium ${contrast === "high" ? "text-white" : "text-black"}`}>
                            {text}
                          </p>
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
                            className={`border-2 border-dashed border-gray-400 bg-gray-50 p-3 rounded-lg min-h-[40px] flex items-center transition-colors ${contrast === "high" ? "bg-gray-800" : ""}`}
                          >
                            {currentAnswer ? (
                              <span className={`font-medium ${contrast === "high" ? "text-white" : "text-gray-900"}`}>
                                {currentAnswer}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">Drag an option here</span>
                            )}
                          </div>
                        </div>
                      )
                    }

                    // Underscore found, position drag area inline
                    return (
                      <div className="space-y-3">
                        <div
                          className={`text-base font-medium flex items-center flex-wrap gap-2 ${contrast === "high" ? "text-white" : "text-black"}`}
                        >
                          {parts.map((part, partIndex) => (
                            <React.Fragment key={partIndex}>
                              <span>{part}</span>
                              {partIndex < parts.length - 1 && (
                                <div
                                  onDragOver={(e) => {
                                    e.preventDefault()
                                    e.currentTarget.classList.add("border-blue-500", "bg-blue-100")
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.classList.remove("border-blue-500", "bg-blue-100")
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault()
                                    e.currentTarget.classList.remove("border-blue-500", "bg-blue-100")
                                    if (draggedOption) {
                                      handleAnswerChange(questionId, draggedOption.key)
                                      setDraggedOption(null)
                                    }
                                  }}
                                  className={`inline-flex border-2 border-dashed border-gray-400 bg-gray-100 px-3 py-1 rounded min-w-[120px] items-center justify-center transition-colors ${contrast === "high" ? "bg-gray-800" : ""}`}
                                >
                                  {currentAnswer ? (
                                    <span className="text-gray-900 font-medium text-sm">{currentAnswer}</span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Drop here</span>
                                  )}
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={question.id} className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium">
                          {getQuestionNumber(`${questionGroup.id}_${question.id}`)}
                        </span>
                      </div>
                      <div className="flex-1">{renderQuestionWithDrag(question.q_text)}</div>
                    </div>
                  )
                })}
              </div>

              {/* All options displayed at the bottom */}
              {allOptions.length > 0 && (
                <div className="mt-6">
                  <p className={`text-xs text-gray-600 mb-3 ${contrast === "high" ? "text-gray-300" : ""}`}>
                    Drag options to the blanks above:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {allOptions.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        draggable
                        onDragStart={() => setDraggedOption({ key: option.key, text: option.text })}
                        onDragEnd={() => setDraggedOption(null)}
                        className={`flex items-center gap-2 p-3 border rounded cursor-move transition-colors ${
                          draggedOption?.key === option.key
                            ? "opacity-50"
                            : contrast === "high"
                              ? "bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-blue-500"
                              : "bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400"
                        }`}
                      >
                        <span className={`font-bold ${contrast === "high" ? "text-blue-400" : "text-blue-600"}`}>
                          {option.key}
                        </span>
                        <span className={contrast === "high" ? "text-white" : "text-gray-900"}>{option.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-3">Drag the correct options to complete the summary.</p>
            </div>
          )
        })()}
      </div>
    ))
  }

  // Helper to get the current part for a given question group ID
  const getCurrentPartForQuestion = (questionGroupId: string): number => {
    const questionGroup = testData?.questions.find((qg) => qg.id === questionGroupId)
    if (!questionGroup || !questionGroup.part) return 1
    return typeof questionGroup.part === "string"
      ? Number.parseInt(questionGroup.part.replace("PART", ""))
      : questionGroup.part
  }

  // Helper to scroll to a specific question
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
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-red-600 font-bold text-2xl">IELTS</div>
            <div className="text-lg font-medium text-gray-800">Test taker ID</div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-lg font-mono text-gray-800">
              {timeRemaining !== null && (
                <span>
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
                </span>
              )}
            </div>

            {/* WiFi Icon */}
            <div className="text-gray-700">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.24 0 1 1 0 01-1.415-1.415 5 5 0 017.07 0 1 1 0 01-1.415 1.415zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* Notification Bell */}
            <div className="text-gray-700">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>

            {/* Three dots menu */}
            <div className="relative">
              <button
                onClick={() => setShowOptionsModal(!showOptionsModal)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex pb-24" ref={mainContentContainerRef}>
        {/* Left Panel - Reading Passage */}
        <div
          className="bg-gray-50 border-r border-gray-200 overflow-y-auto"
          style={{ width: `${passageWidth * 100}%` }}
        >
          <div className="p-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Part {currentPart}</h2>
                <p className="text-gray-600">
                  Read the text and answer questions {(() => {
                    const range = getPartQuestionRange(currentPart)
                    return `${range.start}–${range.end}`
                  })()}.
                </p>
              </div>

              <div className={`prose max-w-none ${contrast === "high" ? "prose-invert" : ""}`}>
                {getCurrentPartPassages && getCurrentPartPassages.length > 0 ? (
                  getCurrentPartPassages.map((passage) => (
                    <div key={passage.id} className="mb-6">
                      {passage.type === "matching" ? (
                        parseMatchingPassage(passage.reading_text, getMatchingQuestionId() || "")
                      ) : (
                        <div
                          className="text-gray-900 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: passage.reading_text }}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  // Fallback to old structure if passages array is not available
                  <>
                    {testData?.passage_text && (
                      <div
                        className="text-gray-900 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: testData.passage_text }}
                      />
                    )}
                    {testData?.reading_text && (
                      <div
                        className="text-gray-900 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: testData.reading_text }}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resizer */}
        <div
          className="w-1 bg-gray-300 cursor-col-resize hover:bg-gray-400 transition-colors"
          onMouseDown={handleMouseDown}
        />

        {/* Right Panel - Questions */}
        <div className="bg-white overflow-y-auto questions-container" style={{ width: `${(1 - passageWidth) * 100}%` }}>
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Questions {(() => {
                  const range = getPartQuestionRange(currentPart)
                  return `${range.start}–${range.end}`
                })()}
              </h3>
            </div>

            <div className="space-y-6">{renderQuestions(currentPart)}</div>

            {/* MATCHING_HEADINGS choices moved to question section */}
            {/* <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Drag options to the passage:</h4>
              <div className="grid grid-cols-1 gap-2">
                {getMatchingHeadingsOptions()?.map((option, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => setDraggedOption(option)}
                    onDragEnd={() => setDraggedOption(null)}
                    onTouchStart={() => setDraggedOption(option)}
                    className="flex items-center gap-2 p-3 bg-white border border-gray-300 rounded cursor-move hover:bg-blue-50 hover:border-blue-400 transition-colors touch-none"
                  >
                    <span className="font-bold text-blue-600">{option.key}</span>
                    <span className="text-gray-900">{option.text}</span>
                  </div>
                ))}
              </div>
            </div> */}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Left side - Navigation arrows */}
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

          {/* Center - Parts navigation with question counts */}
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

            {/* Question numbers for current part */}
            <div className="flex items-center space-x-1 flex-wrap max-w-md">
              {(() => {
                const partQuestions = getQuestionsForPart(currentPart)
                const questionButtons: React.ReactElement[] = []

                partQuestions.forEach((questionGroup) => {
                  questionGroup.r_questions?.forEach((question) => {
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
                      const isAnswered = Array.isArray(answers[questionId]) && answers[questionId].length > 0

                      for (let i = 0; i < correctCount; i++) {
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
                        // Handle table_structure
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

          {/* Right side - Submit button */}
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

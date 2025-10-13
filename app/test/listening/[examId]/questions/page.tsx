"use client"

import { useEffect, useState, useRef } from "react"
import type { ReactElement } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Timer } from "@/components/timer"
import { markSectionCompleted } from "../../../../../lib/test-strotage"
import { Volume2, VolumeX } from "lucide-react"
import { useCustomAlert } from "../../../../../components/custom-allert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import React from "react" // Import React for Fragment

interface LQuestion {
  id: number
  listening_questions_id: number
  q_type: string
  q_text: string
  options?: any
  correct_answers?: string | string[]
  columns?: any
  rows?: any
  choices?: any
  answers?: any
  match_pairs?: any
  photo?: string | null
  createdAt: string
  updatedAt: string
}

interface Question {
  id: string
  listening_id: string
  title: string
  instruction: string
  photo?: string
  part: string
  audio?: string | null
  created_at: string
  l_questions: LQuestion[]
}

interface ListeningTestData {
  id: string
  exam_id: number
  title: string
  description: string
  audio_url: string
  created_at: string
  questions: Question[]
}

export default function ListeningTestPage() {
  const params = useParams()
  const router = useRouter()
  const [testData, setTestData] = useState<ListeningTestData | null>(null)
  const [currentPart, setCurrentPart] = useState(1)
  const [expandedPart, setExpandedPart] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [timeRemaining, setTimeRemaining] = useState<number>(120) // Always show 2:00 initially
  const [timerActive, setTimerActive] = useState(false) // Don't start timer until audio ends
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitLoading, setShowSubmitLoading] = useState(false)
  const [showAudioWarning, setShowAudioWarning] = useState(true)
  const [audioStarted, setAudioStarted] = useState(false)
  const [audioEnded, setAudioEnded] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [volume, setVolume] = useState([70])
  const [timerExpired, setTimerExpired] = useState(false)
  const [audioDuration, setAudioDuration] = useState<number>(0)
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0)

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

  const [userId, setUserId] = useState<string>("1")

  const { showAlert, AlertComponent } = useCustomAlert()
  const audioRef = useRef<HTMLAudioElement>(null)
  const questionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  const examId = params.examId as string

  useEffect(() => {
    setUserId(getUserId())
    fetchTestData()
  }, [examId])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      setAudioCurrentTime(audio.currentTime)
    }

    const updateDuration = () => {
      setAudioDuration(audio.duration)
    }

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", updateDuration)
    audio.addEventListener("durationchange", updateDuration)

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", updateDuration)
      audio.removeEventListener("durationchange", updateDuration)
    }
  }, [])

  const startAudioTest = () => {
    setShowAudioWarning(false)
    setAudioStarted(true)
    setTimeRemaining(120)
    setTimerActive(false) // Timer stays paused until audio ends

    if (audioRef.current) {
      audioRef.current.play()
      setAudioPlaying(true)
    }
  }

  const fetchTestData = async () => {
    try {
      setIsLoading(true)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
      const response = await fetch(`${API_BASE_URL}/listening/${examId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch test data")
      }

      const data = await response.json()
      setTestData(data)
    } catch (error) {
      console.error("Failed to fetch listening test data:", error)
      showAlert({
        title: "Error Loading Test",
        description: "Failed to load test data from server. Please try again.",
        type: "error",
        confirmText: "Retry",
        showCancel: false,
        onConfirm: () => fetchTestData(),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getQuestionCount = (question: LQuestion): number => {
    if (question.q_type === "TABLE_COMPLETION") {
      let inputCount = 0
      if (question.rows && Array.isArray(question.rows)) {
        question.rows.forEach((row: any) => {
          if (row.cells && Array.isArray(row.cells)) {
            row.cells.forEach((cell: any) => {
              if (cell === "" || cell === "_") {
                inputCount++
              }
            })
          }
        })
      }
      return inputCount > 0 ? inputCount : 1
    } else if (question.q_type === "MCQ_MULTI") {
      const correctAnswersCount = Array.isArray(question.correct_answers) ? question.correct_answers.length : 1
      return correctAnswersCount
    } else if (question.q_type === "MAP_LABELING") {
      if (question.rows) {
        try {
          let rowsData: any
          if (typeof question.rows === "object") {
            rowsData = question.rows
          } else if (typeof question.rows === "string") {
            // Check if string looks like valid JSON before parsing
            const trimmed = question.rows.trim()
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
              rowsData = JSON.parse(trimmed)
            } else {
              console.error("[v0] Invalid JSON format in MAP_LABELING rows:", question.rows)
              return 1
            }
          } else {
            return 1
          }
          return Object.keys(rowsData).length
        } catch (error) {
          console.error("[v0] Failed to parse MAP_LABELING rows:", error)
          console.error("[v0] Problematic rows data:", question.rows)
          return 1
        }
      }
      return 1
    } else if (question.q_type === "FLOW_CHART") {
      if (question.choices && typeof question.choices === "object") {
        let blankCount = 0
        Object.values(question.choices).forEach((text: any) => {
          if (typeof text === "string" && text.includes("__")) {
            blankCount++
          }
        })
        return blankCount > 0 ? blankCount : 1
      }
      return 1
    } else if (question.q_type === "MATCHING_INFORMATION") {
      return question.rows?.length || 1
    } else if (question.q_type === "NOTE_COMPLETION") {
      // Count underscores in the options text
      if (question.options) {
        const optionsText = typeof question.options === "string" ? question.options : JSON.stringify(question.options)
        const underscoreMatches = optionsText.match(/____+/g)
        return underscoreMatches ? underscoreMatches.length : 1
      }
      return 1
    } else {
      return 1
    }
  }

  const getGlobalQuestionNumber = (questionId: number): number => {
    const allQuestions = getAllQuestions()
    let counter = 1

    for (const q of allQuestions) {
      if (q.id === questionId) {
        return counter
      }
      counter += getQuestionCount(q)
    }

    return counter
  }

  const getQuestionNumber = (questionId: string | number): number => {
    const allQuestions = getAllQuestions()
    let counter = 1

    const questionIdNum = typeof questionId === "string" ? Number.parseInt(questionId.split("_")[0]) : questionId

    for (const q of allQuestions) {
      if (q.id === questionIdNum) {
        return counter
      }
      counter += getQuestionCount(q)
    }

    return counter
  }

  const getFlowChartStepQuestionNumber = (questionId: string, stepNum: string): number => {
    const baseQuestionId = questionId.split("_")[0]
    const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

    if (!question || !question.choices) return 1

    const allQuestions = getAllQuestions()
    const baseQuestionIndex = allQuestions.findIndex((q) => q.id.toString() === baseQuestionId)

    let questionCounter = 1
    for (let i = 0; i < baseQuestionIndex; i++) {
      questionCounter += getQuestionCount(allQuestions[i])
    }

    // Count which blank this is within the flow chart
    let blankCounter = 0
    const sortedSteps = Object.entries(question.choices).sort(([a], [b]) => Number(a) - Number(b))

    for (const [step, text] of sortedSteps) {
      if (typeof text === "string" && text.includes("__")) {
        if (step === stepNum) {
          return questionCounter + blankCounter
        }
        blankCounter++
      }
    }

    return questionCounter
  }

  const handleAnswerChange = (questionId: number | string, answer: any, questionIdentifier?: string) => {
    const questionIdStr = questionId.toString()

    let stateAnswer = answer
    if (questionIdentifier && questionIdentifier.includes("_flow_")) {
      const parts = questionIdentifier.split("_")
      const stepNum = parts[2]
      const existingAnswer = answers[questionIdStr]
      if (answer) {
        stateAnswer = { ...(typeof existingAnswer === "object" ? existingAnswer : {}), [stepNum]: answer }
      } else {
        const newAnswer = { ...(typeof existingAnswer === "object" ? existingAnswer : {}) }
        delete newAnswer[stepNum]
        stateAnswer = Object.keys(newAnswer).length > 0 ? newAnswer : null
      }
    }

    const newAnswers = { ...answers }
    if (
      !answer ||
      (typeof answer === "string" && answer.trim() === "") ||
      (Array.isArray(answer) && answer.length === 0)
    ) {
      delete newAnswers[questionIdStr]
    } else {
      newAnswers[questionIdStr] = stateAnswer
    }
    setAnswers(newAnswers)

    const answersKey = `answers_${examId}_listening`
    const existingAnswers = localStorage.getItem(answersKey)
    let answersArray: any[] = []

    try {
      if (existingAnswers) {
        const parsed = JSON.parse(existingAnswers)
        answersArray = Array.isArray(parsed) ? parsed : []
      }
    } catch (error) {
      console.log("[v0] Error parsing localStorage answers, starting with empty array:", error)
      answersArray = []
    }

    const question = getAllQuestions().find((q) => q.id.toString() === questionIdStr.split("_")[0])
    const questionType = question?.q_type || "UNKNOWN"

    const isEmptyAnswer =
      !answer || (typeof answer === "string" && answer.trim() === "") || (Array.isArray(answer) && answer.length === 0)

    if (!isEmptyAnswer) {
      // Add/update answer
      const formattedAnswer = answer

      if (questionIdentifier && questionIdentifier.includes("_map_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const position = parts[2]
        const selectedOptionKey = answer

        const mapQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (!mapQuestion) {
          console.error("[v0] Could not find MAP question for baseQuestionId:", baseQuestionId)
          return
        }

        const actualLQuestionId = mapQuestion.id

        // Remove any previous answer for this specific position
        answersArray = answersArray.filter(
          (item: any) => !(item.l_questionsID === actualLQuestionId && item.answer?.startsWith(`${position}:`)),
        )

        // Add new answer with the actual database ID
        answersArray.push({
          userId: String(userId),
          questionId: mapQuestion.listening_questions_id,
          examId: Number.parseInt(examId),
          question_type: questionType,
          answer: `${position}:${selectedOptionKey}`,
          l_questionsID: actualLQuestionId,
        })
      } else if (questionIdStr.includes("_table_")) {
        const parts = questionIdStr.split("_")
        const baseQuestionId = parts[0]
        const rowIndex = Number.parseInt(parts[parts.length - 2])
        const cellIndex = Number.parseInt(parts[parts.length - 1])

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        const l_questionsID = question?.listening_questions_id

        const allQuestions = getAllQuestions()
        const baseQuestionIndex = allQuestions.findIndex((q) => q.id.toString() === baseQuestionId)

        let questionCounter = 1
        for (let i = 0; i < baseQuestionIndex; i++) {
          questionCounter += getQuestionCount(allQuestions[i])
        }

        let cellCounter = 0
        if (question?.rows && Array.isArray(question.rows)) {
          for (let r = 0; r < question.rows.length; r++) {
            const row = question.rows[r]
            if (row.cells && Array.isArray(row.cells)) {
              for (let c = 0; c < row.cells.length; c++) {
                if (row.cells[c] === "" || row.cells[c] === "_") {
                  if (r === rowIndex && c === cellIndex) {
                    break
                  }
                  cellCounter++
                }
              }
              if (r === rowIndex) break
            }
          }
        }

        const uniqueLQuestionsID = questionCounter + cellCounter

        // Remove previous answer for this cell
        answersArray = answersArray.filter((item: any) => item.l_questionsID !== uniqueLQuestionsID)

        // Add new answer
        answersArray.push({
          userId: String(userId),
          questionId: l_questionsID,
          examId: Number.parseInt(examId),
          question_type: questionType,
          answer: answer,
          l_questionsID: uniqueLQuestionsID,
        })
      } else if (questionIdStr.includes("_matching_")) {
        const parts = questionIdStr.split("_")
        const baseQuestionId = parts[0]
        const rowIndex = Number.parseInt(parts[2])

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        const l_questionsID = question?.listening_questions_id

        const allQuestions = getAllQuestions()
        const baseQuestionIndex = allQuestions.findIndex((q) => q.id.toString() === baseQuestionId)

        let questionCounter = 1
        for (let i = 0; i < baseQuestionIndex; i++) {
          questionCounter += getQuestionCount(allQuestions[i])
        }

        const uniqueLQuestionsID = questionCounter + rowIndex

        // Remove previous answer for this row
        answersArray = answersArray.filter((item: any) => item.l_questionsID !== uniqueLQuestionsID)

        // Add new answer
        answersArray.push({
          userId: String(userId),
          questionId: l_questionsID,
          examId: Number.parseInt(examId),
          question_type: questionType,
          answer: answer,
          l_questionsID: uniqueLQuestionsID,
        })
      } else if (questionType === "MCQ_MULTI" && Array.isArray(answer)) {
        const question = getAllQuestions().find((q) => q.id.toString() === questionIdStr)
        const l_questionsID = question?.listening_questions_id

        // Remove all previous answers for this question
        answersArray = answersArray.filter((item: any) => item.questionId !== l_questionsID)

        // Add each selected option as a separate entry
        answer.forEach((selectedOption, index) => {
          answersArray.push({
            userId: String(userId),
            questionId: l_questionsID,
            examId: Number.parseInt(examId),
            question_type: questionType,
            answer: selectedOption,
            l_questionsID: Number.parseInt(questionIdStr) + index,
          })
        })
      } else if (questionType === "FLOW_CHART" && questionIdentifier && questionIdentifier.includes("_flow_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const stepNum = parts[2]

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        const l_questionsID = question?.listening_questions_id

        // Remove previous answer for this step
        answersArray = answersArray.filter(
          (item: any) => !(item.questionId === l_questionsID && item.answer?.startsWith(`${stepNum}:`)),
        )

        // Add new answer
        answersArray.push({
          userId: String(userId),
          questionId: l_questionsID,
          examId: Number.parseInt(examId),
          question_type: questionType,
          answer: `${stepNum}:${answer}`,
          l_questionsID: l_questionsID,
        })
      } else if (questionType === "NOTE_COMPLETION") {
        const inputId = questionIdentifier || questionIdStr
        const baseQuestionId = inputId.split("_")[0]
        const subIndex = Number.parseInt(inputId.split("_")[2]) // Extract the index from the inputId

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        const l_questionsID = question?.listening_questions_id

        // Calculate the actual global question number for this input
        const allQuestions = getAllQuestions()
        const baseQuestionIndex = allQuestions.findIndex((q) => q.id.toString() === baseQuestionId)

        let questionCounter = 1
        for (let i = 0; i < baseQuestionIndex; i++) {
          questionCounter += getQuestionCount(allQuestions[i])
        }

        const actualQuestionNumber = questionCounter + subIndex

        // Remove any previous answer for this specific question number
        answersArray = answersArray.filter((item: any) => item.l_questionsID !== actualQuestionNumber)

        // Add new answer with the actual question number
        answersArray.push({
          userId: String(userId),
          questionId: l_questionsID,
          examId: Number.parseInt(examId),
          question_type: questionType,
          answer: answer, // Save as plain text, not prefixed
          l_questionsID: actualQuestionNumber, // Use the actual question number
        })
      } else {
        // Regular question
        const question = getAllQuestions().find((q) => q.id.toString() === questionIdStr)
        const l_questionsID = question?.listening_questions_id

        answersArray = answersArray.filter(
          (item: any) => !(item.questionId === l_questionsID && item.l_questionsID === Number.parseInt(questionIdStr)),
        )

        answersArray.push({
          userId: String(userId),
          questionId: l_questionsID,
          examId: Number.parseInt(examId),
          question_type: questionType,
          answer: formattedAnswer,
          l_questionsID: Number.parseInt(questionIdStr),
        })
      }
    } else {
      if (questionIdentifier && questionIdentifier.includes("_map_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const position = parts[2]

        const mapQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (mapQuestion) {
          const actualLQuestionId = mapQuestion.id
          answersArray = answersArray.filter(
            (item: any) => !(item.l_questionsID === actualLQuestionId && item.answer?.startsWith(`${position}:`)),
          )
        }
      } else if (questionIdStr.includes("_table_")) {
        const parts = questionIdStr.split("_")
        const baseQuestionId = parts[0]
        const rowIndex = Number.parseInt(parts[parts.length - 2])
        const cellIndex = Number.parseInt(parts[parts.length - 1])

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (question) {
          const allQuestions = getAllQuestions()
          const baseQuestionIndex = allQuestions.findIndex((q) => q.id.toString() === baseQuestionId)

          let questionCounter = 1
          for (let i = 0; i < baseQuestionIndex; i++) {
            questionCounter += getQuestionCount(allQuestions[i])
          }

          let cellCounter = 0
          if (question.rows && Array.isArray(question.rows)) {
            for (let r = 0; r < question.rows.length; r++) {
              const row = question.rows[r]
              if (row.cells && Array.isArray(row.cells)) {
                for (let c = 0; c < row.cells.length; c++) {
                  if (row.cells[c] === "" || row.cells[c] === "_") {
                    if (r === rowIndex && c === cellIndex) {
                      break
                    }
                    cellCounter++
                  }
                }
                if (r === rowIndex) break
              }
            }
          }

          const uniqueLQuestionsID = questionCounter + cellCounter
          answersArray = answersArray.filter((item: any) => item.l_questionsID !== uniqueLQuestionsID)
        }
      } else if (questionIdStr.includes("_matching_")) {
        const parts = questionIdStr.split("_")
        const baseQuestionId = parts[0]
        const rowIndex = Number.parseInt(parts[2])

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (question) {
          const allQuestions = getAllQuestions()
          const baseQuestionIndex = allQuestions.findIndex((q) => q.id.toString() === baseQuestionId)

          let questionCounter = 1
          for (let i = 0; i < baseQuestionIndex; i++) {
            questionCounter += getQuestionCount(allQuestions[i])
          }

          const uniqueLQuestionsID = questionCounter + rowIndex
          answersArray = answersArray.filter((item: any) => item.l_questionsID !== uniqueLQuestionsID)
        }
      } else if (questionType === "FLOW_CHART" && questionIdentifier && questionIdentifier.includes("_flow_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const stepNum = parts[2]

        const flowQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (flowQuestion) {
          const l_questionsID = flowQuestion.listening_questions_id
          answersArray = answersArray.filter(
            (item: any) => !(item.questionId === l_questionsID && item.answer?.startsWith(`${stepNum}:`)),
          )
        }
      } else if (questionType === "NOTE_COMPLETION") {
        const inputId = questionIdentifier || questionIdStr
        const baseQuestionId = inputId.split("_")[0]
        const subIndex = Number.parseInt(inputId.split("_")[2])

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (question) {
          // Calculate the actual global question number for this input
          const allQuestions = getAllQuestions()
          const baseQuestionIndex = allQuestions.findIndex((q) => q.id.toString() === baseQuestionId)

          let questionCounter = 1
          for (let i = 0; i < baseQuestionIndex; i++) {
            questionCounter += getQuestionCount(allQuestions[i])
          }

          const actualQuestionNumber = questionCounter + subIndex

          // Remove the specific answer for this question number
          answersArray = answersArray.filter((item: any) => item.l_questionsID !== actualQuestionNumber)
        }
      } else if (questionType === "MCQ_MULTI") {
        const question = getAllQuestions().find((q) => q.id.toString() === questionIdStr)
        const l_questionsID = question?.listening_questions_id
        answersArray = answersArray.filter((item: any) => item.questionId !== l_questionsID)
      } else {
        // Regular question deletion
        const question = getAllQuestions().find((q) => q.id.toString() === questionIdStr)
        const l_questionsID = question?.listening_questions_id
        answersArray = answersArray.filter(
          (item: any) => !(item.questionId === l_questionsID && item.l_questionsID === Number.parseInt(questionIdStr)),
        )
      }
    }

    localStorage.setItem(answersKey, JSON.stringify(answersArray))
  }

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      showAlert({
        title: "Submit Test",
        description: "Are you sure you want to submit your test? This action cannot be undone.",
        type: "warning",
        confirmText: "Yes, Submit",
        cancelText: "No, Continue",
        onConfirm: async () => {
          await submitAnswers()
        },
      })
    } else {
      // Auto-submit without confirmation when timer expires
      await submitAnswers()
    }
  }

  const submitAnswers = async () => {
    setShowSubmitLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

      const answersKey = `answers_${examId}_listening`
      const savedAnswers = localStorage.getItem(answersKey)
      const submissionData = savedAnswers ? JSON.parse(savedAnswers) : []

      for (const answerData of submissionData) {
        await fetch(`${API_BASE_URL}/listening-answers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(answerData),
        })
      }

      localStorage.removeItem(answersKey)
      markSectionCompleted(examId, "listening")

      setTimeout(() => {
        router.push(`/mock/${examId}`)
      }, 1500)
    } catch (error) {
      console.error("Failed to submit listening test:", error)
      showAlert({
        title: "Submission Error",
        description: "Failed to submit your answers. Please try again.",
        type: "error",
        confirmText: "OK",
        showCancel: false,
      })
    } finally {
      setShowSubmitLoading(false)
    }
  }

  const getAllQuestions = () => {
    return (
      testData?.questions.flatMap((questionGroup) =>
        questionGroup.l_questions.map((lq) => ({
          ...lq,
          part: questionGroup.part,
          groupId: questionGroup.id,
        })),
      ) || []
    )
  }

  const getQuestionsByPart = (part: number) => {
    const partName = `PART${part}`
    return getAllQuestions().filter((q) => q.part === partName)
  }

  // Modified to check if any sub-question is answered, not just the main question object
  const isQuestionAnswered = (question: any): boolean => {
    const questionIdStr = question.id.toString()
    const questionCount = getQuestionCount(question)

    for (let i = 0; i < questionCount; i++) {
      if (isSubQuestionAnswered(question, i)) {
        return true
      }
    }
    return false
  }

  const switchToPart = (partNumber: number) => {
    setCurrentPart(partNumber)
    setExpandedPart(expandedPart === partNumber ? null : partNumber)
    const partQuestions = getQuestionsByPart(partNumber)
    if (partQuestions.length > 0 && questionRefs.current[partQuestions[0].id]) {
      questionRefs.current[partQuestions[0].id]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }

  const jumpToQuestion = (questionId: number) => {
    if (questionRefs.current[questionId]) {
      questionRefs.current[questionId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }

  const handleAudioEnded = () => {
    console.log("[v0] Audio ended, starting timer")
    setAudioPlaying(false)
    setAudioEnded(true)
    setTimerActive(true) // NOW timer starts counting down
  }

  const handleTimerExpired = () => {
    setTimerExpired(true)
    // Auto-submit without confirmation when timer expires
    handleSubmit(true)
  }

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume[0] / 100
    }
  }

  const getAllParts = () => {
    const parts = [1, 2, 3, 4]
    return parts.map((partNum) => {
      const questions = getQuestionsByPart(partNum)
      return {
        partNumber: partNum,
        questions: questions,
        totalQuestions: questions.length,
        answeredQuestions: questions.filter((q) => isQuestionAnswered(q)).length,
      }
    })
  }

  const getTableCellQuestionNumber = (questionId: string, rowIndex: number, cellIndex: number): number => {
    const baseQuestionId = questionId.split("_")[0]
    const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

    if (!question) return 1

    // Get the starting question number for this table
    const allQuestions = getAllQuestions()
    const baseQuestionIndex = allQuestions.findIndex((q) => q.id.toString() === baseQuestionId)

    let questionCounter = 1
    for (let i = 0; i < baseQuestionIndex; i++) {
      questionCounter += getQuestionCount(allQuestions[i])
    }

    // Count which input this is within the table
    let cellCounter = 0
    if (question.rows && Array.isArray(question.rows)) {
      for (let r = 0; r < question.rows.length; r++) {
        const row = question.rows[r]
        if (row.cells && Array.isArray(row.cells)) {
          for (let c = 0; c < row.cells.length; c++) {
            if (row.cells[c] === "" || row.cells[c] === "_") {
              if (r === rowIndex && c === cellIndex) {
                return questionCounter + cellCounter
              }
              cellCounter++
            }
          }
        }
      }
    }

    return questionCounter
  }

  const formatAudioTimeRemaining = () => {
    if (!audioDuration || audioDuration === 0 || isNaN(audioDuration)) {
      return "Loading..."
    }
    const remaining = Math.max(0, audioDuration - audioCurrentTime)
    const minutes = Math.floor(remaining / 60)
    const seconds = Math.floor(remaining % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const isSubQuestionAnswered = (question: any, subIndex: number): boolean => {
    const questionIdStr = question.id.toString()

    if (question.q_type === "TABLE_COMPLETION") {
      // Check if this specific table cell is answered
      if (question.rows && Array.isArray(question.rows)) {
        let cellCounter = 0
        for (let r = 0; r < question.rows.length; r++) {
          const row = question.rows[r]
          if (row.cells && Array.isArray(row.cells)) {
            for (let c = 0; c < row.cells.length; c++) {
              if (row.cells[c] === "" || row.cells[c] === "_") {
                if (cellCounter === subIndex) {
                  const answer = answers[`${questionIdStr}_table_${r}_${c}`]
                  return answer !== undefined && answer !== "" && answer !== null
                }
                cellCounter++
              }
            }
          }
        }
      }
      return false
    } else if (question.q_type === "MATCHING_INFORMATION") {
      // Check if this specific matching row is answered
      const answer = answers[`${questionIdStr}_matching_${subIndex}`]
      return answer !== undefined && answer !== "" && answer !== null
    } else if (question.q_type === "MAP_LABELING") {
      // Check if this specific map position is answered
      if (question.rows) {
        try {
          let rowsData: any
          if (typeof question.rows === "object") {
            rowsData = question.rows
          } else if (typeof question.rows === "string") {
            const trimmed = question.rows.trim()
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
              rowsData = JSON.parse(trimmed)
            } else {
              return false
            }
          } else {
            return false
          }

          const positions = Object.keys(rowsData)
          if (subIndex < positions.length) {
            const position = positions[subIndex]
            const answer = answers[`${questionIdStr}_map_${position}`]
            return answer !== undefined && answer !== "" && answer !== null
          }
        } catch (error) {
          return false
        }
      }
      return false
    } else if (question.q_type === "FLOW_CHART") {
      // Check if this specific flow chart step is answered
      if (question.choices && typeof question.choices === "object") {
        let blankCounter = 0
        const sortedSteps = Object.entries(question.choices).sort(([a], [b]) => Number(a) - Number(b))

        for (const [step, text] of sortedSteps) {
          if (typeof text === "string" && text.includes("__")) {
            if (blankCounter === subIndex) {
              const allAnswers = answers[questionIdStr]
              if (allAnswers && typeof allAnswers === "object" && allAnswers[step]) {
                return true
              }
              return false
            }
            blankCounter++
          }
        }
      }
      return false
    } else if (question.q_type === "MCQ_MULTI") {
      // For MCQ_MULTI, check if we have enough answers
      const answer = answers[questionIdStr]
      if (Array.isArray(answer)) {
        return answer.length > subIndex
      }
      return false
    } else if (question.q_type === "NOTE_COMPLETION") {
      // Check if this specific note input is answered
      // NOTE: This assumes that questionIdStr correctly maps to the base question and subIndex maps to the input position.
      // We need to calculate the actual global question number to accurately check.
      const allQuestions = getAllQuestions()
      const baseQuestionIndex = allQuestions.findIndex((q) => q.id === question.id)
      let questionCounter = 1
      for (let i = 0; i < baseQuestionIndex; i++) {
        questionCounter += getQuestionCount(allQuestions[i])
      }
      const actualQuestionNumber = questionCounter + subIndex
      // Fetch answersArray from localStorage to check for NOTE_COMPLETION answers
      const answersKey = `answers_${examId}_listening`
      const savedAnswers = localStorage.getItem(answersKey)
      const answersArray: any[] = savedAnswers ? JSON.parse(savedAnswers) : []
      const answerEntry = answersArray.find(
        (item: any) => item.l_questionsID === actualQuestionNumber && item.question_type === "NOTE_COMPLETION",
      )
      return answerEntry !== undefined && answerEntry.answer !== undefined && answerEntry.answer !== ""
    } else {
      // For single-answer questions, all sub-indices share the same answer
      const answer = answers[questionIdStr]
      return answer !== undefined && answer !== "" && answer !== null
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading listening test...</p>
        </div>
      </div>
    )
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Failed to load test data</div>
          <Button onClick={() => router.push(`/mock/${examId}`)} className="bg-blue-600 hover:bg-blue-700">
            Back to Mock Test
          </Button>
        </div>
      </div>
    )
  }

  const allQuestions = getAllQuestions()
  const currentPartQuestions = getQuestionsByPart(currentPart)
  const allParts = getAllParts()

  return (
    <div className="min-h-screen bg-white">
      <AlertComponent />

      <Dialog open={showAudioWarning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Audio Test Starting</DialogTitle>
            <DialogDescription>
              The audio will start playing automatically. Please ensure your volume is at a comfortable level and mark
              your answers.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <Button onClick={startAudioTest} className="bg-blue-600 hover:bg-blue-700 text-white">
              OK, Start Audio
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {testData?.audio_url && (
        <audio
          ref={audioRef}
          src={`${process.env.NEXT_PUBLIC_API_URL}${testData.audio_url}`}
          onEnded={handleAudioEnded}
          onPlay={() => setAudioPlaying(true)}
          onPause={() => setAudioPlaying(false)}
          volume={volume[0] / 100}
        />
      )}

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 sm:space-x-6">
            <div className="text-red-500 font-bold text-xl sm:text-2xl">IELTS</div>
            <div className="text-base sm:text-lg font-medium text-gray-800">Test taker ID</div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 w-full sm:w-auto">
            {audioPlaying && (
              <div className="text-gray-900 text-sm sm:text-base flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
                <span className="font-medium">Audio is playing</span>
                <span className="text-gray-600">• {formatAudioTimeRemaining()} remaining</span>
              </div>
            )}

            {timeRemaining !== null && (
              <div className={`text-center ${timerActive ? "animate-pulse" : ""}`}>
                <Timer
                  initialTime={timeRemaining}
                  onTimeUpdate={setTimeRemaining}
                  onTimeUp={handleTimerExpired}
                  isActive={timerActive}
                  className="text-base sm:text-lg md:text-2xl font-mono font-bold bg-red-50 text-red-600 px-2 sm:px-4 py-1 sm:py-2 rounded border border-red-200"
                />
              </div>
            )}

            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
              <VolumeX className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              <Slider value={volume} onValueChange={handleVolumeChange} max={100} step={1} className="w-16 sm:w-24" />
              <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              <span className="text-xs text-gray-500 ml-1">{volume[0]}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 pb-24">
        <div className="max-w-4xl lg:max-w-6xl mx-auto p-4 sm:p-6">
          <div className="mb-6">
            <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
              <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Part {currentPart}</h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Listen and answer questions {(() => {
                    const partQuestions = getQuestionsByPart(currentPart)
                    if (partQuestions.length > 0) {
                      const firstQ = getGlobalQuestionNumber(partQuestions[0].id)
                      let lastQ = firstQ
                      partQuestions.forEach((q) => {
                        lastQ += getQuestionCount(q) - 1
                      })
                      return `${firstQ}–${lastQ}`
                    }
                    return "1–10"
                  })()}.
                </p>
              </div>

              {(() => {
                const currentPartData = testData?.questions.find((q) => q.part === `PART${currentPart}`)
                return currentPartData ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{currentPartData.title}</h4>
                    <p className="text-gray-800">{currentPartData.instruction}</p>
                  </div>
                ) : null
              })()}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">
              Questions {(() => {
                const partQuestions = getQuestionsByPart(currentPart)
                if (partQuestions.length > 0) {
                  const firstQ = getGlobalQuestionNumber(partQuestions[0].id)
                  let lastQ = firstQ
                  partQuestions.forEach((q) => {
                    lastQ += getQuestionCount(q) - 1
                  })
                  return `${firstQ}–${lastQ}`
                }
                return "1–10"
              })()}
            </h3>

            <div className="space-y-6">
              {currentPartQuestions.map((question) => {
                const questionId = question.id.toString()
                const currentAnswer = answers[questionId] || ""

                let parsedOptions = question.options
                if (typeof question.options === "string") {
                  try {
                    parsedOptions = JSON.parse(question.options)
                  } catch (e) {
                    parsedOptions = null
                  }
                }

                let optionsArray: { key: string; text: string }[] = []

                if (Array.isArray(parsedOptions)) {
                  optionsArray = parsedOptions.map((option: any) => ({
                    key: option.key || option.value || "",
                    text: option.text || option.label || option.value || "",
                  }))
                } else if (parsedOptions && typeof parsedOptions === "object") {
                  optionsArray = Object.entries(parsedOptions).map(([key, text]) => ({
                    key,
                    text: text as string,
                  }))
                }

                return (
                  <div key={question.id} className="space-y-4 p-4 sm:p-6 border rounded-lg bg-white border-gray-200">
                    <div className="text-base sm:text-lg font-semibold mb-4 text-gray-700">
                      Question {getGlobalQuestionNumber(question.id)}
                      {getQuestionCount(question) > 1 &&
                        ` - ${getGlobalQuestionNumber(question.id) + getQuestionCount(question) - 1}`}
                    </div>

                    {question.q_text && question.q_type !== "NOTE_COMPLETION" && (
                      <div className="text-base sm:text-lg mb-6 text-gray-900 font-medium leading-relaxed">
                        {question.q_text}
                      </div>
                    )}

                    {question.q_type === "TFNG" ||
                      (question.q_type === "TRUE_FALSE_NOT_GIVEN" && (
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
                                className="cursor-pointer text-sm sm:text-base text-gray-900"
                              >
                                TRUE
                              </Label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value="FALSE" id={`q${question.id}-false`} />
                              <Label
                                htmlFor={`q${question.id}-false`}
                                className="cursor-pointer text-sm sm:text-base text-gray-900"
                              >
                                FALSE
                              </Label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value="NOT_GIVEN" id={`q${question.id}-ng`} />
                              <Label
                                htmlFor={`q${question.id}-ng`}
                                className="cursor-pointer text-sm sm:text-base text-gray-900"
                              >
                                NOT GIVEN
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      ))}

                    {question.q_type === "MCQ_SINGLE" && optionsArray.length > 0 && (
                      <div className="space-y-3">
                        <RadioGroup
                          value={currentAnswer || ""}
                          onValueChange={(value) => handleAnswerChange(questionId, value)}
                          className="space-y-3"
                        >
                          {optionsArray.map((option, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <RadioGroupItem value={option.key} id={`q${question.id}-${option.key}`} />
                              <Label
                                htmlFor={`q${question.id}-${option.key}`}
                                className="cursor-pointer text-sm sm:text-base text-gray-900"
                              >
                                <span className="font-medium">{option.key}</span> {option.text}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    )}

                    {question.q_type === "MCQ_MULTI" && optionsArray.length > 0 && (
                      <div className="space-y-3">
                        <div className="space-y-3">
                          {optionsArray.map((option, index) => {
                            const currentAnswersArray = currentAnswer
                              ? Array.isArray(currentAnswer)
                                ? currentAnswer
                                : currentAnswer.split(",").filter(Boolean)
                              : []

                            return (
                              <div key={index} className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  id={`q${question.id}-${option.key}`}
                                  checked={currentAnswersArray.includes(option.key)}
                                  onChange={(e) => {
                                    let newAnswers: string[]
                                    if (e.target.checked) {
                                      newAnswers = [...currentAnswersArray, option.key]
                                    } else {
                                      newAnswers = currentAnswersArray.filter((a) => a !== option.key)
                                    }
                                    handleAnswerChange(questionId, newAnswers)
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <Label
                                  htmlFor={`q${question.id}-${option.key}`}
                                  className="cursor-pointer text-sm sm:text-base text-gray-900"
                                >
                                  <span className="font-medium">{option.key}</span> {option.text}
                                </Label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {question.q_type === "SENTENCE_COMPLETION" && (
                      <div className="space-y-2">
                        <div className="text-base leading-relaxed text-gray-900">
                          {(() => {
                            const text = question.q_text || ""
                            const parts = text.split(/_+/)

                            if (parts.length === 1) {
                              // No underscores, just show input below
                              return (
                                <>
                                  <p className="mb-2">{text}</p>
                                  <Input
                                    value={currentAnswer || ""}
                                    onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                                    placeholder="Your answer"
                                    className="w-full text-sm sm:text-base bg-white border-gray-300 focus:border-blue-500"
                                  />
                                </>
                              )
                            }

                            // Show inline input where underscore is
                            return (
                              <div className="flex flex-wrap items-center gap-2">
                                {parts.map((part, index) => (
                                  <React.Fragment key={index}>
                                    <span>{part}</span>
                                    {index < parts.length - 1 && (
                                      <Input
                                        value={currentAnswer || ""}
                                        onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                                        className="inline-block w-32 px-2 py-1 text-sm bg-white border-gray-300 focus:border-blue-500"
                                        placeholder={getGlobalQuestionNumber(question.id).toString()}
                                      />
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}

                    {question.q_type === "SENTENCE_ENDINGS" && optionsArray.length > 0 && (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <div className="border-2 border-dashed border-blue-300 bg-blue-50 p-3 rounded-lg min-h-[40px] flex items-center">
                            {currentAnswer ? (
                              <span className="text-blue-800 font-medium">{currentAnswer}</span>
                            ) : (
                              <span className="text-gray-400 text-xs">Select an option</span>
                            )}
                          </div>
                        </div>
                        <div className="border-t pt-3">
                          <p className="text-xs text-gray-600 mb-2">Choose from:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {optionsArray.map((option, index) => (
                              <Button
                                key={index}
                                variant={currentAnswer === option.key ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleAnswerChange(questionId, option.key)}
                                className={`text-xs p-2 h-auto text-left ${
                                  currentAnswer === option.key
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                <span className="font-medium">{option.key}</span> {option.text}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {question.q_type === "MATCHING_INFORMATION" && (
                      <div className="space-y-6">
                        <div className="overflow-x-auto">
                          <table className="w-full border text-base border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border p-3 text-left font-semibold text-black border-gray-300">
                                  Questions {getGlobalQuestionNumber(question.id)}–
                                  {getGlobalQuestionNumber(question.id) + (question.rows?.length || 1) - 1}
                                </th>
                                {question.choices &&
                                  Object.keys(question.choices).map((choiceKey) => (
                                    <th
                                      key={choiceKey}
                                      className="border p-3 text-center font-semibold w-16 text-black border-gray-300"
                                    >
                                      {choiceKey}
                                    </th>
                                  ))}
                              </tr>
                            </thead>
                            <tbody>
                              {question.rows?.map((rowText, index) => (
                                <tr key={index}>
                                  <td className="border p-3 border-gray-300 text-black">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                                        {getGlobalQuestionNumber(question.id) + index}
                                      </span>
                                      <span className="font-medium">{rowText}</span>
                                    </div>
                                  </td>
                                  {question.choices &&
                                    Object.keys(question.choices).map((choiceKey) => (
                                      <td key={choiceKey} className="border p-3 text-center border-gray-300">
                                        <input
                                          type="radio"
                                          name={`matching_${question.id}_${index}`}
                                          value={choiceKey}
                                          checked={answers[`${question.id}_matching_${index}`] === choiceKey}
                                          onChange={(e) =>
                                            handleAnswerChange(`${question.id}_matching_${index}`, e.target.value)
                                          }
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
                          <h5 className="font-semibold mb-3 text-black">{question.q_text || "Choices:"}</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full border text-base border-gray-300">
                              <tbody>
                                {question.choices &&
                                  Object.entries(question.choices).map(([key, text]) => (
                                    <tr key={key}>
                                      <td className="border p-3 w-16 text-center font-semibold bg-gray-50 text-black border-gray-300">
                                        {key}
                                      </td>
                                      <td className="border p-3 border-gray-300 text-black">{text}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {question.q_type === "TABLE_COMPLETION" && (question.columns || question.table_structure) && (
                      <div className="space-y-2">
                        <div className="overflow-x-auto">
                          <table className="w-full border text-base border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border p-3 text-left font-semibold text-gray-900 border-gray-300">
                                  {question.table_structure?.headers?.[0] || "Item"}
                                </th>
                                {(question.columns || question.table_structure?.headers?.slice(1) || []).map(
                                  (header, index) => (
                                    <th
                                      key={index}
                                      className="border p-3 text-left font-semibold text-gray-900 border-gray-300"
                                    >
                                      {header}
                                    </th>
                                  ),
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {question.rows && Array.isArray(question.rows)
                                ? question.rows.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                      <td className="border p-3 font-medium bg-gray-50 text-gray-900 border-gray-300">
                                        {row.label || ""}
                                      </td>
                                      {(row.cells && Array.isArray(row.cells) ? row.cells : []).map(
                                        (cell, cellIndex) => (
                                          <td key={cellIndex} className="border p-3 border-gray-300">
                                            {cell === "" || cell === "_" ? (
                                              <div className="flex items-center gap-2">
                                                <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium">
                                                  {getTableCellQuestionNumber(questionId, rowIndex, cellIndex)}
                                                </span>
                                                <Input
                                                  value={answers[`${questionId}_table_${rowIndex}_${cellIndex}`] || ""}
                                                  onChange={(e) =>
                                                    handleAnswerChange(
                                                      `${questionId}_table_${rowIndex}_${cellIndex}`,
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="w-full text-sm bg-white border-gray-300 focus:border-gray-500"
                                                  placeholder="Answer"
                                                />
                                              </div>
                                            ) : (
                                              <span className="text-gray-900">{cell}</span>
                                            )}
                                          </td>
                                        ),
                                      )}
                                    </tr>
                                  ))
                                : question.table_structure?.rows?.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                      <td className="border p-3 font-medium bg-gray-50 text-gray-900 border-gray-300">
                                        {Object.values(row)[0]}
                                      </td>
                                      {Object.entries(row)
                                        .slice(1)
                                        .map(([key, value], cellIndex) => (
                                          <td key={cellIndex} className="border p-3 border-gray-300">
                                            {value === "" || value === "_" ? (
                                              <div className="flex items-center gap-2">
                                                <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium">
                                                  {getTableCellQuestionNumber(questionId, rowIndex, cellIndex)}
                                                </span>
                                                <Input
                                                  value={answers[`${questionId}_table_${rowIndex}_${cellIndex}`] || ""}
                                                  onChange={(e) =>
                                                    handleAnswerChange(
                                                      `${questionId}_table_${rowIndex}_${cellIndex}`,
                                                      e.target.value,
                                                    )
                                                  }
                                                  className="w-full text-sm bg-white border-gray-300 focus:border-gray-500"
                                                  placeholder="Answer"
                                                />
                                              </div>
                                            ) : (
                                              <span className="text-gray-900">{value}</span>
                                            )}
                                          </td>
                                        ))}
                                    </tr>
                                  ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {question.q_type === "MAP_LABELING" && question.photo && question.rows && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Map Image with Drop Zones */}
                          <div className="lg:col-span-2">
                            <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_URL}/uploads/l_questions/${question.photo}`}
                                alt="Map"
                                className="w-full h-auto"
                                draggable={false}
                              />
                              {/* Drop Zones */}
                              {(() => {
                                let rowsData: Record<string, any> = {}
                                if (question.rows) {
                                  if (typeof question.rows === "object") {
                                    rowsData = question.rows
                                  } else if (typeof question.rows === "string") {
                                    try {
                                      rowsData = JSON.parse(question.rows)
                                    } catch (e) {
                                      console.error("[v0] Failed to parse MAP_LABELING rows for rendering:", e)
                                      console.error("[v0] Invalid rows data:", question.rows)
                                    }
                                  }
                                }

                                const startQuestionNum = getGlobalQuestionNumber(question.id)

                                return Object.entries(rowsData).map(([position, coords]: [string, any], index) => {
                                  const dropZoneQuestionId = `${question.id}_map_${position}`
                                  const currentAnswer = answers[dropZoneQuestionId]
                                  const questionNum = startQuestionNum + index

                                  let selectedOptionText = ""
                                  if (currentAnswer) {
                                    const selectedOption = optionsArray.find((opt) => opt.key === currentAnswer)
                                    selectedOptionText = selectedOption?.text || ""
                                  }

                                  return (
                                    <div
                                      key={position}
                                      className="absolute"
                                      style={{
                                        left: coords.x,
                                        top: coords.y,
                                        transform: "translate(-50%, -50%)",
                                      }}
                                      onDragOver={(e) => {
                                        e.preventDefault()
                                        e.currentTarget.classList.add("bg-blue-200", "scale-110")
                                      }}
                                      onDragLeave={(e) => {
                                        e.currentTarget.classList.remove("bg-blue-200", "scale-110")
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault()
                                        e.currentTarget.classList.remove("bg-blue-200", "scale-110")
                                        const optionKey = e.dataTransfer.getData("text/plain")
                                        if (optionKey) {
                                          handleAnswerChange(dropZoneQuestionId, optionKey, dropZoneQuestionId)
                                        }
                                      }}
                                    >
                                      <div className="flex flex-col items-center gap-1">
                                        <div
                                          className={`min-w-[80px] px-3 py-2 rounded-lg border-2 flex flex-col items-center justify-center text-sm font-semibold shadow-lg transition-all ${
                                            currentAnswer
                                              ? "bg-white border-blue-500"
                                              : "bg-white border-dashed border-gray-400 hover:border-blue-400 hover:scale-105"
                                          }`}
                                        >
                                          <span className="text-blue-600 font-bold text-base">{questionNum}</span>
                                          {currentAnswer && selectedOptionText && (
                                            <span className="text-gray-700 text-xs mt-1 text-center">
                                              {selectedOptionText}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })
                              })()}
                            </div>
                          </div>

                          {/* Options Panel */}
                          <div className="lg:col-span-1">
                            <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
                              <h4 className="font-semibold text-gray-900 mb-4">Options</h4>
                              <div className="space-y-2">
                                {optionsArray.map((option) => (
                                  <div
                                    key={option.key}
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData("text/plain", option.key)
                                      e.currentTarget.classList.add("opacity-50")
                                    }}
                                    onDragEnd={(e) => {
                                      e.currentTarget.classList.remove("opacity-50")
                                    }}
                                    className="bg-white border-2 border-gray-300 rounded-lg p-3 cursor-move hover:border-blue-400 hover:shadow-md transition-all"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="bg-gray-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                                        {option.key}
                                      </span>
                                      <span className="text-gray-900 font-medium text-sm">{option.text}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {question.q_type === "FLOW_CHART" && question.choices && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Flow Chart */}
                          <div className="lg:col-span-2">
                            <div className="space-y-3">
                              {Object.entries(question.choices).map(([stepNum, stepText]: [string, any], index) => {
                                const hasBlank = stepText.includes("__")
                                const flowChartQuestionId = question.id.toString()
                                const allAnswers = answers[flowChartQuestionId]
                                const currentAnswer =
                                  allAnswers && typeof allAnswers === "object" && allAnswers[stepNum]
                                    ? allAnswers[stepNum]
                                    : ""

                                const stepQuestionNum = hasBlank
                                  ? getFlowChartStepQuestionNumber(question.id.toString(), stepNum)
                                  : null

                                let selectedOptionText = currentAnswer
                                if (currentAnswer && question.options && Array.isArray(question.options)) {
                                  selectedOptionText = currentAnswer
                                }

                                return (
                                  <React.Fragment key={stepNum}>
                                    <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
                                      {hasBlank ? (
                                        <div className="text-base text-gray-900 leading-relaxed">
                                          {stepText.split("__").map((part: string, partIndex: number) => (
                                            <React.Fragment key={partIndex}>
                                              {part}
                                              {partIndex < stepText.split("__").length - 1 && (
                                                <span
                                                  className={`inline-flex items-center gap-2 min-w-[140px] px-3 py-2 mx-1 border-2 border-dashed rounded transition-all ${
                                                    currentAnswer
                                                      ? "bg-blue-50 border-blue-500 cursor-pointer hover:bg-red-50 hover:border-red-500"
                                                      : "bg-gray-50 border-gray-400 hover:border-blue-400"
                                                  }`}
                                                  onDragOver={(e) => {
                                                    e.preventDefault()
                                                    e.currentTarget.classList.add("bg-blue-100", "scale-105")
                                                  }}
                                                  onDragLeave={(e) => {
                                                    e.currentTarget.classList.remove("bg-blue-100", "scale-105")
                                                  }}
                                                  onDrop={(e) => {
                                                    e.preventDefault()
                                                    e.currentTarget.classList.remove("bg-blue-100", "scale-105")
                                                    const optionKey = e.dataTransfer.getData("text/plain")
                                                    if (optionKey) {
                                                      const fullQuestionId = `${question.id}_flow_${stepNum}`
                                                      handleAnswerChange(flowChartQuestionId, optionKey, fullQuestionId)
                                                    }
                                                  }}
                                                  onClick={() => {
                                                    if (currentAnswer) {
                                                      const fullQuestionId = `${question.id}_flow_${stepNum}`
                                                      handleAnswerChange(flowChartQuestionId, null, fullQuestionId)
                                                    }
                                                  }}
                                                  title={currentAnswer ? "Click to remove" : "Drag option here"}
                                                >
                                                  <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium flex-shrink-0">
                                                    {stepQuestionNum}
                                                  </span>
                                                  {currentAnswer ? (
                                                    <span className="font-semibold text-blue-700">
                                                      {selectedOptionText}
                                                    </span>
                                                  ) : (
                                                    <span className="text-gray-400 text-sm">Drop here</span>
                                                  )}
                                                </span>
                                              )}
                                            </React.Fragment>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-base text-gray-900 leading-relaxed">{stepText}</div>
                                      )}
                                    </div>
                                    {index < Object.keys(question.choices).length - 1 && (
                                      <div className="flex justify-center">
                                        <div className="w-0.5 h-6 bg-gray-400"></div>
                                        <div className="absolute w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-400 mt-6"></div>
                                      </div>
                                    )}
                                  </React.Fragment>
                                )
                              })}
                            </div>
                          </div>

                          {/* Options Panel */}
                          <div className="lg:col-span-1">
                            <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 sticky top-4">
                              <h4 className="font-semibold text-gray-900 mb-4">Options</h4>
                              <div className="space-y-2">
                                {question.options &&
                                  Array.isArray(question.options) &&
                                  question.options
                                    .filter((optionKey: string) => {
                                      const flowChartQuestionId = question.id.toString()
                                      const allAnswers = answers[flowChartQuestionId]
                                      if (!allAnswers || typeof allAnswers !== "object") return true

                                      const isUsed = Object.values(allAnswers).includes(optionKey)
                                      return !isUsed
                                    })
                                    .map((optionKey: string) => (
                                      <div
                                        key={optionKey}
                                        draggable
                                        onDragStart={(e) => {
                                          e.dataTransfer.setData("text/plain", optionKey)
                                          e.currentTarget.classList.add("opacity-50")
                                        }}
                                        onDragEnd={(e) => {
                                          e.currentTarget.classList.remove("opacity-50")
                                        }}
                                        className="bg-white border-2 border-gray-300 rounded-lg p-3 cursor-move hover:border-blue-400 hover:shadow-md transition-all active:scale-95"
                                      >
                                        <div className="flex items-center justify-center">
                                          <span className="text-gray-900 font-medium text-base">{optionKey}</span>
                                        </div>
                                      </div>
                                    ))}
                              </div>
                              {question.options &&
                                Array.isArray(question.options) &&
                                question.options.filter((optionKey: string) => {
                                  const flowChartQuestionId = question.id.toString()
                                  const allAnswers = answers[flowChartQuestionId]
                                  if (!allAnswers || typeof allAnswers !== "object") return true
                                  const isUsed = Object.values(allAnswers).includes(optionKey)
                                  return !isUsed
                                }).length === 0 && (
                                  <p className="text-sm text-gray-500 text-center mt-4">All options used</p>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {question.q_type === "NOTE_COMPLETION" && question.options && (
                      <div className="space-y-4">
                        {/* Instruction text with HTML formatting */}
                        {question.q_text && (
                          <div
                            className="text-base sm:text-lg mb-4 text-gray-900 font-medium leading-relaxed [&_b]:font-bold [&_strong]:font-bold"
                            dangerouslySetInnerHTML={{ __html: question.q_text }}
                          />
                        )}

                        {/* Note content box with border and visible text */}
                        <div className="border-2 border-black rounded-lg p-6 bg-white">
                          {(() => {
                            const optionsText =
                              typeof question.options === "string" ? question.options : JSON.stringify(question.options)

                            // Split by underscores (4 or more underscores)
                            const parts = optionsText.split(/(____+)/)
                            let inputCounter = 0
                            const startQuestionNum = getGlobalQuestionNumber(question.id)

                            return (
                              <div
                                className="text-gray-900 [&_b]:font-bold [&_strong]:font-bold [&_br]:block [&_br]:content-[''] [&_br]:block"
                                style={{
                                  lineHeight: "1.8",
                                  fontSize: "16px",
                                }}
                              >
                                {parts.map((part, index) => {
                                  // If this part is underscores, replace with input
                                  if (part.match(/^____+$/)) {
                                    const currentInputIndex = inputCounter
                                    inputCounter++
                                    const questionNum = startQuestionNum + currentInputIndex
                                    const inputId = `${question.id}_note_${currentInputIndex}`
                                    const currentAnswer = answers[inputId] || ""

                                    return (
                                      <span key={index} className="inline-flex items-center mx-1">
                                        <Input
                                          value={currentAnswer}
                                          onChange={(e) => handleAnswerChange(inputId, e.target.value, inputId)}
                                          className="inline-block w-32 px-3 py-1.5 text-center text-sm bg-gray-50 border-2 border-gray-400 focus:border-blue-500 focus:bg-white placeholder:text-gray-500 placeholder:font-medium rounded"
                                          placeholder={questionNum.toString()}
                                        />
                                      </span>
                                    )
                                  } else {
                                    // Regular text with HTML formatting - ensure text is visible
                                    return (
                                      <span
                                        key={index}
                                        className="text-gray-900"
                                        dangerouslySetInnerHTML={{ __html: part }}
                                      />
                                    )
                                  }
                                })}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}

                    {![
                      "TFNG",
                      "TRUE_FALSE_NOT_GIVEN",
                      "MCQ_SINGLE",
                      "MCQ_MULTI",
                      "SENTENCE_COMPLETION",
                      "SENTENCE_ENDINGS",
                      "MATCHING_INFORMATION",
                      "TABLE_COMPLETION",
                      "MAP_LABELING",
                      "FLOW_CHART",
                      "NOTE_COMPLETION", // Add to exclusion list
                    ].includes(question.q_type || "") && (
                      <div className="space-y-2">
                        <Input
                          value={currentAnswer || ""}
                          onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                          className="w-full text-sm sm:text-base bg-white border-gray-300 focus:border-blue-500"
                          placeholder="Answer"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 shadow-lg z-50">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => currentPart > 1 && switchToPart(currentPart - 1)}
              disabled={currentPart <= 1}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-800 text-white rounded flex items-center justify-center disabled:opacity-50 hover:bg-gray-700 transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => currentPart < 4 && switchToPart(currentPart + 1)}
              disabled={currentPart >= 4}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-800 text-white rounded flex items-center justify-center disabled:opacity-50 hover:bg-gray-700 transition-colors"
            >
              →
            </button>
          </div>

          <div className="flex items-center space-x-8 overflow-x-auto max-w-full">
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {allParts.map((part) => {
                // Calculate question range for this part
                const partQuestions = getQuestionsByPart(part.partNumber)
                let firstQuestionNum = 0
                let lastQuestionNum = 0

                if (partQuestions.length > 0) {
                  firstQuestionNum = getGlobalQuestionNumber(partQuestions[0].id)
                  lastQuestionNum = firstQuestionNum
                  partQuestions.forEach((q) => {
                    lastQuestionNum += getQuestionCount(q) - 1
                  })
                }

                let totalSubQuestions = 0
                let answeredSubQuestions = 0

                partQuestions.forEach((q) => {
                  const count = getQuestionCount(q)
                  totalSubQuestions += count
                  for (let i = 0; i < count; i++) {
                    if (isSubQuestionAnswered(q, i)) {
                      answeredSubQuestions++
                    }
                  }
                })

                const allPartQuestionsAnswered = answeredSubQuestions === totalSubQuestions && totalSubQuestions > 0

                return (
                  <button
                    key={part.partNumber}
                    onClick={() => switchToPart(part.partNumber)}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      allPartQuestionsAnswered
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-white text-gray-900 hover:bg-gray-50"
                    } ${currentPart === part.partNumber ? "ring-2 ring-gray-600 ring-offset-1" : ""}`}
                    title={`Questions ${firstQuestionNum}–${lastQuestionNum}`}
                  >
                    Part {part.partNumber}
                    <span className="block text-[10px] text-gray-500">
                      {firstQuestionNum}–{lastQuestionNum}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center space-x-1 flex-wrap justify-center">
              {(() => {
                const questionButtons: ReactElement[] = []
                let currentQuestionNum = 1

                allQuestions.forEach((question) => {
                  const questionCount = getQuestionCount(question)
                  const isCurrentPart = question.part === `PART${currentPart}`

                  for (let i = 0; i < questionCount; i++) {
                    const questionNum = currentQuestionNum + i
                    const isAnswered = isSubQuestionAnswered(question, i)

                    questionButtons.push(
                      <button
                        key={`${question.id}_${i}`}
                        onClick={() => {
                          const questionPart = Number.parseInt(question.part.replace("PART", ""))
                          if (questionPart !== currentPart) {
                            switchToPart(questionPart)
                          }
                          setTimeout(() => jumpToQuestion(question.id), 100)
                        }}
                        className={`w-6 h-6 sm:w-8 sm:h-8 text-xs font-medium rounded transition-all ${
                          isAnswered
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : isCurrentPart
                              ? "bg-gray-500 text-white hover:bg-gray-600"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        } ${isCurrentPart ? "ring-2 ring-gray-600 ring-offset-1" : ""}`}
                        title={`Question ${questionNum} - ${question.part}${isAnswered ? " (Answered)" : ""}`}
                      >
                        {questionNum}
                      </button>,
                    )
                  }

                  currentQuestionNum += questionCount
                })

                return questionButtons
              })()}
            </div>
          </div>

          <div>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-black hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-md disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Test"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

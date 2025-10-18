"use client"

import React from "react"

import { useEffect, useState, useRef, type ReactElement } from "react" // Import React for Fragment
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { markSectionCompleted, areAllSectionsCompleted } from "@/lib/test-strotage"
import { Volume2, VolumeX, Wifi, Bell, Menu, X } from "lucide-react"
import { useCustomAlert } from "@/components/custom-allert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CompletionModal } from "@/components/completion-modal"
// import { SummaryDragQuestion } from "@/components/summary-drag-question" // Removed import

interface LQuestion {
  id: number
  listening_questions_id: number
  q_type: string
  q_type_detail?: string // For specific question types like MAP_LABELING
  q_text: string
  instruction?: string // Added instruction field
  options?: any
  correct_answers?: string | string[]
  columns?: any
  rows?: any // For table completion, matching info, map labeling
  choices?: any // For matching info, flow chart, map labeling
  answers?: any
  match_pairs?: any
  photo?: string | null
  createdAt: string
  updatedAt: string
  groupId: string // Added groupId
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

export default function ListeningTestPage({ params }: { params: Promise<{ examId: string }> }) {
  const paramsParsed = useParams()
  const examId = paramsParsed.examId as string
  const router = useRouter()
  const [testData, setTestData] = useState<ListeningTestData | null>(null)
  const [currentPart, setCurrentPart] = useState(1)
  const [expandedPart, setExpandedPart] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({}) // Consolidated state for answers
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
  const [audioDurationLoaded, setAudioDurationLoaded] = useState(false)

  const [showSettings, setShowSettings] = useState(false)
  const [textSize, setTextSize] = useState(16)
  const [colorMode, setColorMode] = useState<"default" | "night" | "yellow">("default")

  const [showCompletionModal, setShowCompletionModal] = useState(false)

  // State for Summary Drag and Drop
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragSource, setDragSource] = useState<string | null>(null)

  const getUserId = () => {
    try {
      const userData = localStorage.getItem("user")
      if (userData) {
        const user = JSON.Parse(userData)
        return user.user.id ? String(user.user.id) : "null"
      }
    } catch (error) {
      console.error("[v0] Error parsing user data from localStorage:", error)
    }
    return "1" // fallback to "1" as string if no user data found
  }

  const [userId, setUserId] = useState<string>("null")

  const { showAlert, AlertComponent } = useCustomAlert()
  const audioRef = useRef<HTMLAudioElement>(null)
  const questionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  // Added state for current question index
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  useEffect(() => {
    setUserId(getUserId())
    fetchTestData()
  }, [examId])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !testData?.audio_url) {
      console.log("[v0] Audio element or URL not ready yet")
      return
    }

    console.log("[v0] Setting up audio duration detection for:", testData.audio_url)

    const updateTime = () => {
      setAudioCurrentTime(audio.currentTime)
    }

    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        console.log("[v0] Audio duration successfully loaded:", audio.duration, "seconds")
        console.log("[v0] Formatted duration:", formatAudioTime(audio.duration))
        setAudioDuration(audio.duration)
        setAudioDurationLoaded(true)
      } else {
        console.log("[v0] Audio duration not ready yet, readyState:", audio.readyState)
      }
    }

    const handleCanPlay = () => {
      console.log("[v0] Audio can play event triggered")
      updateDuration()
    }

    const handleLoadedMetadata = () => {
      console.log("[v0] Audio metadata loaded event triggered")
      updateDuration()
    }

    const handleError = (e: Event) => {
      console.error("[v0] Audio loading error:", e)
      showAlert({
        title: "Audio Loading Error",
        description: "Failed to load audio file. Please check your connection and try again.",
        type: "error",
        confirmText: "OK",
        showCancel: false,
      })
    }

    // Add event listeners
    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("durationchange", updateDuration)
    audio.addEventListener("canplay", handleCanPlay)
    audio.addEventListener("error", handleError)

    // Try to get duration immediately if audio is already loaded
    if (audio.readyState >= 1) {
      console.log("[v0] Audio already loaded, getting duration immediately")
      updateDuration()
    }

    // Force load metadata
    audio.load()

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("durationchange", updateDuration)
      audio.removeEventListener("canplay", handleCanPlay)
      audio.removeEventListener("error", handleError)
    }
  }, [testData]) // Now depends on testData so it runs when audio URL is available

  const increaseTextSize = () => {
    setTextSize((prev) => Math.min(prev + 2, 24))
  }

  const decreaseTextSize = () => {
    setTextSize((prev) => Math.max(prev - 2, 12))
  }

  const getColorModeClasses = () => {
    switch (colorMode) {
      case "night":
        return "bg-gray-900 text-white"
      case "yellow":
        return "bg-yellow-50 text-gray-900"
      default:
        return "bg-white text-gray-900"
    }
  }

  const getHeaderColorClasses = () => {
    const audioTimeRemaining =
      audioDurationLoaded && audioDuration > 0 ? Math.max(0, audioDuration + 120 - audioCurrentTime) : 0
    const isWarningMode = audioTimeRemaining > 0 && audioTimeRemaining < 120

    if (timerActive && timeRemaining < 120) {
      return "bg-red-600 border-red-700"
    }

    switch (colorMode) {
      case "night":
        return "bg-gray-800 border-gray-700"
      case "yellow":
        return "bg-yellow-100 border-yellow-200"
      default:
        return "bg-white border-gray-200"
    }
  }

  const getNavigationColorClasses = () => {
    switch (colorMode) {
      case "night":
        return "bg-gray-800 border-gray-700"
      case "yellow":
        return "bg-yellow-100 border-yellow-200"
      default:
        return "bg-white border-gray-200"
    }
  }

  const audioTimeRemaining =
    audioDurationLoaded && audioDuration > 0 ? Math.max(0, audioDuration + 120 - audioCurrentTime) : 0
  const isWarningMode = audioTimeRemaining > 0 && audioTimeRemaining < 120

  console.log(audioTimeRemaining, isWarningMode)
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
              // Check for empty cells or cells with underscores
              if (cell === "" || cell === "_" || (typeof cell === "string" && /_+/.test(cell))) {
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
      if (question.options) {
        const optionsText = typeof question.options === "string" ? question.options : JSON.stringify(question.options)
        const underscoreMatches = optionsText.match(/____+/g)
        return underscoreMatches ? underscoreMatches.length : 1
      }
      return 1
    } else if (question.q_type === "TFNG") {
      if (question.choices) {
        try {
          let choicesData: any
          if (typeof question.choices === "object") {
            choicesData = question.choices
          } else if (typeof question.choices === "string") {
            choicesData = JSON.parse(question.choices)
          }
          return Object.keys(choicesData).length
        } catch (error) {
          console.error("[v0] Failed to parse TFNG choices:", error)
          return 1
        }
      }
      return 1
    } else if (question.q_type === "SUMMARY_DRAG") {
      if (question.options && typeof question.options === "object") {
        return Object.keys(question.options).length
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

  const getQuestionType = (questionId: string): string => {
    const baseQuestionId = questionId.split("_")[0]
    const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
    return question?.q_type || "UNKNOWN"
  }

  const handleAnswerChange = (questionId: string, answer: any, questionIdentifier?: string) => {
    const questionIdStr = questionId.toString()
    const questionType = getQuestionType(questionIdStr)

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

    const answersKey = `listening_answers_${examId}_${userId}`
    let answersArray = JSON.parse(localStorage.getItem(answersKey) || "[]")

    const question = getAllQuestions().find((q) => q.id.toString() === questionIdStr.split("_")[0])
    const actualQuestionType = question?.q_type || "UNKNOWN"

    const isEmptyAnswer =
      !answer || (typeof answer === "string" && answer.trim() === "") || (Array.isArray(answer) && answer.length === 0)

    if (!isEmptyAnswer) {
      const formattedAnswer = answer

      if (actualQuestionType === "TFNG" && questionIdentifier && questionIdentifier.includes("_map_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const choiceNum = parts[2]
        const selectedOption = answer

        console.log("[v0] TFNG answer change:", { baseQuestionId, choiceNum, selectedOption })

        const tfngQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (!tfngQuestion) {
          console.error("[v0] Could not find TFNG question for baseQuestionId:", baseQuestionId)
          return
        }

        const l_questionsID = tfngQuestion.id

        // Find existing TFNG answer for this question
        const existingAnswerIndex = answersArray.findIndex(
          (item: any) => item.l_questionsID === l_questionsID && item.question_type === "TFNG",
        )

        let tfngAnswers: Record<string, string> = {}

        if (existingAnswerIndex !== -1) {
          // Get existing answers object
          const existingAnswer = answersArray[existingAnswerIndex].answer
          tfngAnswers = typeof existingAnswer === "object" ? { ...existingAnswer } : {}
          console.log("[v0] Existing TFNG answers:", tfngAnswers)
          // Remove the old entry
          answersArray.splice(existingAnswerIndex, 1)
        }

        // Update the specific choice
        tfngAnswers[choiceNum] = selectedOption
        console.log("[v0] Updated TFNG answers:", tfngAnswers)

        // Add updated entry
        answersArray.push({
          userId: String(userId),
          questionId: tfngQuestion.listening_questions_id,
          examId: Number.parseInt(examId),
          question_type: actualQuestionType,
          answer: tfngAnswers,
          l_questionsID: l_questionsID,
        })

        console.log("[v0] Saved TFNG to localStorage:", {
          l_questionsID,
          answer: tfngAnswers,
        })
      } else if (questionIdentifier && questionIdentifier.includes("_map_")) {
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

        answersArray = answersArray.filter(
          (item: any) => !(item.l_questionsID === actualLQuestionId && item.answer?.startsWith(`${position}:`)),
        )

        answersArray.push({
          userId: String(userId),
          questionId: mapQuestion.listening_questions_id,
          examId: Number.parseInt(examId),
          question_type: actualQuestionType,
          answer: `${position}:${selectedOptionKey}`,
          l_questionsID: actualLQuestionId,
        })
      } else if (questionIdStr.includes("_table_")) {
        const parts = question.split("_table_")
        const baseQuestionId = parts[0]
        const [rowIndex, cellIndex] = parts[1].split("_").map(Number)

        const tableQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (!tableQuestion) {
          console.error("[v0] Could not find TABLE question for baseQuestionId:", baseQuestionId)
          return
        }

        const cellKey = `${rowIndex}_${cellIndex}`

        // Calculate unique l_questionsID for this cell
        const allQuestions = getAllQuestions()
        const baseQuestionIndex = allQuestions.findIndex((q) => q.id.toString() === baseQuestionId)

        let questionCounter = 1
        for (let i = 0; i < baseQuestionIndex; i++) {
          questionCounter += getQuestionCount(allQuestions[i])
        }

        // Count how many cells come before this one in the table
        let cellOffset = 0
        if (tableQuestion.rows) {
          for (let r = 0; r < tableQuestion.rows.length; r++) {
            const row = tableQuestion.rows[r]
            if (row.cells) {
              for (let c = 0; c < row.cells.length; c++) {
                const cell = row.cells[c]
                const isEmptyOrUnderscore = cell === "" || cell === "_"
                const hasUnderscores = typeof cell === "string" && /_+/.test(cell) && !isEmptyOrUnderscore

                if (isEmptyOrUnderscore || hasUnderscores) {
                  if (r === rowIndex && c === cellIndex) {
                    break
                  }
                  cellOffset++
                }
              }
              if (rowIndex === r) break
            }
          }
        }

        const uniqueLQuestionsID = questionCounter + cellOffset

        // Remove existing entry for this cell
        answersArray = answersArray.filter((item: any) => item.l_questionsID !== uniqueLQuestionsID)

        // Add new entry with answer format: {"rowIndex_cellIndex": "value"}
        answersArray.push({
          userId: String(userId),
          questionId: tableQuestion.listening_questions_id,
          examId: Number.parseInt(examId),
          question_type: actualQuestionType,
          answer: { [cellKey]: answer },
          l_questionsID: uniqueLQuestionsID,
        })

        // Update state for UI
        const tableAnswersKey = `${baseQuestionId}_answer`
        const currentTableAnswers = answers[tableAnswersKey] || {}
        const updatedTableAnswers = {
          ...currentTableAnswers,
          [cellKey]: answer,
        }

        setAnswers((prev) => ({
          ...prev,
          [tableAnswersKey]: updatedTableAnswers,
        }))
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

        answersArray = answersArray.filter((item: any) => item.l_questionsID !== uniqueLQuestionsID)

        answersArray.push({
          userId: String(userId),
          questionId: l_questionsID,
          examId: Number.parseInt(examId),
          question_type: actualQuestionType,
          answer: answer,
          l_questionsID: uniqueLQuestionsID,
        })
      } else if (actualQuestionType === "MCQ_MULTI" && Array.isArray(answer)) {
        const question = getAllQuestions().find((q) => q.id.toString() === questionIdStr)
        const l_questionsID = question?.listening_questions_id

        answersArray = answersArray.filter((item: any) => item.questionId !== l_questionsID)

        answer.forEach((selectedOption, index) => {
          answersArray.push({
            userId: String(userId),
            questionId: l_questionsID,
            examId: Number.parseInt(examId),
            question_type: actualQuestionType,
            answer: selectedOption,
            l_questionsID: Number.parseInt(questionIdStr) + index,
          })
        })
      } else if (actualQuestionType === "FLOW_CHART" && questionIdentifier && questionIdentifier.includes("_flow_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const stepNum = parts[2]

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        const l_questionsID = question?.listening_questions_id

        answersArray = answersArray.filter(
          (item: any) => !(item.questionId === l_questionsID && item.answer?.startsWith(`${stepNum}:`)),
        )

        answersArray.push({
          userId: String(userId),
          questionId: l_questionsID,
          examId: Number.parseInt(examId),
          question_type: actualQuestionType,
          answer: `${stepNum}:${answer}`,
          l_questionsID: l_questionsID,
        })
      } else if (
        actualQuestionType === "NOTE_COMPLETION" &&
        questionIdentifier &&
        questionIdentifier.includes("_note_")
      ) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const inputIndex = Number.parseInt(parts[2])

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        const l_questionsID = question?.listening_questions_id

        const allQuestions = getAllQuestions()
        const baseQuestionIndex = allQuestions.findIndex((q) => q.id === question.id)
        let questionCounter = 1
        for (let i = 0; i < baseQuestionIndex; i++) {
          questionCounter += getQuestionCount(allQuestions[i])
        }
        const actualQuestionNumber = questionCounter + inputIndex

        answersArray = answersArray.filter((item: any) => item.l_questionsID !== actualQuestionNumber)

        answersArray.push({
          userId: String(userId),
          questionId: l_questionsID,
          examId: Number.parseInt(examId),
          question_type: actualQuestionType,
          answer: { [(inputIndex + 1).toString()]: answer },
          l_questionsID: actualQuestionNumber,
        })
      } else if (actualQuestionType === "SUMMARY_DRAG") {
        // Assuming answer is an object like { [word_id]: { text: string, position: number } }
        const summaryAnswersKey = `${questionIdStr}_summary_answers`
        const existingSummaryAnswers = answers[summaryAnswersKey] || {}

        const newSummaryAnswers = {
          ...existingSummaryAnswers,
          ...answer, // Merge the incoming answer changes
        }

        // Update state for UI
        setAnswers((prev) => ({
          ...prev,
          [summaryAnswersKey]: newSummaryAnswers,
        }))

        // Prepare for localStorage saving
        const existingLocalStorageAnswers = JSON.parse(localStorage.getItem(answersKey) || "[]")
        const currentQuestionInLocalStorage = existingLocalStorageAnswers.find(
          (item: any) => item.l_questionsID === question?.id && item.question_type === "SUMMARY_DRAG",
        )

        if (currentQuestionInLocalStorage) {
          // Update existing entry
          currentQuestionInLocalStorage.answer = newSummaryAnswers
        } else {
          // Add new entry
          existingLocalStorageAnswers.push({
            userId: String(userId),
            questionId: question?.listening_questions_id,
            examId: Number.parseInt(examId),
            question_type: actualQuestionType,
            answer: newSummaryAnswers,
            l_questionsID: question?.id,
          })
        }
        answersArray = existingLocalStorageAnswers // Update the main array for final save
      } else {
        const question = getAllQuestions().find((q) => q.id.toString() === questionIdStr)
        const l_questionsID = question?.listening_questions_id

        answersArray = answersArray.filter(
          (item: any) => !(item.questionId === l_questionsID && item.l_questionsID === Number.parseInt(questionIdStr)),
        )

        answersArray.push({
          userId: String(userId),
          questionId: l_questionsID,
          examId: Number.parseInt(examId),
          question_type: actualQuestionType,
          answer: formattedAnswer,
          l_questionsID: Number.parseInt(questionIdStr),
        })
      }
    } else {
      if (actualQuestionType === "TFNG" && questionIdentifier && questionIdentifier.includes("_map_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const choiceNum = parts[2]

        console.log("[v0] TFNG answer removal:", { baseQuestionId, choiceNum })

        const tfngQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (tfngQuestion) {
          const l_questionsID = tfngQuestion.id

          // Find existing TFNG answer
          const existingAnswerIndex = answersArray.findIndex(
            (item: any) => item.l_questionsID === l_questionsID && item.question_type === "TFNG",
          )

          if (existingAnswerIndex !== -1) {
            const existingAnswer = answersArray[existingAnswerIndex].answer
            const tfngAnswers = typeof existingAnswer === "object" ? { ...existingAnswer } : {}

            console.log("[v0] Before removal:", tfngAnswers)

            // Remove the specific choice
            delete tfngAnswers[choiceNum]

            console.log("[v0] After removal:", tfngAnswers)

            // Remove the old entry
            answersArray.splice(existingAnswerIndex, 1)

            // If there are still answers left, add updated entry
            if (Object.keys(tfngAnswers).length > 0) {
              answersArray.push({
                userId: String(userId),
                questionId: tfngQuestion.listening_questions_id,
                examId: Number.parseInt(examId),
                question_type: actualQuestionType,
                answer: tfngAnswers,
                l_questionsID: l_questionsID,
              })
            }
          }
        }
      } else if (questionIdentifier && questionIdentifier.includes("_map_")) {
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
        const parts = question.split("_table_")
        const baseQuestionId = parts[0]
        const [rowIndex, cellIndex] = parts[1].split("_").map(Number)

        const tableQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (tableQuestion) {
          const allQuestions = getAllQuestions()
          const baseQuestionIndex = allQuestions.findIndex((q) => q.id.toString() === baseQuestionId)

          let questionCounter = 1
          for (let i = 0; i < baseQuestionIndex; i++) {
            questionCounter += getQuestionCount(allQuestions[i])
          }

          let cellOffset = 0
          if (tableQuestion.rows) {
            for (let r = 0; r < tableQuestion.rows.length; r++) {
              const row = tableQuestion.rows[r]
              if (row.cells) {
                for (let c = 0; c < row.cells.length; c++) {
                  const cell = row.cells[c]
                  const isEmptyOrUnderscore = cell === "" || cell === "_"
                  const hasUnderscores = typeof cell === "string" && /_+/.test(cell) && !isEmptyOrUnderscore

                  if (isEmptyOrUnderscore || hasUnderscores) {
                    if (r === rowIndex && c === cellIndex) {
                      break
                    }
                    cellOffset++
                  }
                }
                if (rowIndex === r) break
              }
            }
          }

          const uniqueLQuestionsID = questionCounter + cellOffset
          answersArray = answersArray.filter((item: any) => item.l_questionsID !== uniqueLQuestionsID)
        }

        // Update state
        const tableAnswersKey = `${baseQuestionId}_answer`
        const currentTableAnswers = answers[tableAnswersKey] || {}
        const cellKey = `${rowIndex}_${cellIndex}`
        const updatedTableAnswers = { ...currentTableAnswers }
        delete updatedTableAnswers[cellKey]

        setAnswers((prev) => ({
          ...prev,
          [tableAnswersKey]: Object.keys(updatedTableAnswers).length > 0 ? updatedTableAnswers : null,
        }))
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
      } else if (actualQuestionType === "FLOW_CHART" && questionIdentifier && questionIdentifier.includes("_flow_")) {
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
      } else if (
        actualQuestionType === "NOTE_COMPLETION" &&
        questionIdentifier &&
        questionIdentifier.includes("_note_")
      ) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const inputIndex = Number.parseInt(parts[2])

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (question) {
          const allQuestions = getAllQuestions()
          const baseQuestionIndex = allQuestions.findIndex((q) => q.id === question.id)
          let questionCounter = 1
          for (let i = 0; i < baseQuestionIndex; i++) {
            questionCounter += getQuestionCount(allQuestions[i])
          }

          const actualQuestionNumber = questionCounter + inputIndex
          answersArray = answersArray.filter((item: any) => item.l_questionsID !== actualQuestionNumber)
        }
      } else if (actualQuestionType === "SUMMARY_DRAG") {
        // Remove specific word from localStorage and state
        const summaryAnswersKey = `${questionIdStr}_summary_answers`
        const existingSummaryAnswers = answers[summaryAnswersKey] || {}

        if (answer && typeof answer === "object" && answer.hasOwnProperty("wordIdToRemove")) {
          const { wordIdToRemove } = answer
          const newSummaryAnswers = { ...existingSummaryAnswers }
          delete newSummaryAnswers[wordIdToRemove]

          // Update state for UI
          setAnswers((prev) => ({
            ...prev,
            [summaryAnswersKey]: Object.keys(newSummaryAnswers).length > 0 ? newSummaryAnswers : null,
          }))

          // Update localStorage
          const existingLocalStorageAnswers = JSON.parse(localStorage.getItem(answersKey) || "[]")
          const currentQuestionInLocalStorage = existingLocalStorageAnswers.find(
            (item: any) => item.l_questionsID === question?.id && item.question_type === "SUMMARY_DRAG",
          )

          if (currentQuestionInLocalStorage) {
            currentQuestionInLocalStorage.answer = Object.keys(newSummaryAnswers).length > 0 ? newSummaryAnswers : null
          }
          answersArray = existingLocalStorageAnswers
        }
      } else if (actualQuestionType === "MCQ_MULTI") {
        const question = getAllQuestions().find((q) => q.id.toString() === questionIdStr)
        const l_questionsID = question?.listening_questions_id
        answersArray = answersArray.filter((item: any) => item.questionId !== l_questionsID)
      } else {
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
        title: "Testni yakunlash",
        description: "Rostdan ham testni yakunlamoqchimisiz? Bu amalni bekor qilib bo'lmaydi.",
        type: "warning",
        confirmText: "Ha, yakunlash",
        cancelText: "Yo'q, davom etish",
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

      // Read from the correct localStorage key
      const answersKey = `listening_answers_${examId}_${userId}`
      const savedAnswers = localStorage.getItem(answersKey)

      if (!savedAnswers) {
        console.log("[v0] No answers found in localStorage")
        showAlert({
          title: "Xatolik",
          description: "Javoblar topilmadi. Iltimos, qaytadan urinib ko'ring.",
          type: "error",
          confirmText: "OK",
          showCancel: false,
        })
        setShowSubmitLoading(false)
        return
      }

      const answersArray = JSON.parse(savedAnswers)
      console.log("[v0] Submitting answers:", answersArray)

      // Post all answers to listening_answers API
      for (const answerData of answersArray) {
        const response = await fetch(`${API_BASE_URL}/listening_answers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(answerData),
        })

        if (!response.ok) {
          throw new Error(`Failed to submit answer: ${response.statusText}`)
        }
      }

      // Clear localStorage after successful submission
      localStorage.removeItem(answersKey)

      markSectionCompleted(examId, "listening")
      console.log("[v0] Marked listening section as completed")

      if (areAllSectionsCompleted(examId)) {
        console.log("[v0] All sections completed! Showing celebration modal")
        setShowCompletionModal(true)
      } else {
        showAlert({
          title: "Muvaffaqiyatli!",
          description: "Javoblaringiz muvaffaqiyatli yuborildi.",
          type: "success",
          confirmText: "OK",
          showCancel: false,
          onConfirm: () => {
            router.push(`/mock/${examId}`)
          },
        })
      }
    } catch (error) {
      console.error("[v0] Failed to submit listening test:", error)
      showAlert({
        title: "Xatolik",
        description: "Javoblarni yuborishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.",
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
          groupId: questionGroup.id, // Assign groupId to each l_question
        })),
      ) || []
    )
  }

  const getQuestionsByPart = (part: number) => {
    const partName = `PART${part}`
    return getAllQuestions().filter((q) => q.part === partName)
  }

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

  const isSubQuestionAnswered = (question: any, subIndex: number): boolean => {
    const questionIdStr = question.id.toString()

    if (question.q_type === "TABLE_COMPLETION") {
      const tableAnswersKey = `${questionIdStr}_answer`
      const answersForThisTableQuestion = answers[tableAnswersKey]

      if (answersForThisTableQuestion && typeof answersForThisTableQuestion === "object") {
        let currentCellIndex = 0
        if (question.rows && Array.isArray(question.rows)) {
          for (let r = 0; r < question.rows.length; r++) {
            const row = question.rows[r]
            if (row.cells && Array.isArray(row.cells)) {
              for (let c = 0; c < row.cells.length; c++) {
                const cell = row.cells[c]
                const isEmptyOrUnderscore = cell === "" || cell === "_" || (typeof cell === "string" && /_+/.test(cell))
                if (isEmptyOrUnderscore) {
                  if (currentCellIndex === subIndex) {
                    const answerKey = `${r}_${c}`
                    return (
                      answersForThisTableQuestion[answerKey] !== undefined &&
                      answersForThisTableQuestion[answerKey] !== ""
                    )
                  }
                  currentCellIndex++
                }
              }
            }
          }
        }
      }
      return false
    } else if (question.q_type === "MATCHING_INFORMATION") {
      const answer = answers[`${questionIdStr}_matching_${subIndex}`]
      return answer !== undefined && answer !== "" && answer !== null
    } else if (question.q_type === "MAP_LABELING") {
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
      if (question.choices && typeof question.choices === "object") {
        let blankCounter = 0
        const sortedSteps = Object.entries(question.choices).sort(([a], [b]) => Number(a) - Number(b))

        for (const [step, text] of sortedSteps) {
          if (typeof text === "string" && text.includes("__")) {
            if (blankCounter === subIndex) {
              const allAnswers = answers[question.id.toString()]
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
      const answer = answers[questionIdStr]
      if (Array.isArray(answer)) {
        // Check if the specific subIndex is answered (for questions with multiple correct answers)
        // This logic needs refinement if the intention is to check if ANY sub-question is answered.
        // For now, it checks if the count of answered options is greater than the subIndex.
        return answer.length > subIndex
      }
      return false
    } else if (question.q_type === "NOTE_COMPLETION") {
      const answersKey = `listening_answers_${examId}_${userId}`
      const savedAnswers = localStorage.getItem(answersKey)
      const answersArray: any[] = savedAnswers ? JSON.parse(savedAnswers) : []

      const allQuestions = getAllQuestions()
      const baseQuestionIndex = allQuestions.findIndex((q) => q.id === question.id)
      let questionCounter = 1
      for (let i = 0; i < baseQuestionIndex; i++) {
        questionCounter += getQuestionCount(allQuestions[i])
      }
      const actualQuestionNumber = questionCounter + subIndex

      const answerEntry = answersArray.find(
        (item: any) => item.l_questionsID === actualQuestionNumber && item.question_type === "NOTE_COMPLETION",
      )
      return answerEntry !== undefined && answerEntry.answer !== undefined && answerEntry.answer !== ""
    } else if (question.q_type === "TFNG") {
      // Check each TFNG choice individually
      const questionIdNum = Number.parseInt(questionIdStr)
      const answersKey = `listening_answers_${examId}_${userId}`
      const savedAnswers = localStorage.getItem(answersKey)
      const answersArray: any[] = savedAnswers ? JSON.parse(savedAnswers) : []

      const answerEntry = answersArray.find(
        (item: any) => item.l_questionsID === questionIdNum && item.question_type === "TFNG",
      )
      if (!answerEntry || typeof answerEntry.answer !== "object") {
        return false
      }

      // Get the specific choice number for this subIndex
      let choicesData: Record<string, string> = {}
      if (question.choices) {
        if (typeof question.choices === "object") {
          choicesData = question.choices
        } else if (typeof question.choices === "string") {
          try {
            choicesData = JSON.parse(question.choices)
          } catch (e) {
            return false
          }
        }
      }

      const choiceKeys = Object.keys(choicesData)
      if (subIndex < choiceKeys.length) {
        const choiceNum = choiceKeys[subIndex]
        const answer = answerEntry.answer[choiceNum]
        return answer !== undefined && answer !== "" && answer !== null
      }

      return false
    } else if (question.q_type === "SUMMARY_DRAG") {
      const summaryAnswersKey = `${questionIdStr}_summary_answers`
      const summaryAnswers = answers[summaryAnswersKey]
      if (summaryAnswers && typeof summaryAnswers === "object") {
        // Check if the specific input for this subIndex is filled
        const answerValue = summaryAnswers[Object.keys(summaryAnswers)[subIndex]] // Assuming subIndex maps to a word index
        return answerValue !== undefined && answerValue.text !== "" && answerValue.text !== null
      }
      return false
    } else {
      const answer = answers[questionIdStr]
      return answer !== undefined && answer !== "" && answer !== null
    }
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

  const getPartQuestionRange = (partNumber: number): { start: number; end: number } => {
    const allQuestions = getAllQuestions()
    let currentQuestionIndex = 1

    console.log("[v0] Calculating range for Part", partNumber)
    console.log("[v0] Total questions:", allQuestions.length)

    for (let i = 1; i <= 4; i++) {
      const questionsInPart = getQuestionsByPart(i)
      const partQuestionCount = questionsInPart.reduce((sum, q) => sum + getQuestionCount(q), 0)

      console.log(`[v0] Part ${i}: ${partQuestionCount} questions, starts at ${currentQuestionIndex}`)
      console.log(
        `[v0] Part ${i} questions:`,
        questionsInPart.map((q) => ({ id: q.id, part: q.part, type: q.q_type })),
      )

      if (i === partNumber) {
        const range = { start: currentQuestionIndex, end: currentQuestionIndex + partQuestionCount - 1 }
        console.log(`[v0] Returning range for Part ${partNumber}:`, range)
        return range
      }
      currentQuestionIndex += partQuestionCount
    }
    return { start: 0, end: 0 } // Should not happen
  }

  const getPartBasedQuestionNumber = (questionId: number | string, part: string): number => {
    const allQuestions = getAllQuestions()
    let currentQuestionNumber = 0
    for (const q of allQuestions) {
      if (q.part === part) {
        const qIdStr = typeof questionId === "string" ? questionId : questionId.toString()
        if (q.id.toString() === qIdStr) {
          return currentQuestionNumber + 1
        }
        currentQuestionNumber += getQuestionCount(q)
      } else if (q.part > part) {
        break
      }
    }
    return 1 // Fallback
  }

  const getTableCellPartBasedQuestionNumber = (
    questionId: string,
    rowIndex: number,
    cellIndex: number,
    part: string,
  ): number => {
    const baseQuestionId = questionId.split("_")[0]
    const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

    if (!question) return 1

    const allQuestions = getAllQuestions()
    let currentQuestionNumber = 0
    for (const q of allQuestions) {
      if (q.part === part) {
        if (q.id.toString() === baseQuestionId) {
          let cellCounter = 0
          if (q.rows && Array.isArray(q.rows)) {
            for (let r = 0; r < q.rows.length; r++) {
              const row = q.rows[r]
              if (row.cells && Array.isArray(row.cells)) {
                for (let c = 0; c < row.cells.length; c++) {
                  const cell = row.cells[c]
                  const isEmptyOrUnderscore = cell === "" || cell === "_"
                  const hasUnderscores = typeof cell === "string" && /_+/.test(cell) && !isEmptyOrUnderscore
                  if (isEmptyOrUnderscore || hasUnderscores) {
                    if (r === rowIndex && c === cellIndex) {
                      return currentQuestionNumber + cellCounter + 1
                    }
                    cellCounter++
                  }
                }
              }
            }
          }
          break // Found the question, but cell wasn't in blanks
        }
        currentQuestionNumber += getQuestionCount(q)
      } else if (q.part > part) {
        break
      }
    }
    return 1 // Fallback
  }

  const getFlowChartStepPartBasedQuestionNumber = (questionId: string, stepNum: string, part: string): number => {
    const baseQuestionId = questionId.split("_")[0]
    const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

    if (!question) return 1

    const allQuestions = getAllQuestions()
    let questionCounter = 0
    for (const q of allQuestions) {
      if (q.part === part) {
        if (q.id.toString() === baseQuestionId) {
          let blankCounter = 0
          const sortedSteps = Object.entries(question.choices || {}).sort(([a], [b]) => Number(a) - Number(b))
          for (const [step, text] of sortedSteps) {
            if (typeof text === "string" && text.includes("__")) {
              if (step === stepNum) {
                return questionCounter + blankCounter + 1
              }
              blankCounter++
            }
          }
          break
        }
        questionCounter += getQuestionCount(q)
      } else if (q.part > part) {
        break
      }
    }
    return 1 // Fallback
  }

  const getNoteCompletionPartBasedQuestionNumber = (questionId: string, inputIndex: number, part: string): number => {
    const baseQuestionId = questionId.split("_")[0]
    const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

    if (!question) return 1

    const allQuestions = getAllQuestions()
    let questionCounter = 0
    for (const q of allQuestions) {
      if (q.part === part) {
        if (q.id.toString() === baseQuestionId) {
          return questionCounter + inputIndex + 1
        }
        questionCounter += getQuestionCount(q)
      } else if (q.part > part) {
        break
      }
    }
    return 1 // Fallback
  }

  const formatAudioTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatAudioTimeRemaining = () => {
    if (!audioDuration || audioDuration === 0 || !audioDurationLoaded) {
      return "Loading..."
    }

    const totalTime = audioDuration + 120
    const remaining = Math.max(0, totalTime - audioCurrentTime)
    const minutes = Math.floor(remaining / 60)
    const seconds = Math.floor(remaining % 60)

    // Agar 2 daqiqagacha bo‘lsa (ya’ni 2 yoki undan kam)
    if (minutes <= 5 && minutes > 0) {
      return `${minutes} minutes ${seconds} seconds`
    }

    // Agar faqat soniyalar qolgan bo‘lsa
    if (minutes === 0) {
      return `${seconds} seconds`
    }

    // Aks holda faqat daqiqa chiqsin
    return `${minutes} minutes`
  }

  const formatTotalAudioDuration = () => {
    if (!audioDuration || !audioDurationLoaded) return "..."
    return formatAudioTime(audioDuration)
  }

  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({}) // Renamed for clarity

  useEffect(() => {
    if (typeof window !== "undefined") {
      const answersKey = `listening_answers_${examId}_${userId}`
      const savedAnswers = localStorage.getItem(answersKey)

      if (savedAnswers) {
        try {
          const parsedAnswers = JSON.parse(savedAnswers)
          const loadedAnswers: Record<string, any> = {}

          // Direct mapping from localStorage to state
          Object.keys(parsedAnswers).forEach((key) => {
            loadedAnswers[key] = parsedAnswers[key]
          })
          setUserAnswers(loadedAnswers) // Use the renamed state setter
          setAnswers(loadedAnswers) // Also update the original 'answers' state for compatibility
        } catch (error) {
          console.error("Error loading answers:", error)
        }
      }
    }
  }, [examId, userId])

  const saveToLocalStorage = (questionIdentifier: string, answer: any, questionType: string) => {
    if (typeof window === "undefined") return

    const answersKey = `listening_answers_${examId}_${userId}`
    const answersData = localStorage.getItem(answersKey)
    let answersObject: Record<string, any> = {}

    if (answersData) {
      try {
        answersObject = JSON.parse(answersData)
      } catch (error) {
        console.error("Error parsing answers:", error)
      }
    }

    if (questionType === "TABLE_COMPLETION") {
      // Save table answers as a separate entry with key: questionId_answer
      answersObject[questionIdentifier] = answer
    } else {
      // Other question types remain unchanged
      answersObject[questionIdentifier] = answer
    }

    localStorage.setItem(answersKey, JSON.stringify(answersObject))
  }

  const clearAnswer = (questionIdentifier: string, questionType: string) => {
    if (typeof window === "undefined") return

    const answersKey = `listening_answers_${examId}_${userId}`
    const answersData = localStorage.getItem(answersKey)
    let answersObject: Record<string, any> = {}

    if (answersData) {
      try {
        answersObject = JSON.parse(answersData)
      } catch (error) {
        console.error("Error parsing answers:", error)
      }
    }

    if (questionType === "TABLE_COMPLETION") {
      // Clear the entire table answer entry
      const tableAnswersKey = `${questionIdentifier}_answer`
      delete answersObject[tableAnswersKey]

      // Also clear from state
      setAnswers((prev) => {
        const newAnswers = { ...prev }
        delete newAnswers[tableAnswersKey]
        return newAnswers
      })
      setUserAnswers((prev) => {
        // Update the new state variable
        const newAnswers = { ...prev }
        delete newAnswers[tableAnswersKey]
        return newAnswers
      })
    } else {
      // Other question types remain unchanged
      delete answersObject[questionIdentifier]
      setAnswers((prev) => {
        const newAnswers = { ...prev }
        delete newAnswers[questionIdentifier]
        return newAnswers
      })
      setUserAnswers((prev) => {
        // Update the new state variable
        const newAnswers = { ...prev }
        delete newAnswers[questionIdentifier]
        return newAnswers
      })
    }

    localStorage.setItem(answersKey, JSON.stringify(answersObject))
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

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1
      setCurrentQuestionIndex(newIndex)
      const questionId = allQuestions[newIndex].id
      const element = questionRefs.current[questionId]
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      // Update currentPart based on the new question index
      const question = allQuestions[newIndex]
      if (question && question.part) {
        setCurrentPart(Number(question.part.replace("PART", "")))
      }
    }
  }

  const goToNextQuestion = () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      const newIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(newIndex)
      const questionId = allQuestions[newIndex].id
      const element = questionRefs.current[questionId]
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      // Update currentPart based on the new question index
      const question = allQuestions[newIndex]
      if (question && question.part) {
        setCurrentPart(Number(question.part.replace("PART", "")))
      }
    }
  }

  return (
    <div className={`flex flex-col h-screen ${getColorModeClasses()}`}>
      <div className={`sticky top-0 z-50 ${getHeaderColorClasses()} border-b px-4 sm:px-6 py-4`}>
        <div className={`flex items-center justify-between`}>
          <div className={`flex items-center space-x-4 sm:space-x-6`}>
            <div
              className={`font-bold text-xl sm:text-2xl ${isWarningMode ? "text-red-600" : "text-red-600"}`}
              style={{ fontSize: `${textSize * 1.5}px` }}
            >
              IELTS
            </div>
            <div
              className={`text-base sm:text-lg font-medium ${isWarningMode ? "text-gray-800" : "text-gray-800"}`}
              style={{ fontSize: `${textSize}px` }}
            >
              Test taker ID: {userId}
            </div>
            {audioPlaying && (
              <div
                className={`text-sm sm:text-base flex items-center gap-2 px-3 py-2 rounded-lg ${isWarningMode ? "bg-red-700 text-white" : "text-gray-900 bg-gray-100"}`}
                style={{ fontSize: `${textSize * 0.875}px` }}
              >
                <Volume2
                  className={`h-4 w-4 sm:h-5 sm:w-5 animate-pulse ${isWarningMode ? "text-white" : "text-gray-600"}`}
                />
                <span className="font-medium">Audio playing</span>
                <span className={isWarningMode ? "text-white" : "text-gray-600"}></span>
                <span className={isWarningMode ? "text-white" : "text-gray-600"}>
                  • {formatAudioTimeRemaining()} remaining
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* {timeRemaining !== null && (
              <div className={`text-center ${timerActive ? "animate-pulse" : ""}`}>
                <Timer
                  initialTime={timeRemaining}
                  onTimeUpdate={setTimeRemaining}
                  onTimeUp={handleTimerExpired}
                  isActive={timerActive}
                  className="text-base sm:text-lg md:text-2xl font-mono font-bold bg-red-50 text-red-600 px-2 sm:px-4 py-1 sm:py-2 rounded border border-red-200"
                />
              </div>
            )} */}

            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isWarningMode ? "bg-red-700" : "bg-gray-50"}`}
            >
              <VolumeX className={`h-4 w-4 sm:h-5 sm:w-5 ${isWarningMode ? "text-white" : "text-gray-600"}`} />
              <Slider value={volume} onValueChange={handleVolumeChange} max={100} step={1} className="w-16 sm:w-24" />
              <Volume2 className={`h-4 w-4 sm:h-5 sm:w-5 ${isWarningMode ? "text-white" : "text-gray-600"}`} />
              <span
                className={`text-xs ml-1 ${isWarningMode ? "text-white" : "text-gray-500"}`}
                style={{ fontSize: `${textSize * 0.75}px` }}
              >
                {volume[0]}%
              </span>
            </div>

            <button
              className={`p-2 rounded-lg transition-colors ${isWarningMode ? "bg-red-700" : "hover:bg-gray-100"}`}
              aria-label="Network status"
            >
              <Wifi className={`h-5 w-5 ${isWarningMode ? "text-white" : "text-gray-600"}`} />
            </button>

            <button
              className={`p-2 rounded-lg transition-colors ${isWarningMode ? "bg-red-700" : "hover:bg-gray-100"}`}
              aria-label="Notifications"
            >
              <Bell className={`h-5 w-5 ${isWarningMode ? "text-white" : "text-gray-600"}`} />
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className={`p-2 rounded-lg transition-colors ${isWarningMode ? "bg-red-700" : "hover:bg-gray-100"}`}
              aria-label="Settings"
            >
              <Menu className={`h-5 w-5 ${isWarningMode ? "text-white" : "text-gray-600"}`} />
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-xl w-full mx-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900" style={{ fontSize: `${textSize * 1.875}px` }}>
                Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close settings"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <div className="space-y-10">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6" style={{ fontSize: `${textSize * 1.25}px` }}>
                  Text Size
                </h3>
                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={decreaseTextSize}
                    className="w-14 h-14 bg-gray-300 hover:bg-gray-400 rounded-xl text-3xl font-bold transition-colors flex items-center justify-center"
                    aria-label="Decrease text size"
                    style={{ fontSize: `${textSize * 1.875}px` }}
                  >
                    -
                  </button>
                  <span
                    className="text-3xl font-semibold text-gray-900 min-w-[100px] text-center"
                    style={{ fontSize: `${textSize * 1.875}px` }}
                  >
                    {textSize}px
                  </span>
                  <button
                    onClick={increaseTextSize}
                    className="w-14 h-14 bg-gray-300 hover:bg-gray-400 rounded-xl text-3xl font-bold transition-colors flex items-center justify-center"
                    aria-label="Increase text size"
                    style={{ fontSize: `${textSize * 1.875}px` }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6" style={{ fontSize: `${textSize * 1.25}px` }}>
                  Color Mode
                </h3>
                <div className="space-y-4">
                  <button
                    onClick={() => setColorMode("default")}
                    className={`w-full py-5 px-6 rounded-xl text-lg font-semibold transition-all ${
                      colorMode === "default"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                    }`}
                    style={{ fontSize: `${textSize * 1.125}px` }}
                  >
                    Default (Day)
                  </button>
                  <button
                    onClick={() => setColorMode("night")}
                    className={`w-full py-5 px-6 rounded-xl text-lg font-semibold transition-all ${
                      colorMode === "night"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                    }`}
                    style={{ fontSize: `${textSize * 1.125}px` }}
                  >
                    Night Mode
                  </button>
                  <button
                    onClick={() => setColorMode("yellow")}
                    className={`w-full py-5 px-6 rounded-xl text-lg font-semibold transition-all ${
                      colorMode === "yellow"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                    }`}
                    style={{ fontSize: `${textSize * 1.125}px` }}
                  >
                    Yellow Mode
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
          preload="metadata"
          crossOrigin="anonymous"
        />
      )}

      <div className="bg-gray-100  border-b border-gray-300 px-2 sm:px-6 py-2">
        <div className="max-w-4xl lg:max-w-6xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1" style={{ fontSize: `${textSize * 1.25}px` }}>
            Part {currentPart}
          </h2>
          <p className="text-sm sm:text-base text-gray-700" style={{ fontSize: `${textSize}px` }}>
            Read the text and answer questions {(() => {
              const range = getPartQuestionRange(currentPart)
              return `${range.start}–${range.end}`
            })()}.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-32">
        <div className="max-w-4xl lg:max-w-6xl p-4 sm:p-6">
          <div className="space-y-6">
            {(() => {
              const partRange = getPartQuestionRange(currentPart)
              let sequentialQuestionNumber = partRange.start
              const shownGroupInstructions = new Set<string>()

              return currentPartQuestions.map((question, indexInPart) => {
                const questionId = question.id.toString()
                const questionType = getQuestionType(questionId)

                const isFirstInGroup = !shownGroupInstructions.has(question.groupId)
                if (isFirstInGroup) {
                  shownGroupInstructions.add(question.groupId)
                }

                const questionGroup = testData?.questions.find((qg) => qg.id === question.groupId)

                let currentAnswer: any

                if (questionType === "TABLE_COMPLETION") {
                  const tableAnswersKey = `${questionId}_answer`
                  currentAnswer = answers[tableAnswersKey] || {}
                } else if (questionType === "TFNG") {
                  const answersKey = `listening_answers_${examId}_${userId}`
                  const savedAnswers = localStorage.getItem(answersKey)
                  const answersArray: any[] = savedAnswers ? JSON.Parse(savedAnswers) : []
                  const answerEntry = answersArray.find(
                    (item: any) => item.l_questionsID === question.id && item.question_type === "TFNG",
                  )
                  currentAnswer = answerEntry ? answerEntry.answer : {}
                } else if (questionType === "SUMMARY_DRAG") {
                  currentAnswer = answers[questionId] || {}
                } else {
                  currentAnswer = answers[questionId] || ""
                }

                const questionCount = getQuestionCount(question)
                const questionStartNum = sequentialQuestionNumber
                const questionEndNum = sequentialQuestionNumber + questionCount - 1

                sequentialQuestionNumber += questionCount

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
                  <div
                    key={questionId}
                    ref={(el) => (questionRefs.current[question.id] = el)}
                    className="space-y-4 p-4 sm:p-6 bg-white"
                    style={{ fontSize: `${textSize}px` }}
                  >
                    {/* Questions Header - Show for specific question types */}
                    {(question.q_type === "MCQ_SINGLE" && isFirstInGroup) ||
                    ["MCQ_MULTI", "TABLE_COMPLETION", "MAP_LABELING", "SENTENCE_COMPLETION", "SUMMARY_DRAG"].includes(
                      question.q_type || "",
                    ) ||
                    (question.q_type === "NOTE_COMPLETION" && questionCount !== 10) ||
                    question.q_type === "TFNG" ||
                    question.q_type === "FLOW_CHART" ? (
                      <div className="mb-4">
                        <h4
                          className="text-base sm:text-lg font-bold text-gray-900 mb-2"
                          style={{ fontSize: `${textSize * 1.125}px` }}
                        >
                          {question.q_type === "MCQ_SINGLE" && isFirstInGroup
                            ? (() => {
                                // Calculate the total range for all MCQ_SINGLE questions in this group
                                const groupQuestions = currentPartQuestions.filter(
                                  (q) => q.groupId === question.groupId && q.q_type === "MCQ_SINGLE",
                                )
                                const totalQuestionsInGroup = groupQuestions.length
                                const groupEndNum = questionStartNum + totalQuestionsInGroup - 1
                                return `Questions ${questionStartNum}–${groupEndNum}`
                              })()
                            : `Questions ${questionStartNum}–${questionEndNum}`}
                        </h4>
                      </div>
                    ) : null}

                    {/* Instruction - Show if it's first in group and instruction exists */}
                    {isFirstInGroup && questionGroup?.instruction && question.q_type !== "MATCHING_INFORMATION" && (
                      <div className="mb-4">
                        <div
                          className="text-gray-700"
                          style={{ fontSize: `${textSize}px` }}
                          dangerouslySetInnerHTML={{ __html: questionGroup.instruction }}
                        />
                      </div>
                    )}

                    {/* q_text - Show if exists for specific question types */}
                    {(["MCQ_MULTI", "TABLE_COMPLETION", "MAP_LABELING", "SUMMARY_DRAG"].includes(
                      question.q_type || "",
                    ) ||
                      (question.q_type === "NOTE_COMPLETION" && questionCount !== 10) ||
                      question.q_type === "TFNG" ||
                      question.q_type === "FLOW_CHART") &&
                      question.q_text && (
                        <div
                          className="text-gray-700 mb-4"
                          style={{ fontSize: `${textSize}px` }}
                          dangerouslySetInnerHTML={{ __html: question.q_text }}
                        />
                      )}

                    {/* Question number and q_text for other question types */}
                    {![
                      "MCQ_SINGLE",
                      "MCQ_MULTI",
                      "TABLE_COMPLETION",
                      "MAP_LABELING",
                      "NOTE_COMPLETION",
                      "FLOW_CHART",
                      "TFNG",
                      "MATCHING_INFORMATION",
                      "SENTENCE_COMPLETION",
                      "SUMMARY_DRAG",
                    ].includes(question.q_type || "") && (
                      <div className="flex flex-row items-start gap-3 mb-4">
                        <div
                          className="text-base sm:text-lg font-semibold bg-gray-600 text-white px-3 py-1 rounded flex-shrink-0"
                          style={{ fontSize: `${textSize * 1.125}px` }}
                        >
                          {questionCount > 1 ? `${questionStartNum} - ${questionEndNum}` : questionStartNum}
                        </div>
                        {question.q_text && (
                          <div
                            className="text-gray-700 flex-1"
                            style={{ fontSize: `${textSize}px` }}
                            dangerouslySetInnerHTML={{ __html: question.q_text }}
                          />
                        )}
                      </div>
                    )}

                    {question.q_type === "TFNG" && question.photo && question.choices && question.options && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Map Image - Left Side */}
                          <div className="lg:col-span-1">
                            <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_URL}/uploads/l_questions/${question.photo}`}
                                alt="Map"
                                className="w-full h-auto"
                              />
                            </div>
                          </div>

                          {/* Table with Radio Buttons - Right Side */}
                          <div className="lg:col-span-1">
                            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                              {(() => {
                                let choicesData: Record<string, string> = {}
                                let optionsArray: string[] = []

                                // Parse choices
                                if (question.choices) {
                                  if (typeof question.choices === "object") {
                                    choicesData = question.choices
                                  } else if (typeof question.choices === "string") {
                                    try {
                                      choicesData = JSON.parse(question.choices)
                                    } catch (e) {
                                      console.error("[v0] Failed to parse MAP_LABELING choices:", e)
                                    }
                                  }
                                }

                                // Parse options
                                if (question.options) {
                                  if (Array.isArray(question.options)) {
                                    optionsArray = question.options
                                  } else if (typeof question.options === "string") {
                                    try {
                                      optionsArray = JSON.parse(question.options)
                                    } catch (e) {
                                      console.error("[v0] Failed to parse MAP_LABELING options:", e)
                                    }
                                  }
                                }

                                return (
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b-2 border-gray-300">
                                        <th
                                          className="p-3 text-left bg-gray-50 font-semibold text-gray-900"
                                          style={{ fontSize: `${textSize}px` }}
                                        ></th>
                                        {optionsArray.map((option) => (
                                          <th
                                            key={option}
                                            className="p-3 text-center bg-gray-50 font-semibold text-gray-900 border-l border-gray-300"
                                            style={{ fontSize: `${textSize}px` }}
                                          >
                                            {option}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Object.entries(choicesData).map(([choiceNum, choiceText], index) => {
                                        const questionId = `${question.id}_map_${choiceNum}`
                                        const choiceAnswer =
                                          typeof currentAnswer === "object" && currentAnswer !== null
                                            ? currentAnswer[choiceNum]
                                            : answers[questionId]
                                        const actualQuestionNum = questionStartNum + index

                                        return (
                                          <tr key={choiceNum} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-900">
                                              <div className="flex items-center gap-2">
                                                <span
                                                  className="bg-gray-700 text-white w-6 h-6 rounded flex items-center justify-center text-sm font-bold flex-shrink-0"
                                                  style={{ fontSize: `${textSize * 0.875}px` }}
                                                >
                                                  {actualQuestionNum}
                                                </span>
                                                <span style={{ fontSize: `${textSize}px` }}>{choiceText}</span>
                                              </div>
                                            </td>
                                            {optionsArray.map((option) => (
                                              <td key={option} className="p-3 text-center border-l border-gray-200">
                                                <input
                                                  type="radio"
                                                  name={questionId}
                                                  value={option}
                                                  checked={choiceAnswer === option}
                                                  onChange={(e) => {
                                                    handleAnswerChange(questionId, e.target.value, questionId)
                                                  }}
                                                  className="w-5 h-5 cursor-pointer accent-blue-600"
                                                />
                                              </td>
                                            ))}
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {question.q_type === "MCQ_SINGLE" && optionsArray.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="bg-gray-700 text-white w-10 h-10 rounded flex items-center justify-center font-bold flex-shrink-0"
                            style={{ fontSize: `${textSize}px` }}
                          >
                            {questionStartNum}
                          </div>
                          {question.q_text && (
                            <div
                              className="text-gray-900 flex-1 font-medium pt-1"
                              style={{ fontSize: `${textSize}px` }}
                              dangerouslySetInnerHTML={{ __html: question.q_text }}
                            />
                          )}
                        </div>
                        <RadioGroup
                          value={currentAnswer || ""}
                          onValueChange={(value) => handleAnswerChange(questionId, value)}
                          className="space-y-3 ml-[52px]"
                        >
                          {optionsArray.map((option, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <RadioGroupItem value={option.key} id={`q${question.id}-${option.key}`} />
                              <Label
                                htmlFor={`q${question.id}-${option.key}`}
                                className="cursor-pointer text-sm sm:text-base text-gray-900"
                                style={{ fontSize: `${textSize}px` }}
                              >
                                {option.text}
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
                                : typeof currentAnswer === "string"
                                  ? currentAnswer.split(",").filter(Boolean)
                                  : [String(currentAnswer)]
                              : []

                            const correctAnswersCount = Array.isArray(question.correct_answers)
                              ? question.correct_answers.length
                              : 1

                            return (
                              <div key={index} className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  id={`q${question.id}-${option.key}`}
                                  checked={currentAnswersArray.includes(option.key)}
                                  onChange={(e) => {
                                    let newAnswers: string[]
                                    if (e.target.checked) {
                                      if (currentAnswersArray.length >= correctAnswersCount) {
                                        // Remove the first selected answer to make room for the new one
                                        newAnswers = [...currentAnswersArray.slice(1), option.key]
                                      } else {
                                        newAnswers = [...currentAnswersArray, option.key]
                                      }
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
                                  style={{ fontSize: `${textSize}px` }}
                                >
                                  <span dangerouslySetInnerHTML={{ __html: option.text }} />
                                </Label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {question.q_type === "SENTENCE_COMPLETION" && (
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div
                            className="text-base sm:text-lg font-semibold bg-gray-600 text-white px-3 py-1 rounded flex-shrink-0"
                            style={{ fontSize: `${textSize * 1.125}px` }}
                          >
                            {questionStartNum}
                          </div>
                          {question.q_text && (
                            <div
                              className="text-base leading-relaxed text-gray-900 flex-1"
                              style={{ fontSize: `${textSize}px` }}
                            >
                              {(() => {
                                const text = question.q_text || ""
                                const parts = text.split(/_+/)

                                // Always show inline input
                                return (
                                  <div className="flex flex-wrap items-center gap-2">
                                    {parts.map((part, index) => (
                                      <React.Fragment key={index}>
                                        <span dangerouslySetInnerHTML={{ __html: part }} />
                                        {index < parts.length - 1 && (
                                          <Input
                                            value={currentAnswer || ""}
                                            onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                                            className="inline-block w-32 px-2 py-1 text-sm bg-gray-100 border-gray-300 focus:border-gray-500 rounded"
                                            placeholder={questionStartNum.toString()}
                                          />
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                )
                              })()}
                            </div>
                          )}
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
                          <p className="text-xs text-gray-600 mb-2">Choices:</p>
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
                        {/* Show instruction for MATCHING_INFORMATION at the top */}
                        {isFirstInGroup && questionGroup?.instruction && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div
                              className="text-gray-800"
                              style={{ fontSize: `${textSize}px` }}
                              dangerouslySetInnerHTML={{ __html: questionGroup.instruction }}
                            />
                          </div>
                        )}

                        <div className="overflow-x-auto">
                          <table className="w-full border text-base border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                <th
                                  className="p-3 text-left font-semibold text-black border-gray-300"
                                  style={{ fontSize: `${textSize}px` }}
                                >
                                  Questions {questionStartNum}–{questionEndNum}
                                </th>
                                {question.choices &&
                                  Object.keys(question.choices).map((choiceKey) => (
                                    <th
                                      key={choiceKey}
                                      className="p-3 text-center font-semibold w-16 text-black border-gray-300"
                                      style={{ fontSize: `${textSize}px` }}
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
                                      <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium">
                                        {questionStartNum + index}
                                      </span>
                                      <span className="font-medium" dangerouslySetInnerHTML={{ __html: rowText }} />
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
                          <h5 className="font-semibold mb-3 text-black" style={{ fontSize: `${textSize}px` }}>
                            {question.q_text ? (
                              <span dangerouslySetInnerHTML={{ __html: question.q_text }} />
                            ) : (
                              "Choices:"
                            )}
                          </h5>
                          <div className="overflow-x-auto">
                            <table className="w-full border text-base border-gray-300">
                              <tbody>
                                {question.choices &&
                                  Object.entries(question.choices).map(([key, text]) => (
                                    <tr key={key}>
                                      <td
                                        className="border p-3 w-16 text-center font-semibold bg-gray-50 text-black border-gray-300"
                                        style={{ fontSize: `${textSize}px` }}
                                      >
                                        {key}
                                      </td>
                                      <td
                                        className="border p-3 border-gray-300 text-black"
                                        style={{ fontSize: `${textSize}px` }}
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

                    {question.q_type === "TABLE_COMPLETION" && (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <tbody>
                            {question.rows?.map((row: any, rowIndex: number) => {
                              const cellInputCounter = 0
                              return (
                                <tr key={rowIndex}>
                                  {row.cells?.map((cell: string, cellIndex: number) => {
                                    const isEmptyOrUnderscore = cell === "" || cell === "_"
                                    const hasUnderscores =
                                      typeof cell === "string" && /_+/.test(cell) && !isEmptyOrUnderscore

                                    if (isEmptyOrUnderscore || hasUnderscores) {
                                      const tableAnswersKey = `${questionId}_answer`
                                      const tableAnswers = answers[tableAnswersKey] || {}
                                      const cellKey = `${rowIndex}_${cellIndex}`

                                      // Calculate the question number for this specific input
                                      let inputQuestionNumber = questionStartNum
                                      for (let r = 0; r < rowIndex; r++) {
                                        for (let c = 0; c < row.cells.length; c++) {
                                          const prevCell = question.rows[r].cells[c]
                                          if (
                                            prevCell === "" ||
                                            prevCell === "_" ||
                                            (typeof prevCell === "string" && /_+/.test(prevCell))
                                          ) {
                                            inputQuestionNumber++
                                          }
                                        }
                                      }
                                      for (let c = 0; c < cellIndex; c++) {
                                        const prevCell = row.cells[c]
                                        if (
                                          prevCell === "" ||
                                          prevCell === "_" ||
                                          (typeof prevCell === "string" && /_+/.test(prevCell))
                                        ) {
                                          inputQuestionNumber++
                                        }
                                      }

                                      return (
                                        <td key={cellIndex} className="border border-gray-300 p-2">
                                          <div className="min-w-[150px]">
                                            {hasUnderscores ? (
                                              <div className="flex items-center gap-1 flex-wrap">
                                                {cell.split(/(_+)/).map((part: string, partIndex: number) => {
                                                  if (/_+/.test(part)) {
                                                    return (
                                                      <Input
                                                        key={partIndex}
                                                        value={tableAnswers[cellKey] || ""}
                                                        onChange={(e) =>
                                                          handleAnswerChange(
                                                            `${questionId}_table_${rowIndex}_${cellIndex}`,
                                                            e.target.value,
                                                          )
                                                        }
                                                        className="inline-block w-32 text-sm bg-white border-gray-300 focus:border-gray-500"
                                                        placeholder={inputQuestionNumber.toString()}
                                                      />
                                                    )
                                                  }
                                                  return part ? (
                                                    <span key={partIndex} className="text-gray-900">
                                                      {part}
                                                    </span>
                                                  ) : null
                                                })}
                                              </div>
                                            ) : (
                                              <Input
                                                value={tableAnswers[cellKey] || ""}
                                                onChange={(e) =>
                                                  handleAnswerChange(
                                                    `${questionId}_table_${rowIndex}_${cellIndex}`,
                                                    e.target.value,
                                                  )
                                                }
                                                className="w-full text-sm bg-white border-gray-300 focus:border-gray-500"
                                                placeholder={inputQuestionNumber.toString()}
                                              />
                                            )}
                                          </div>
                                        </td>
                                      )
                                    }

                                    return (
                                      <td key={cellIndex} className="border border-gray-300 p-2">
                                        <span className="text-gray-900">{cell}</span>
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
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

                                return Object.entries(rowsData).map(([position, coords]: [string, any], index) => {
                                  const dropZoneQuestionId = `${question.id}_map_${position}`
                                  const currentAnswer = answers[dropZoneQuestionId]
                                  const questionNum = questionStartNum + index

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
                                          draggable={!!currentAnswer}
                                          onDragStart={(e) => {
                                            if (currentAnswer) {
                                              e.dataTransfer.setData("text/plain", currentAnswer)
                                              e.dataTransfer.setData("removeFrom", dropZoneQuestionId)
                                              e.currentTarget.classList.add("opacity-50")
                                            }
                                          }}
                                          onDragEnd={(e) => {
                                            e.currentTarget.classList.remove("opacity-50")
                                          }}
                                          className={`min-w-[80px] px-3 py-2 rounded-lg border-2 flex flex-col items-center justify-center text-sm font-semibold shadow-lg transition-all ${
                                            currentAnswer
                                              ? "bg-white border-gray-500 hover:bg-red-50 cursor-move"
                                              : "bg-white border-dashed border-gray-400 hover:border-gray-600 hover:scale-105 cursor-pointer"
                                          }`}
                                          onClick={() => {
                                            if (currentAnswer) {
                                              handleAnswerChange(dropZoneQuestionId, null, dropZoneQuestionId)
                                            }
                                          }}
                                          title={
                                            currentAnswer
                                              ? "Click to remove or drag back to options"
                                              : "Drag option here"
                                          }
                                        >
                                          <span className="text-gray-600 font-bold text-base">{questionNum}</span>
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
                            <div
                              className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 sticky top-4"
                              onDragOver={(e) => {
                                e.preventDefault()
                                const removeFrom = e.dataTransfer.types.includes("removefrom")
                                if (removeFrom) {
                                  e.currentTarget.classList.add("bg-blue-50", "border-blue-400")
                                }
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.classList.remove("bg-blue-50", "border-blue-400")
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                e.currentTarget.classList.remove("bg-blue-50", "border-blue-400")
                                const removeFrom = e.dataTransfer.getData("removeFrom")
                                if (removeFrom) {
                                  handleAnswerChange(removeFrom, null, removeFrom)
                                }
                              }}
                            >
                              <h4 className="font-semibold text-gray-900 mb-4" style={{ fontSize: `${textSize}px` }}>
                                Options
                              </h4>
                              <div className="space-y-2">
                                {optionsArray
                                  .filter((option) => {
                                    // Check if this option is used in any drop zone
                                    let rowsData: Record<string, any> = {}
                                    if (question.rows) {
                                      if (typeof question.rows === "object") {
                                        rowsData = question.rows
                                      } else if (typeof question.rows === "string") {
                                        try {
                                          rowsData = JSON.parse(question.rows)
                                        } catch (e) {
                                          return true
                                        }
                                      }
                                    }

                                    const isUsed = Object.keys(rowsData).some((position) => {
                                      const dropZoneQuestionId = `${question.id}_map_${position}`
                                      return answers[dropZoneQuestionId] === option.key
                                    })

                                    return !isUsed
                                  })
                                  .map((option) => (
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
                                      className="bg-white border-2 border-gray-300 rounded-lg p-3 cursor-move hover:border-gray-600 hover:shadow-md transition-all"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="bg-gray-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                                          {option.key}
                                        </span>
                                        <span className="text-gray-900 font-medium text-sm">{option.text}</span>
                                      </div>
                                    </div>
                                  ))}
                                {optionsArray.filter((option) => {
                                  let rowsData: Record<string, any> = {}
                                  if (question.rows) {
                                    if (typeof question.rows === "object") {
                                      rowsData = question.rows
                                    } else if (typeof question.rows === "string") {
                                      try {
                                        rowsData = JSON.parse(question.rows)
                                      } catch (e) {
                                        return true
                                      }
                                    }
                                  }
                                  const isUsed = Object.keys(rowsData).some((position) => {
                                    const dropZoneQuestionId = `${question.id}_map_${position}`
                                    return answers[dropZoneQuestionId] === option.key
                                  })
                                  return !isUsed
                                }).length === 0 && (
                                  <p className="text-sm text-gray-500 text-center mt-4">All options used</p>
                                )}
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
                                  ? (() => {
                                      const allQuestions = getAllQuestions()
                                      const baseQuestionIndex = allQuestions.findIndex(
                                        (q) => q.id.toString() === flowChartQuestionId,
                                      )
                                      let questionCounter = 1
                                      for (let i = 0; i < baseQuestionIndex; i++) {
                                        questionCounter += getQuestionCount(allQuestions[i])
                                      }
                                      let blankCounter = 0
                                      const sortedSteps = Object.entries(question.choices || {}).sort(
                                        ([a], [b]) => Number(a) - Number(b),
                                      )
                                      for (const [step, text] of sortedSteps) {
                                        if (typeof text === "string" && text.includes("__")) {
                                          if (step === stepNum) {
                                            return questionCounter + blankCounter
                                          }
                                          blankCounter++
                                        }
                                      }
                                      return questionCounter
                                    })()
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
                                          {(() => {
                                            const firstBlankIndex = stepText.indexOf("__")
                                            if (firstBlankIndex === -1) return stepText

                                            const beforeBlank = stepText.substring(0, firstBlankIndex)
                                            const afterBlank = stepText
                                              .substring(firstBlankIndex + 2)
                                              .replace(/__/g, "")

                                            return (
                                              <>
                                                {beforeBlank}
                                                <span
                                                  draggable={!!currentAnswer}
                                                  onDragStart={(e) => {
                                                    if (currentAnswer) {
                                                      e.dataTransfer.setData("text/plain", currentAnswer)
                                                      e.dataTransfer.setData("removeFrom", stepNum)
                                                      e.dataTransfer.setData("removeFromQuestion", flowChartQuestionId)
                                                      e.currentTarget.classList.add("opacity-50")
                                                    }
                                                  }}
                                                  onDragEnd={(e) => {
                                                    e.currentTarget.classList.remove("opacity-50")
                                                  }}
                                                  className={`inline-flex items-center gap-2 min-w-[140px] px-3 py-2 mx-1 border-2 border-dashed rounded transition-all ${
                                                    currentAnswer
                                                      ? "bg-gray-50 border-gray-500 cursor-move hover:bg-red-50 hover:border-red-500"
                                                      : "bg-gray-50 border-gray-400 hover:border-gray-600"
                                                  }`}
                                                  onDragOver={(e) => {
                                                    e.preventDefault()
                                                    e.currentTarget.classList.add("bg-gray-100", "scale-105")
                                                  }}
                                                  onDragLeave={(e) => {
                                                    e.currentTarget.classList.remove("bg-gray-100", "scale-105")
                                                  }}
                                                  onDrop={(e) => {
                                                    e.preventDefault()
                                                    e.currentTarget.classList.remove("bg-gray-100", "scale-105")
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
                                                  title={
                                                    currentAnswer
                                                      ? "Click to remove or drag back to options"
                                                      : "Drag option here"
                                                  }
                                                >
                                                  <span className="bg-gray-700 text-white px-2 py-1 rounded text-xs font-medium flex-shrink-0">
                                                    {stepQuestionNum}
                                                  </span>
                                                  {currentAnswer ? (
                                                    <span className="font-semibold text-gray-700">
                                                      {selectedOptionText}
                                                    </span>
                                                  ) : (
                                                    <span className="text-gray-400 text-sm">Drop here</span>
                                                  )}
                                                </span>
                                                {afterBlank}
                                              </>
                                            )
                                          })()}
                                        </div>
                                      ) : (
                                        <div className="text-base text-gray-900 leading-relaxed">{stepText}</div>
                                      )}
                                    </div>
                                    {index < Object.keys(question.choices).length - 1 && (
                                      <div className="flex justify-center relative h-8">
                                        <div className="w-0.5 h-6 bg-gray-400"></div>
                                        <div className="absolute bottom-0 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-gray-400"></div>
                                      </div>
                                    )}
                                  </React.Fragment>
                                )
                              })}
                            </div>
                          </div>

                          {/* Options Panel */}
                          <div className="lg:col-span-1">
                            <div
                              className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 sticky top-4"
                              onDragOver={(e) => {
                                e.preventDefault()
                                const removeFrom = e.dataTransfer.types.includes("removefrom")
                                if (removeFrom) {
                                  e.currentTarget.classList.add("bg-blue-50", "border-blue-400")
                                }
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.classList.remove("bg-blue-50", "border-blue-400")
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                e.currentTarget.classList.remove("bg-blue-50", "border-blue-400")
                                const removeFrom = e.dataTransfer.getData("removeFrom")
                                const removeFromQuestion = e.dataTransfer.getData("removeFromQuestion")
                                if (removeFrom && removeFromQuestion) {
                                  const fullQuestionId = `${removeFromQuestion}_flow_${removeFrom}`
                                  handleAnswerChange(removeFromQuestion, null, fullQuestionId)
                                }
                              }}
                            >
                              <h4 className="font-semibold text-gray-900 mb-4" style={{ fontSize: `${textSize}px` }}>
                                Options
                              </h4>
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
                                        className="bg-white border-2 border-gray-300 rounded-lg p-3 cursor-move hover:border-gray-600 hover:shadow-md transition-all active:scale-95"
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
                        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
                          {(() => {
                            const optionsText =
                              typeof question.options === "string" ? question.options : JSON.stringify(question.options)

                            const parts = optionsText.split(/(____+)/)
                            let currentInputIndex = 0

                            return parts.map((part, index) => {
                              if (part.match(/____+/)) {
                                const questionNum = questionStartNum + currentInputIndex
                                const inputId = `${question.id}_note_${currentInputIndex}`
                                const currentAnswer = answers[inputId] || ""
                                currentInputIndex++

                                return (
                                  <span key={index} className="inline-flex items-center mx-1">
                                    <Input
                                      value={currentAnswer}
                                      onChange={(e) => handleAnswerChange(inputId, e.target.value, inputId)}
                                      className="inline-block w-32 px-3 py-1.5 text-center text-sm bg-gray-50 border-2 border-gray-400 focus:border-gray-600 focus:bg-white rounded"
                                      placeholder={questionNum.toString()}
                                    />
                                  </span>
                                )
                              } else {
                                return (
                                  <span
                                    key={index}
                                    className="text-gray-900"
                                    style={{ fontSize: `${textSize}px` }}
                                    dangerouslySetInnerHTML={{ __html: part }}
                                  />
                                )
                              }
                            })
                          })()}
                        </div>
                      </div>
                    )}

                    {question.q_type === "SUMMARY_DRAG" &&
                      (() => {
                        // Moved state declarations here to fix lint error
                        // const [draggedItem, setDraggedItem] = useState<string | null>(null)
                        // const [dragSource, setDragSource] = useState<string | null>(null)

                        // Parse options and choices
                        let optionsData: Record<string, string> = {}
                        let choicesArray: string[] = []
                        let headersData: string[] = []

                        if (question.options) {
                          if (typeof question.options === "object" && !Array.isArray(question.options)) {
                            optionsData = question.options
                          } else if (typeof question.options === "string") {
                            try {
                              optionsData = JSON.parse(question.options)
                            } catch (e) {
                              console.error("[v0] Failed to parse SUMMARY_DRAG options:", e)
                            }
                          }
                        }

                        if (question.choices) {
                          if (Array.isArray(question.choices)) {
                            choicesArray = question.choices
                          } else if (typeof question.choices === "string") {
                            try {
                              choicesArray = JSON.parse(question.choices)
                            } catch (e) {
                              console.error("[v0] Failed to parse SUMMARY_DRAG choices:", e)
                            }
                          }
                        }

                        if (question.rows?.headers && Array.isArray(question.rows.headers)) {
                          headersData = question.rows.headers
                        }

                        // Get used choices
                        const usedChoices = new Set<string>()
                        if (currentAnswer && typeof currentAnswer === "object") {
                          Object.values(currentAnswer).forEach((value) => {
                            if (value) usedChoices.add(value as string)
                          })
                        }

                        const availableChoices = choicesArray.filter((choice) => !usedChoices.has(choice))

                        const handleDragStart = (e: React.DragEvent<HTMLDivElement>, choice: string) => {
                          e.dataTransfer.effectAllowed = "move"
                          e.dataTransfer.setData("text/plain", choice)
                          setDraggedItem(choice)
                          setDragSource("choices")
                        }

                        const handleDragStartFromGap = (e: React.DragEvent<HTMLDivElement>, optionKey: string) => {
                          const currentValue = currentAnswer?.[optionKey]
                          if (currentValue) {
                            e.dataTransfer.effectAllowed = "move"
                            e.dataTransfer.setData("text/plain", currentValue)
                            e.dataTransfer.setData("removeFrom", optionKey)
                            setDraggedItem(currentValue)
                            setDragSource("gap")
                          }
                        }

                        const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = "move"
                          e.currentTarget.classList.add("bg-blue-100", "border-blue-500")
                        }

                        const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
                          e.currentTarget.classList.remove("bg-blue-100", "border-blue-500")
                        }

                        const handleDropOnGap = (e: React.DragEvent<HTMLDivElement>, optionKey: string) => {
                          e.preventDefault()
                          e.currentTarget.classList.remove("bg-blue-100", "border-blue-500")

                          const choice = e.dataTransfer.getData("text/plain")
                          const removeFrom = e.dataTransfer.getData("removeFrom")

                          if (choice) {
                            const newAnswer = { ...currentAnswer }
                            newAnswer[optionKey] = choice

                            // If dragging from another gap, clear that gap
                            if (removeFrom && removeFrom !== optionKey) {
                              delete newAnswer[removeFrom]
                            }

                            handleAnswerChange(question.id.toString(), newAnswer)
                          }

                          setDraggedItem(null)
                          setDragSource(null)
                        }

                        const handleDropOnChoices = (e: React.DragEvent<HTMLDivElement>) => {
                          e.preventDefault()
                          e.currentTarget.classList.remove("bg-blue-100", "border-blue-500")

                          const removeFrom = e.dataTransfer.getData("removeFrom")
                          if (removeFrom) {
                            const newAnswer = { ...currentAnswer }
                            delete newAnswer[removeFrom]
                            handleAnswerChange(question.id.toString(), newAnswer)
                          }

                          setDraggedItem(null)
                          setDragSource(null)
                        }

                        return (
                          <div className="space-y-6">
                           

                            {/* Main drag-and-drop area */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Left column: Options with gaps */}
                              <div className="space-y-4">
                                {/* Header */}
                                <div className="font-bold text-gray-900" style={{ fontSize: `${textSize}px` }}>
                                  <strong>{headersData[0]}</strong>
                                </div>

                                {/* Options rows */}
                                <div className="space-y-3">
                                  {Object.entries(optionsData).map(([optionKey, optionText], index) => {
                                    const actualQuestionNum = questionStartNum + index
                                    const currentValue = currentAnswer?.[optionKey]

                                    return (
                                      <div key={optionKey} className="flex items-center gap-4">
                                        {/* Option text */}
                                        <span className="text-gray-900" style={{ fontSize: `${textSize}px` }}>
                                          {optionText}
                                        </span>

                                        {/* Drop zone with dashed border */}
                                        <div
                                          className="border-2 border-dashed border-blue-400 rounded px-4 py-2 min-w-[100px] text-center flex-shrink-0 hover:bg-blue-50 transition-colors"
                                          onDragOver={handleDragOver}
                                          onDragLeave={handleDragLeave}
                                          onDrop={(e) => handleDropOnGap(e, optionKey)}
                                        >
                                          {currentValue ? (
                                            <div
                                              draggable
                                              onDragStart={(e) => handleDragStartFromGap(e, optionKey)}
                                              className="cursor-move"
                                            >
                                              <span
                                                className="text-gray-900 font-bold"
                                                style={{ fontSize: `${textSize}px` }}
                                              >
                                                {currentValue}
                                              </span>
                                            </div>
                                          ) : (
                                            <span
                                              className="text-gray-400 font-bold"
                                              style={{ fontSize: `${textSize}px` }}
                                            >
                                              {actualQuestionNum}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* Right column: Draggable choices */}
                              <div className="space-y-4">
                                {/* Header */}
                                <div className="font-bold text-gray-900" style={{ fontSize: `${textSize}px` }}>
                                  <strong>{headersData[1]}</strong>
                                </div>

                                <div
                                  className="border-2 border-dashed border-gray-300 rounded px-4 py-3 min-h-[40px] bg-gray-50 hover:bg-gray-100 transition-colors text-center text-sm text-gray-500"
                                  onDragOver={handleDragOver}
                                  onDragLeave={handleDragLeave}
                                  onDrop={handleDropOnChoices}
                                ></div>

                                {/* Choices */}
                                <div className="space-y-2">
                                  {availableChoices.map((choice, index) => (
                                    <div
                                      key={index}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, choice)}
                                      onDragEnd={() => {
                                        setDraggedItem(null)
                                        setDragSource(null)
                                      }}
                                      className={`border  rounded px-4 py-2 cursor-move hover:shadow-md transition-all ${
                                        draggedItem === choice ? "opacity-50 bg-white" : "bg-white"
                                      }`}
                                    >
                                      <span className="text-gray-900" style={{ fontSize: `${textSize}px` }}>
                                        {choice}
                                      </span>
                                    </div>
                                  ))}
                                  {availableChoices.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center mt-4">All options used</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}

                    {/* This is the section that was in the updates */}
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
                      "NOTE_COMPLETION",
                      "SUMMARY_DRAG",
                    ].includes(question.q_type || "") && (
                      <div className="flex flex-row items-start gap-3 mb-4">
                        <div
                          className="text-base sm:text-lg font-semibold bg-gray-600 text-white px-3 py-1 rounded flex-shrink-0"
                          style={{ fontSize: `${textSize * 1.125}px` }}
                        >
                          {questionCount > 1 ? `${questionStartNum} - ${questionEndNum}` : questionStartNum}
                        </div>
                        {question.q_text && (
                          <div
                            className="text-gray-700 flex-1"
                            style={{ fontSize: `${textSize}px` }}
                            dangerouslySetInnerHTML={{ __html: question.q_text }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </div>

      <div
        className={`fixed bottom-0 left-0 right-0 ${getNavigationColorClasses()} border-t px-4 sm:px-6 py-3 sm:py-4 shadow-lg z-50`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-6xl mx-auto gap-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded flex items-center justify-center disabled:opacity-50 transition-colors ${
                isWarningMode ? "bg-red-700 hover:bg-red-800" : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              ←
            </button>
            <button
              onClick={goToNextQuestion}
              disabled={currentQuestionIndex === allQuestions.length - 1}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded flex items-center justify-center disabled:opacity-50 transition-colors ${
                isWarningMode ? "bg-red-700 hover:bg-red-800" : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              →
            </button>
          </div>

          <div className="flex items-center space-x-8 overflow-x-auto max-w-full">
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {allParts.map((part) => {
                const range = getPartQuestionRange(part.partNumber)
                const allPartQuestionsAnswered =
                  part.answeredQuestions === part.totalQuestions && part.totalQuestions > 0

                return (
                  <button
                    key={part.partNumber}
                    onClick={() => switchToPart(part.partNumber)}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                      allPartQuestionsAnswered
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-white text-gray-900 hover:bg-gray-50"
                    } ${currentPart === part.partNumber ? "ring-2 ring-gray-600 ring-offset-1" : ""}`}
                    title={`Questions ${range.start}–${range.end}`}
                  >
                    Part {part.partNumber}
                    <span className="block text-[10px] text-gray-500">
                      {range.start}–{range.end}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center space-x-1 flex-wrap justify-center">
              {(() => {
                const questionButtons: ReactElement[] = []
                const partQuestions = getQuestionsByPart(currentPart)
                const baseNumber = getPartQuestionRange(currentPart).start

                partQuestions.forEach((question, indexInPart) => {
                  const questionCount = getQuestionCount(question)
                  for (let i = 0; i < questionCount; i++) {
                    const questionNum = baseNumber + indexInPart + i
                    const isAnswered = isSubQuestionAnswered(question, i)

                    questionButtons.push(
                      <button
                        key={`${question.id}_${i}`}
                        onClick={() => {
                          // Scroll to the specific question part
                          const element = questionRefs.current[question.id]
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" })
                          }
                          // Update currentQuestionIndex based on the clicked question number
                          const allQuestionsForIndex = getAllQuestions()
                          const clickedQuestionIndex = allQuestionsForIndex.findIndex(
                            (q, idx) => q.id === question.id && idx === indexInPart,
                          )
                          if (clickedQuestionIndex !== -1) {
                            setCurrentQuestionIndex(clickedQuestionIndex)
                          }
                        }}
                        className={`w-6 h-6 sm:w-8 sm:h-8 text-xs font-medium rounded transition-all ${
                          isAnswered
                            ? "bg-green-500 text-white hover:bg-green-600"
                            : "bg-gray-500 text-white hover:bg-gray-600"
                        }`}
                        title={`Question ${questionNum}`}
                      >
                        {questionNum}
                      </button>,
                    )
                  }
                })

                return questionButtons
              })()}
            </div>
          </div>

          <div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isWarningMode ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
            >
              {isSubmitting ? "Submitting..." : "Submit Test"}
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 flex items-center gap-3 z-50">
        <button
          onClick={goToNextQuestion}
          disabled={currentQuestionIndex === getAllQuestions().length - 1}
          className="w-12 h-12 bg-black hover:bg-gray-900 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors shadow-lg"
          title="Next Question"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
          className="w-12 h-12 bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors shadow-lg border-2 border-gray-300"
          title="Submit Test"
        >
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>

      <AlertComponent />
      <CompletionModal isOpen={showCompletionModal} onClose={() => setShowCompletionModal(false)} />
    </div>
  )
}

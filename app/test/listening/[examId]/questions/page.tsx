"use client"

import { useEffect, useState, useRef, type ReactElement } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { markSectionCompleted, areAllSectionsCompleted } from "../../../../../lib/test-strotage"
import { Volume2, VolumeX, Wifi, Bell, Menu, X } from "lucide-react"
import { useCustomAlert } from "@/components/custom-allert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { CompletionModal } from "@/components/completion-modal"
import React from "react"
import { Input } from "@/components/ui/input"

// Import the missing function
import { getStoredUserId } from "../../../../../lib/auth"

interface LQuestion {
  id: number
  listening_questions_id: number
  q_type: string
  q_type_detail?: string
  q_text: string
  instruction?: string
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
  groupId: string
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
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [timeRemaining, setTimeRemaining] = useState<number>(120)
  const [timerActive, setTimerActive] = useState(false)
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

  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragSource, setDragSource] = useState<string | null>(null)

  const [userId, setUserId] = useState("")

  const { showAlert, AlertComponent } = useCustomAlert()
  const audioRef = useRef<HTMLAudioElement>(null)
  const questionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  useEffect(() => {
    const id = getStoredUserId()
    if (id) {
      setUserId(id)
    } else {
      console.error("[v0] No user ID found in localStorage")
      showAlert({
        title: "Xatolik",
        description: "Foydalanuvchi ma'lumotlari topilmadi. Iltimos, qaytadan kiring.",
        type: "error",
        confirmText: "OK",
        showCancel: false,
        onConfirm: () => {
          router.push("/join")
        },
      })
    }
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

    audio.addEventListener("timeupdate", updateTime)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("durationchange", updateDuration)
    audio.addEventListener("canplay", handleCanPlay)
    audio.addEventListener("error", handleError)

    if (audio.readyState >= 1) {
      console.log("[v0] Audio already loaded, getting duration immediately")
      updateDuration()
    }

    audio.load()

    return () => {
      audio.removeEventListener("timeupdate", updateTime)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("durationchange", updateDuration)
      audio.removeEventListener("canplay", handleCanPlay)
      audio.removeEventListener("error", handleError)
    }
  }, [testData])

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
    setTimerActive(false)

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

  const getExamIdForAnswers = (): string => {
    const storedExamId = localStorage.getItem("current_exam_id")
    if (storedExamId) {
      console.log("[v0] Using exam ID from localStorage:", storedExamId)
      return storedExamId
    }
    console.log("[v0] Falling back to URL param exam ID:", examId)
    return examId
  }

  const handleAnswerChange = (questionId: string, answer: any, questionIdentifier?: string) => {
    const questionIdStr = questionId.toString()

    const newAnswers = { ...answers }

    if (questionIdentifier && questionIdentifier.includes("_note_")) {
      newAnswers[questionIdentifier] = answer
    } else if (questionIdentifier && questionIdentifier.includes("_map_")) {
      const parts = questionIdentifier.split("_")
      const baseQuestionId = parts[0]
      const position = parts[2]

      if (!newAnswers[baseQuestionId]) {
        newAnswers[baseQuestionId] = {}
      }
      newAnswers[baseQuestionId][position] = answer
    } else if (questionIdentifier && questionIdentifier.includes("_flow_")) {
      const parts = questionIdentifier.split("_")
      const baseQuestionId = parts[0]
      const stepNum = parts[2]

      if (!newAnswers[baseQuestionId]) {
        newAnswers[baseQuestionId] = {}
      }
      newAnswers[baseQuestionId][stepNum] = answer
    } else if (questionIdentifier && questionIdentifier.includes("_table_")) {
      const parts = questionIdentifier.split("_")
      const baseQuestionId = parts[0]
      const rowIndex = parts[2]
      const cellIndex = parts[3]
      const cellKey = `${rowIndex}_${cellIndex}`

      if (!newAnswers[baseQuestionId]) {
        newAnswers[baseQuestionId] = {}
      }
      newAnswers[baseQuestionId][cellKey] = answer
    } else if (questionIdentifier && questionIdentifier.includes("_summary_")) {
      const summaryAnswersKey = `${questionIdStr}_summary_answers`
      if (!newAnswers[summaryAnswersKey]) {
        newAnswers[summaryAnswersKey] = {}
      }
      newAnswers[summaryAnswersKey] = answer
    } else {
      newAnswers[questionIdStr] = answer
    }

    setAnswers(newAnswers)

    const answersKey = `listening_answers_${getExamIdForAnswers()}_${userId}`
    let answersArray = JSON.parse(localStorage.getItem(answersKey) || "[]")

    const question = getAllQuestions().find((q) => q.id.toString() === questionIdStr.split("_")[0])
    const actualQuestionType = question?.q_type || "UNKNOWN"

    const isEmptyAnswer =
      !answer || (typeof answer === "string" && answer.trim() === "") || (Array.isArray(answer) && answer.length === 0)

    if (!isEmptyAnswer) {
      if (actualQuestionType === "TFNG" && questionIdentifier && questionIdentifier.includes("_map_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const choiceNum = parts[2]

        const tfngQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (!tfngQuestion) {
          console.error("[v0] Could not find TFNG question for baseQuestionId:", baseQuestionId)
          return
        }

        const l_questionsID = tfngQuestion.id

        const existingAnswerIndex = answersArray.findIndex(
          (item: any) =>
            item.l_questionsID === l_questionsID &&
            item.question_type === "TFNG" &&
            item.answer &&
            item.answer[choiceNum],
        )

        if (existingAnswerIndex !== -1) {
          answersArray.splice(existingAnswerIndex, 1)
        }

        // Push new answer with only this choice
        answersArray.push({
          userId: String(userId),
          questionId: tfngQuestion.listening_questions_id,
          examId: Number.parseInt(getExamIdForAnswers()),
          question_type: actualQuestionType,
          answer: { [choiceNum]: answer },
          l_questionsID: l_questionsID,
        })
      } else if (questionIdentifier && questionIdentifier.includes("_note_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const inputIndex = parts[2]

        const noteQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (!noteQuestion) {
          console.error("[v0] Could not find NOTE_COMPLETION question")
          return
        }

        const l_questionsID = noteQuestion.id

        const oneBasedIndex = (Number.parseInt(inputIndex) + 1).toString()

        // Remove old answer for this specific input
        const existingAnswerIndex = answersArray.findIndex(
          (item: any) =>
            item.l_questionsID === l_questionsID &&
            item.question_type === "NOTE_COMPLETION" &&
            item.answer &&
            item.answer[oneBasedIndex],
        )

        if (existingAnswerIndex !== -1) {
          answersArray.splice(existingAnswerIndex, 1)
        }

        answersArray.push({
          userId: String(userId),
          questionId: noteQuestion.listening_questions_id,
          examId: Number.parseInt(getExamIdForAnswers()),
          question_type: actualQuestionType,
          answer: { [oneBasedIndex]: answer },
          l_questionsID: l_questionsID,
        })
      } else if (questionIdentifier && questionIdentifier.includes("_map_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const position = parts[2]

        const mapQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (!mapQuestion) {
          console.error("[v0] Could not find MAP_LABELING question for baseQuestionId:", baseQuestionId)
          return
        }

        const l_questionsID = mapQuestion.id

        const existingAnswerIndex = answersArray.findIndex(
          (item: any) =>
            item.l_questionsID === l_questionsID &&
            item.question_type === "MAP_LABELING" &&
            item.answer &&
            item.answer[position],
        )

        if (existingAnswerIndex !== -1) {
          answersArray.splice(existingAnswerIndex, 1)
        }

        answersArray.push({
          userId: String(userId),
          questionId: mapQuestion.listening_questions_id,
          examId: Number.parseInt(getExamIdForAnswers()),
          question_type: "MAP_LABELING",
          answer: { [position]: answer },
          l_questionsID: l_questionsID,
        })
      } else if (questionIdentifier && questionIdentifier.includes("_flow_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const stepNum = parts[2]

        const flowQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (!flowQuestion) {
          console.error("[v0] Could not find FLOW_CHART question for baseQuestionId:", baseQuestionId)
          return
        }

        const l_questionsID = flowQuestion.id

        const existingAnswerIndex = answersArray.findIndex(
          (item: any) =>
            item.l_questionsID === l_questionsID &&
            item.question_type === "FLOW_CHART" &&
            item.answer &&
            item.answer[stepNum],
        )

        if (existingAnswerIndex !== -1) {
          answersArray.splice(existingAnswerIndex, 1)
        }

        answersArray.push({
          userId: String(userId),
          questionId: flowQuestion.listening_questions_id,
          examId: Number.parseInt(getExamIdForAnswers()),
          question_type: "FLOW_CHART",
          answer: { [stepNum]: answer },
          l_questionsID: l_questionsID,
        })
      } else if (questionIdentifier && questionIdentifier.includes("_table_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const rowIndex = parts[2]
        const cellIndex = parts[3]
        const cellKey = `${rowIndex}_${cellIndex}`

        const tableQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (!tableQuestion) {
          console.error("[v0] Could not find TABLE_COMPLETION question for baseQuestionId:", baseQuestionId)
          return
        }

        const l_questionsID = tableQuestion.id

        const existingAnswerIndex = answersArray.findIndex(
          (item: any) =>
            item.l_questionsID === l_questionsID &&
            item.question_type === "TABLE_COMPLETION" &&
            item.answer &&
            item.answer[cellKey],
        )

        if (existingAnswerIndex !== -1) {
          answersArray.splice(existingAnswerIndex, 1)
        }

        answersArray.push({
          userId: String(userId),
          questionId: tableQuestion.listening_questions_id,
          examId: Number.parseInt(getExamIdForAnswers()),
          question_type: "TABLE_COMPLETION",
          answer: { [cellKey]: answer },
          l_questionsID: l_questionsID,
        })
      } else if (questionIdentifier && questionIdentifier.includes("_summary_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]

        const summaryQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (!summaryQuestion) {
          console.error("[v0] Could not find SUMMARY_DRAG question")
          return
        }

        const l_questionsID = summaryQuestion.id

        // Remove old answers for this question
        answersArray = answersArray.filter(
          (item: any) => !(item.l_questionsID === l_questionsID && item.question_type === "SUMMARY_DRAG"),
        )

        // Add new answers
        for (const [key, value] of Object.entries(answer)) {
          answersArray.push({
            userId: String(userId),
            questionId: summaryQuestion.listening_questions_id,
            examId: Number.parseInt(getExamIdForAnswers()),
            question_type: actualQuestionType,
            answer: { [key]: value },
            l_questionsID: l_questionsID,
          })
        }
      } else {
        const question = getAllQuestions().find((q) => q.id.toString() === questionIdStr)
        const l_questionsID = question?.listening_questions_id

        // Remove old answers for this question
        answersArray = answersArray.filter(
          (item: any) => !(item.questionId === l_questionsID && item.l_questionsID === Number.parseInt(questionIdStr)),
        )

        // For MCQ_MULTI, save each selected answer as a separate entry
        if (actualQuestionType === "MCQ_MULTI" && Array.isArray(answer)) {
          answer.forEach((singleAnswer: string) => {
            answersArray.push({
              userId: String(userId),
              questionId: l_questionsID,
              examId: Number.parseInt(getExamIdForAnswers()),
              question_type: actualQuestionType,
              answer: singleAnswer,
              l_questionsID: Number.parseInt(questionIdStr),
            })
          })
        } else {
          // For MCQ_SINGLE and other types, save as single entry
          answersArray.push({
            userId: String(userId),
            questionId: l_questionsID,
            examId: Number.parseInt(getExamIdForAnswers()),
            question_type: actualQuestionType,
            answer: answer,
            l_questionsID: Number.parseInt(questionIdStr),
          })
        }
      }
    } else {
      if (questionIdentifier && questionIdentifier.includes("_note_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const inputIndex = parts[2]

        const noteQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        if (noteQuestion) {
          const oneBasedIndex = (Number.parseInt(inputIndex) + 1).toString()
          answersArray = answersArray.filter(
            (item: any) =>
              !(
                item.l_questionsID === noteQuestion.id &&
                item.question_type === "NOTE_COMPLETION" &&
                item.answer &&
                item.answer[oneBasedIndex]
              ),
          )
        }
      } else if (questionIdentifier && questionIdentifier.includes("_map_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const position = parts[2]

        const mapQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        if (mapQuestion) {
          const existingAnswerIndex = answersArray.findIndex(
            (item: any) =>
              item.l_questionsID === mapQuestion.id &&
              item.question_type === "MAP_LABELING" &&
              item.answer &&
              item.answer[position],
          )

          if (existingAnswerIndex !== -1) {
            answersArray.splice(existingAnswerIndex, 1)
          }
        }
      } else if (questionIdentifier && questionIdentifier.includes("_flow_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const stepNum = parts[2]

        const flowQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        if (flowQuestion) {
          const existingAnswerIndex = answersArray.findIndex(
            (item: any) =>
              item.l_questionsID === flowQuestion.id &&
              item.question_type === "FLOW_CHART" &&
              item.answer &&
              item.answer[stepNum],
          )

          if (existingAnswerIndex !== -1) {
            answersArray.splice(existingAnswerIndex, 1)
          }
        }
      } else if (questionIdentifier && questionIdentifier.includes("_table_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const rowIndex = parts[2]
        const cellIndex = parts[3]
        const cellKey = `${rowIndex}_${cellIndex}`

        const tableQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        if (tableQuestion) {
          const existingAnswerIndex = answersArray.findIndex(
            (item: any) =>
              item.l_questionsID === tableQuestion.id &&
              item.question_type === "TABLE_COMPLETION" &&
              item.answer &&
              item.answer[cellKey],
          )

          if (existingAnswerIndex !== -1) {
            answersArray.splice(existingAnswerIndex, 1)
          }
        }
      } else if (actualQuestionType === "MCQ_MULTI" && Array.isArray(answer)) {
        // For MCQ_MULTI, if an answer is deselected, remove its corresponding entry
        answersArray = answersArray.filter(
          (item: any) => !(item.l_questionsID === Number.parseInt(questionIdStr) && item.answer === answer),
        )
      } else {
        // For other question types, remove the answer if the input is cleared
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
      await submitAnswers()
    }
  }

  const submitAnswers = async () => {
    setShowSubmitLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

      const answersKey = `listening_answers_${getExamIdForAnswers()}_${userId}`
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

      for (const answerData of answersArray) {
        const response = await fetch(`${API_BASE_URL}/listening-answers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(answerData),
        })

        if (!response.ok) {
          throw new Error(`Failed to submit answer: ${response.statusText}`)
        }
      }

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
          groupId: questionGroup.id,
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
    } else if (question.q_type === "NOTE_COMPLETION") {
      const answersKey = `listening_answers_${getExamIdForAnswers()}_${userId}`
      const savedAnswers = localStorage.getItem(answersKey)
      const answersArray: any[] = savedAnswers ? JSON.parse(savedAnswers) : []

      const oneBasedIndex = (subIndex + 1).toString()
      const answerEntry = answersArray.find(
        (item: any) =>
          item.l_questionsID === question.id &&
          item.question_type === "NOTE_COMPLETION" &&
          item.answer &&
          item.answer[oneBasedIndex],
      )
      return answerEntry !== undefined && answerEntry.answer[oneBasedIndex] !== ""
    } else if (question.q_type === "TFNG") {
      const answersKey = `listening_answers_${getExamIdForAnswers()}_${userId}`
      const savedAnswers = localStorage.getItem(answersKey)
      const answersArray: any[] = savedAnswers ? JSON.parse(savedAnswers) : []

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
        const answerEntry = answersArray.find(
          (item: any) =>
            item.l_questionsID === question.id &&
            item.question_type === "TFNG" &&
            item.answer &&
            item.answer[choiceNum],
        )
        return (
          answerEntry !== undefined && answerEntry.answer[choiceNum] !== "" && answerEntry.answer[choiceNum] !== null
        )
      }

      return false
    } else if (question.q_type === "SUMMARY_DRAG") {
      const answersKey = `listening_answers_${getExamIdForAnswers()}_${userId}`
      const savedAnswers = localStorage.getItem(answersKey)
      const answersArray: any[] = savedAnswers ? JSON.parse(savedAnswers) : []

      let optionsData: Record<string, string> = {}
      if (question.options) {
        if (typeof question.options === "object") {
          optionsData = question.options
        } else if (typeof question.options === "string") {
          try {
            optionsData = JSON.parse(question.options)
          } catch (e) {
            return false
          }
        }
      }

      const optionKeys = Object.keys(optionsData)
      if (subIndex < optionKeys.length) {
        const optionKey = optionKeys[subIndex]
        const answerEntry = answersArray.find(
          (item: any) =>
            item.l_questionsID === question.id &&
            item.question_type === "SUMMARY_DRAG" &&
            item.answer &&
            item.answer[optionKey],
        )
        return answerEntry !== undefined && answerEntry.answer[optionKey] !== ""
      }

      return false
    } else if (question.q_type === "MCQ_MULTI") {
      const answer = answers[questionIdStr]
      if (Array.isArray(answer)) {
        return answer.length > subIndex
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
    setTimerActive(true)
  }

  const handleTimerExpired = () => {
    setTimerExpired(true)
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

      // Calculate total questions by summing up question counts (including sub-questions)
      const totalQuestions = questions.reduce((sum, q) => sum + getQuestionCount(q), 0)

      // Calculate answered questions by counting answered sub-questions
      let answeredCount = 0
      questions.forEach((q) => {
        const questionCount = getQuestionCount(q)
        for (let i = 0; i < questionCount; i++) {
          if (isSubQuestionAnswered(q, i)) {
            answeredCount++
          }
        }
      })

      return {
        partNumber: partNum,
        questions: questions,
        totalQuestions: totalQuestions,
        answeredQuestions: answeredCount,
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
    return { start: 0, end: 0 }
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
    return 1
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
          break
        }
        currentQuestionNumber += getQuestionCount(q)
      } else if (q.part > part) {
        break
      }
    }
    return 1
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
    return 1
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
    return 1
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

    if (minutes <= 5 && minutes > 0) {
      return `${minutes} minutes ${seconds} seconds`
    }

    if (minutes === 0) {
      return `${seconds} seconds`
    }

    return `${minutes} minutes`
  }

  const formatTotalAudioDuration = () => {
    if (!audioDuration || !audioDurationLoaded) return "..."
    return formatAudioTime(audioDuration)
  }

  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({})

  useEffect(() => {
    if (typeof window !== "undefined") {
      const answersKey = `listening_answers_${getExamIdForAnswers()}_${userId}`
      const savedAnswers = localStorage.getItem(answersKey)

      if (savedAnswers) {
        try {
          const parsedAnswers = JSON.parse(savedAnswers)
          const loadedAnswers: Record<string, any> = {}

          parsedAnswers.forEach((item: any) => {
            if (item.question_type === "NOTE_COMPLETION") {
              const oneBasedIndex = Object.keys(item.answer)[0]
              const zeroBasedIndex = (Number.parseInt(oneBasedIndex) - 1).toString()
              const inputId = `${item.l_questionsID}_note_${zeroBasedIndex}`
              loadedAnswers[inputId] = item.answer[oneBasedIndex]
            } else if (item.question_type === "TFNG") {
              const baseId = item.l_questionsID.toString()
              if (!loadedAnswers[baseId]) {
                loadedAnswers[baseId] = {}
              }
              Object.assign(loadedAnswers[baseId], item.answer)
            } else if (item.question_type === "TABLE_COMPLETION") {
              const baseId = item.l_questionsID.toString()
              if (!loadedAnswers[baseId]) {
                loadedAnswers[baseId] = {}
              }
              Object.assign(loadedAnswers[baseId], item.answer)
            } else if (item.question_type === "FLOW_CHART") {
              const baseId = item.l_questionsID.toString()
              if (!loadedAnswers[baseId]) {
                loadedAnswers[baseId] = {}
              }
              Object.assign(loadedAnswers[baseId], item.answer)
            } else if (item.question_type === "MAP_LABELING") {
              const baseId = item.l_questionsID.toString()
              if (!loadedAnswers[baseId]) {
                loadedAnswers[baseId] = {}
              }
              Object.assign(loadedAnswers[baseId], item.answer)
            } else if (item.question_type === "MCQ_MULTI") {
              const baseId = item.l_questionsID.toString()
              if (!loadedAnswers[baseId]) {
                loadedAnswers[baseId] = []
              }
              // Collect all answers for this question from separate entries
              if (!Array.isArray(loadedAnswers[baseId])) {
                loadedAnswers[baseId] = []
              }
              loadedAnswers[baseId].push(item.answer)
            } else if (item.question_type === "SUMMARY_DRAG") {
              const summaryAnswersKey = `${item.l_questionsID}_summary_answers`
              if (!loadedAnswers[summaryAnswersKey]) {
                loadedAnswers[summaryAnswersKey] = {}
              }
              Object.assign(loadedAnswers[summaryAnswersKey], item.answer)
            } else {
              loadedAnswers[item.l_questionsID] = item.answer
            }
          })
          setUserAnswers(loadedAnswers)
          setAnswers(loadedAnswers)
        } catch (error) {
          console.error("Error loading answers:", error)
        }
      }
    }
  }, [examId, userId])

  const saveToLocalStorage = (questionIdentifier: string, answer: any, questionType: string) => {
    if (typeof window === "undefined") return

    const answersKey = `listening_answers_${getExamIdForAnswers()}_${userId}`
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
      const tableAnswersKey = `${questionIdentifier}_answer`
      answersObject[tableAnswersKey] = answer
    } else {
      answersObject[questionIdentifier] = answer
    }

    localStorage.setItem(answersKey, JSON.stringify(answersObject))
  }

  const clearAnswer = (questionIdentifier: string, questionType: string) => {
    if (typeof window === "undefined") return

    const answersKey = `listening_answers_${getExamIdForAnswers()}_${userId}`
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
      const tableAnswersKey = `${questionIdentifier}_answer`
      delete answersObject[tableAnswersKey]

      setAnswers((prev) => {
        const newAnswers = { ...prev }
        delete newAnswers[tableAnswersKey]
        return newAnswers
      })
      setUserAnswers((prev) => {
        const newAnswers = { ...prev }
        delete newAnswers[tableAnswersKey]
        return newAnswers
      })
    } else {
      delete answersObject[questionIdentifier]
      setAnswers((prev) => {
        const newAnswers = { ...prev }
        delete newAnswers[questionIdentifier]
        return newAnswers
      })
      setUserAnswers((prev) => {
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
                } else if (questionType === "MAP_LABELING") {
                  currentAnswer = answers[questionId] || {}
                } else if (questionType === "FLOW_CHART") {
                  currentAnswer = answers[questionId] || {}
                } else if (questionType === "SUMMARY_DRAG") {
                  currentAnswer = answers[`${questionId}_summary_answers`] || {}
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
                    {(question.q_type === "MCQ_SINGLE" && isFirstInGroup) ||
                    ["MCQ_MULTI", "TABLE_COMPLETION", "MAP_LABELING", "SENTENCE_COMPLETION", "SUMMARY_DRAG"].includes(
                      question.q_type || "",
                    ) ||
                    question.q_type === "NOTE_COMPLETION" ||
                    question.q_type === "TFNG" ||
                    question.q_type === "FLOW_CHART" ? (
                      <div className="mb-4">
                        <h4
                          className="text-base sm:text-lg font-bold text-gray-900 mb-2"
                          style={{ fontSize: `${textSize * 1.125}px` }}
                        >
                          {question.q_type === "MCQ_SINGLE" && isFirstInGroup
                            ? (() => {
                                const groupQuestions = currentPartQuestions.filter(
                                  (q) => q.groupId === question.groupId && q.q_type === "MCQ_SINGLE",
                                )
                                const totalQuestionsInGroup = groupQuestions.length
                                const groupEndNum = questionStartNum + totalQuestionsInGroup - 1
                                return `Questions ${questionStartNum}–${groupEndNum}`
                              })()
                            : question.q_type === "NOTE_COMPLETION"
                              ? (() => {
                                  const noteQuestions = currentPartQuestions.filter(
                                    (q) => q.q_type === "NOTE_COMPLETION",
                                  )
                                  // Calculate start and end based on all questions in the current part, not just NOTE_COMPLETION ones
                                  const partRange = getPartQuestionRange(currentPart)
                                  return `Questions ${partRange.start}–${partRange.end}`
                                })()
                              : `Questions ${questionStartNum}–${questionEndNum}`}
                        </h4>
                      </div>
                    ) : null}

                    {isFirstInGroup && questionGroup?.instruction && question.q_type !== "MATCHING_INFORMATION" && (
                      <div className="mb-4">
                        <div
                          className="text-gray-700"
                          style={{ fontSize: `${textSize}px` }}
                          dangerouslySetInnerHTML={{ __html: questionGroup.instruction }}
                        />
                      </div>
                    )}

                    {(["MCQ_MULTI", "TABLE_COMPLETION", "MAP_LABELING", "SUMMARY_DRAG"].includes(
                      question.q_type || "",
                    ) ||
                      question.q_type === "NOTE_COMPLETION" ||
                      question.q_type === "TFNG" ||
                      question.q_type === "FLOW_CHART") &&
                      question.q_text && (
                        <div
                          className="text-gray-700 mb-4"
                          style={{ fontSize: `${textSize}px` }}
                          dangerouslySetInnerHTML={{ __html: question.q_text }}
                        />
                      )}

                    {question.q_type === "TFNG" && question.photo && question.choices && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="lg:col-span-1">
                            <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_URL}/uploads/l_questions/${question.photo}`}
                                alt="Map"
                                className="w-full h-auto"
                              />
                            </div>
                          </div>

                          <div className="lg:col-span-1">
                            <table className="w-full border-2 border-black">
                              <thead>
                                <tr className="border-b-2 border-black">
                                  <th className="p-3 bg-white"></th>

                                  {(Array.isArray(question.options)
                                    ? question.options
                                    : JSON.parse(question.options)
                                  ).map((opt: any, idx: number) => (
                                    <th
                                      key={idx}
                                      className="p-3 text-center bg-white font-bold text-gray-900 border-l-2 border-black"
                                      style={{ fontSize: `${textSize}px` }}
                                    >
                                      {opt.text || opt}
                                    </th>
                                  ))}
                                </tr>
                              </thead>

                              <tbody>
                                {Object.entries(
                                  typeof question.choices === "string"
                                    ? JSON.parse(question.choices)
                                    : question.choices,
                                ).map(([choiceNum, choiceText], idx) => {
                                  const actualQuestionNum = questionStartNum + idx
                                  const questionIdentifier = `${question.id}_map_${choiceNum}`
                                  const optionsArray = Array.isArray(question.options)
                                    ? question.options
                                    : JSON.parse(question.options)
                                  const choiceAnswer =
                                    typeof currentAnswer === "object" && currentAnswer !== null
                                      ? currentAnswer[choiceNum]
                                      : undefined

                                  return (
                                    <tr
                                      key={choiceNum}
                                      className="border-b-2 border-black hover:bg-blue-50 transition-colors duration-100"
                                    >
                                      <td className="p-3 font-bold text-gray-900 border-r-2 border-black">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`border-2 border-[#4B61D1] w-6 h-6 rounded flex items-center justify-center text-sm font-bold transition-all ${
                                              choiceAnswer ? "bg-green-500 text-white" : "bg-white text-gray-900"
                                            }`}
                                            style={{ fontSize: `${textSize * 0.875}px` }}
                                          >
                                            {actualQuestionNum}
                                          </span>
                                          <span style={{ fontSize: `${textSize}px` }}>{choiceText}</span>
                                        </div>
                                      </td>

                                      {optionsArray.map((opt: any, optIndex: number) => {
                                        const inputId = `radio_${question.id}_${choiceNum}_${opt.key || opt}`
                                        const isSelected = choiceAnswer === (opt.key || opt)

                                        return (
                                          <td key={optIndex} className="p-3 text-center border-l-2 border-black">
                                            <label
                                              htmlFor={inputId}
                                              className="inline-flex items-center justify-center cursor-pointer"
                                            >
                                              <input
                                                type="radio"
                                                id={inputId}
                                                name={questionIdentifier}
                                                value={opt.key || opt}
                                                checked={isSelected}
                                                onChange={(e) =>
                                                  handleAnswerChange(
                                                    question.id.toString(),
                                                    e.target.value,
                                                    questionIdentifier,
                                                  )
                                                }
                                                className="relative w-[16px] h-[16px] rounded-full border border-black appearance-none cursor-pointer bg-white transition-all duration-150
                                                    checked:before:content-[''] checked:before:absolute checked:before:top-[3px] checked:before:left-[3px]
                                                    checked:before:w-[8px] checked:before:h-[8px] checked:before:bg-[#4B61D1] checked:before:rounded-full
                                                    hover:ring-2 hover:ring-[#4B61D1]/30"
                                              />
                                            </label>
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {question.q_type === "MCQ_SINGLE" && optionsArray.length > 0 && (
                      <div className="space-y-[2px] mb-[6px]">
                        <div className="flex items-center gap-2 mb-[2px]">
                          <div className="min-w-[24px] text-[13px] font-semibold text-black border border-[#4B61D1] bg-white rounded-sm text-center leading-tight px-[3px]">
                            {questionStartNum}
                          </div>
                          {question.q_text && (
                            <div
                              className="text-[14px] text-gray-900 font-medium leading-tight"
                              dangerouslySetInnerHTML={{ __html: question.q_text }}
                            />
                          )}
                        </div>

                        <div className="space-y-[1px] ml-[28px] mt-[1px]">
                          {optionsArray.map((option) => {
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
                                  className="text-[14px] text-gray-900 leading-tight"
                                  dangerouslySetInnerHTML={{ __html: option.text }}
                                />
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {question.q_type === "MCQ_MULTI" && optionsArray.length > 0 && (
                      <div className="space-y-[2px] mb-[6px] ml-[20px]">
                        {question.q_text && (
                          <div className="mb-[6px] text-[15px] font-semibold text-gray-900 flex items-center gap-2">
                            <span className="border-2 border-blue-500 text-gray-900 bg-white px-[6px] py-[1px] rounded-[4px]">
                              {questionStartNum}–
                              {questionStartNum +
                                (Array.isArray(question.correct_answers) ? question.correct_answers.length : 1) -
                                1}
                            </span>
                          </div>
                        )}

                        {optionsArray.map((option) => {
                          const currentAnswersArray = currentAnswer
                            ? Array.isArray(currentAnswer)
                              ? currentAnswer
                              : typeof currentAnswer === "string"
                                ? currentAnswer.split(",").filter(Boolean)
                                : [String(currentAnswer)]
                            : []

                          const maxSelections = Array.isArray(question.correct_answers)
                            ? question.correct_answers.length
                            : 1
                          const isSelected = currentAnswersArray.includes(option.key)
                          const canSelect = isSelected || currentAnswersArray.length < maxSelections

                          return (
                            <label
                              key={option.key}
                              htmlFor={`q${question.id}-${option.key}`}
                              onClick={() => {
                                if (!canSelect) return

                                let newAnswers: string[]
                                if (isSelected) {
                                  newAnswers = currentAnswersArray.filter((a) => a !== option.key)
                                } else {
                                  newAnswers = [...currentAnswersArray, option.key]
                                }
                                handleAnswerChange(questionId, newAnswers)
                              }}
                              className={`flex items-center gap-3 cursor-pointer select-none px-[3px] py-[1px] rounded-md transition-all duration-100 ${
                                isSelected
                                  ? "bg-blue-50"
                                  : canSelect
                                    ? "hover:bg-gray-50"
                                    : "opacity-50 cursor-not-allowed"
                              }`}
                            >
                              <input
                                type="checkbox"
                                id={`q${question.id}-${option.key}`}
                                checked={isSelected}
                                disabled={!canSelect}
                                readOnly
                                className="peer relative w-[16px] h-[16px] rounded-[3px] border border-black appearance-none cursor-pointer bg-white transition-all duration-150
                                checked:before:content-[''] checked:before:absolute checked:before:top-[3px] checked:before:left-[3px]
                                checked:before:w-[8px] checked:before:h-[8px] checked:before:bg-[#4B61D1] checked:before:rounded-[1px]
                                disabled:opacity-50 disabled:cursor-not-allowed"
                              />

                              <span
                                className="text-[14px] text-gray-900 leading-tight"
                                dangerouslySetInnerHTML={{ __html: option.text }}
                              />
                            </label>
                          )
                        })}
                      </div>
                    )}

                    {question.q_type === "SENTENCE_COMPLETION" && (
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div
                            className="text-base sm:text-lg font-semibold bg-white border-2 border-blue-500 text-gray-900 px-3 py-1 rounded flex-shrink-0"
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

                                return (
                                  <div className="flex flex-wrap items-center gap-2">
                                    {parts.map((part, index) => (
                                      <React.Fragment key={index}>
                                        <span dangerouslySetInnerHTML={{ __html: part }} />
                                        {index < parts.length - 1 && (
                                          <Input
                                            value={currentAnswer || ""}
                                            onChange={(e) => handleAnswerChange(questionId, e.target.value)}
                                            className="inline-block w-32 px-2 py-1 text-sm bg-white border-2 border-black focus:border-black rounded"
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

                    {question.q_type === "MATCHING_INFORMATION" && (
                      <div className="space-y-5">
                        {isFirstInGroup && questionGroup?.instruction && (
                          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3">
                            <div
                              className="text-gray-800 leading-relaxed"
                              style={{ fontSize: `${textSize}px` }}
                              dangerouslySetInnerHTML={{ __html: questionGroup.instruction }}
                            />
                          </div>
                        )}

                        <div className="overflow-x-auto">
                          <table className="w-full border-2 border-black text-base">
                            <thead>
                              <tr className="bg-gray-100 border-b-2 border-black">
                                <th
                                  className="p-2 text-left font-bold text-black border-r-2 border-black"
                                  style={{ fontSize: `${textSize}px` }}
                                >
                                  Questions {questionStartNum}–{questionEndNum}
                                </th>
                                {question.choices &&
                                  Object.keys(question.choices).map((choiceKey) => (
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
                              {question.rows?.map((rowText, index) => (
                                <tr key={index} className="border-b-2 border-black hover:bg-blue-50 transition">
                                  <td className="border-r-2 border-black p-2 text-black font-semibold">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-white border-2 border-[#4B61D1] text-gray-900 w-6 h-6 rounded flex items-center justify-center text-xs font-bold">
                                        {questionStartNum + index}
                                      </span>
                                      <span
                                        className="text-gray-900"
                                        style={{ fontSize: `${textSize * 0.95}px` }}
                                        dangerouslySetInnerHTML={{ __html: rowText }}
                                      />
                                    </div>
                                  </td>

                                  {question.choices &&
                                    Object.keys(question.choices).map((choiceKey) => (
                                      <td key={choiceKey} className="border-l-2 border-black p-2 text-center">
                                        <input
                                          type="radio"
                                          name={`matching_${question.id}_${index}`}
                                          value={choiceKey}
                                          checked={answers[`${question.id}_matching_${index}`] === choiceKey}
                                          onChange={(e) =>
                                            handleAnswerChange(`${question.id}_matching_${index}`, e.target.value)
                                          }
                                          className="w-4 h-4 accent-[#4B61D1] cursor-pointer"
                                        />
                                      </td>
                                    ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-5">
                          <h5 className="font-bold mb-2 text-black" style={{ fontSize: `${textSize}px` }}>
                            {question.q_text ? (
                              <span dangerouslySetInnerHTML={{ __html: question.q_text }} />
                            ) : (
                              "Choices:"
                            )}
                          </h5>

                          <div className="overflow-x-auto">
                            <table className="w-full border-2 border-black text-base">
                              <tbody>
                                {question.choices &&
                                  Object.entries(question.choices).map(([key, text]) => (
                                    <tr key={key} className="border-b-2 border-black">
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

                    {question.q_type === "TABLE_COMPLETION" && (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border-2 border-black">
                          <thead>
                            <tr>
                              <th className="border-2 border-black p-2 bg-gray-100 font-bold text-left"></th>
                              {question.columns?.map((column: string, colIndex: number) => (
                                <th
                                  key={colIndex}
                                  className="border-2 border-black p-2 bg-gray-100 font-bold text-center"
                                >
                                  {column}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {question.rows?.map((row: any, rowIndex: number) => (
                              <tr key={rowIndex}>
                                <td className="border-2 border-black p-2 bg-gray-50 font-bold text-left">
                                  {row.label}
                                </td>
                                {row.cells?.map((cell: string, cellIndex: number) => {
                                  const isEmptyOrUnderscore = cell === "" || cell === "_"
                                  const hasUnderscores =
                                    typeof cell === "string" && /_+/.test(cell) && !isEmptyOrUnderscore

                                  if (isEmptyOrUnderscore || hasUnderscores) {
                                    const tableAnswersKey = `${questionId}_answer`
                                    const tableAnswers = answers[tableAnswersKey] || {}
                                    const cellKey = `${rowIndex}_${cellIndex}`

                                    let inputQuestionNumber = questionStartNum
                                    for (let r = 0; r < rowIndex; r++) {
                                      for (let c = 0; c < question.rows[r].cells.length; c++) {
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
                                                      onChange={(e) => {
                                                        const tableIdentifier = `${questionId}_table_${rowIndex}_${cellIndex}`
                                                        handleAnswerChange(
                                                          questionId,
                                                          {
                                                            ...tableAnswers,
                                                            [cellKey]: e.target.value,
                                                          },
                                                          tableIdentifier,
                                                        )
                                                      }}
                                                      className="inline-block w-32 text-sm bg-white border-2 border-black focus:border-black text-center"
                                                      placeholder={inputQuestionNumber.toString()}
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
                                              className="w-full text-sm bg-white border-2 border-black focus:border-black text-center"
                                              placeholder={inputQuestionNumber.toString()}
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

                    {question.q_type === "MAP_LABELING" && question.photo && question.rows && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2">
                            <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_URL}/uploads/l_questions/${question.photo}`}
                                alt="Map"
                                className="w-full h-auto"
                                draggable={false}
                              />
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
                                  const currentAnswer = answers[question.id]?.[position]
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
                                          const dropZoneQuestionId = `${question.id}_map_${position}`
                                          handleAnswerChange(question.id.toString(), optionKey, dropZoneQuestionId)
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
                                      return answers[question.id]?.[position] === option.key
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
                                    return answers[question.id]?.[position] === option.key
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
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          <div className="lg:col-span-2">
                            <div className="space-y-1">
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

                                return (
                                  <React.Fragment key={stepNum}>
                                    <div className="border border-gray-400 rounded-md p-2 bg-white shadow-sm">
                                      {hasBlank ? (
                                        <div className="text-[15px] text-gray-900 leading-snug">
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
                                                  className={`inline-flex items-center gap-2 min-w-[120px] px-2 py-[4px] mx-[3px] border-2 border-dashed rounded-md transition-all
                                                                  ${
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
                                                      handleAnswerChange(
                                                        question.id.toString(),
                                                        optionKey,
                                                        fullQuestionId,
                                                      )
                                                    }
                                                  }}
                                                  onClick={() => {
                                                    if (currentAnswer) {
                                                      const fullQuestionId = `${question.id}_flow_${stepNum}`
                                                      handleAnswerChange(question.id.toString(), null, fullQuestionId)
                                                    }
                                                  }}
                                                >
                                                  <span className="bg-[#4B61D1] text-white px-2 py-[1px] rounded text-xs font-medium">
                                                    {stepQuestionNum}
                                                  </span>
                                                  {currentAnswer ? (
                                                    <span className="font-semibold text-gray-700 text-[14px]">
                                                      {currentAnswer}
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
                                        <div className="text-[15px] text-gray-900 leading-snug">{stepText}</div>
                                      )}
                                    </div>

                                    {index < Object.keys(question.choices).length - 1 && (
                                      <div className="flex justify-center relative h-5">
                                        <div className="w-0.5 h-4 bg-gray-400"></div>
                                        <div className="absolute bottom-0 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-400"></div>
                                      </div>
                                    )}
                                  </React.Fragment>
                                )
                              })}
                            </div>
                          </div>

                          <div className="lg:col-span-1">
                            <div
                              className="bg-gray-50 border border-gray-300 rounded-md p-3 sticky top-4 shadow-sm"
                              onDragOver={(e) => e.preventDefault()}
                            >
                              <h4 className="font-semibold text-gray-900 mb-2" style={{ fontSize: `${textSize}px` }}>
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
                                        onDragEnd={(e) => e.currentTarget.classList.remove("opacity-50")}
                                        className="bg-white border border-gray-400 rounded-md px-3 py-1 cursor-move transition-all hover:border-[#4B61D1] hover:shadow"
                                      >
                                        <div className="flex items-center justify-center">
                                          <span className="text-gray-900 font-medium text-sm">{optionKey}</span>
                                        </div>
                                      </div>
                                    ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {question.q_type === "NOTE_COMPLETION" && question.options && (
                      <div className="space-y-0">
                        <div className="bg-white0 rounded-lg p-2 leading-[2.4]">
                          {(() => {
                            const optionsText =
                              typeof question.options === "string" ? question.options : JSON.stringify(question.options)

                            const parts = optionsText.split(/(<h1>.*?<\/h1>)/g)
                            let currentInputIndex = 0

                            return parts.map((part, index) => {
                              if (/<h1>.*?<\/h1>/.test(part)) {
                                const headingText = part.replace(/<\/?h1>/g, "").trim()
                                return (
                                  <div key={index} className="text-center my-8 font-bold text-[22px] text-[#121545]">
                                    {headingText}
                                  </div>
                                )
                              }

                              const textParts = part.split(/(____+)/)

                              return (
                                <div key={index} className="my-3">
                                  {textParts.map((subPart, subIndex) => {
                                    if (subPart.match(/____+/)) {
                                      const questionNum = questionStartNum + currentInputIndex
                                      const inputId = `${question.id}_note_${currentInputIndex}`
                                      const currentAnswer = answers[inputId] || ""
                                      currentInputIndex++

                                      const answersKey = `listening_answers_${getExamIdForAnswers()}_${userId}`
                                      const savedAnswers = localStorage.getItem(answersKey)
                                      const answersArray: any[] = savedAnswers ? JSON.parse(savedAnswers) : []
                                      const isAnswered = answersArray.some(
                                        (item: any) =>
                                          item.question_type === "NOTE_COMPLETION" &&
                                          item.l_questionsID === question.id &&
                                          item.answer &&
                                          item.answer[currentInputIndex.toString()],
                                      )

                                      return (
                                        <span
                                          key={`${index}_${subIndex}`}
                                          className="inline-flex items-center mx-[4px] align-middle"
                                        >
                                          <Input
                                            type="text"
                                            value={currentAnswer}
                                            onChange={(e) => handleAnswerChange(inputId, e.target.value, inputId)}
                                            placeholder={questionNum.toString()}
                                            className={`inline-block w-[160px] px-3 py-[3px] text-center text-sm
                                   bg-white border border-gray-700 rounded-[4px]
                                   focus:outline-none focus:ring-[0.5px] focus:ring-black focus:border-black
                                   placeholder-gray-400 transition-all duration-150
                                   ${isAnswered ? "bg-green-50 border-green-500" : ""}`}
                                          />
                                        </span>
                                      )
                                    } else {
                                      return (
                                        <span
                                          key={`${index}_${subIndex}`}
                                          className="text-gray-900 leading-relaxed"
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

                    {question.q_type === "SUMMARY_DRAG" &&
                      (() => {
                        let optionsData: Record<string, string> = {}
                        let choicesArray: string[] = []
                        let headersData: string[] = ["People", "Staff Responsibilities"]

                        if (question.options) {
                          try {
                            optionsData =
                              typeof question.options === "string" ? JSON.parse(question.options) : question.options
                          } catch (e) {
                            console.error("Failed to parse SUMMARY_DRAG options:", e)
                          }
                        }

                        if (question.choices) {
                          try {
                            choicesArray =
                              typeof question.choices === "string" ? JSON.parse(question.choices) : question.choices
                          } catch (e) {
                            console.error("Failed to parse SUMMARY_DRAG choices:", e)
                          }
                        }

                        if (question.rows?.headers && Array.isArray(question.rows.headers)) {
                          headersData = question.rows.headers
                        }

                        const usedChoices = new Set<string>()
                        if (currentAnswer && typeof currentAnswer === "object") {
                          Object.values(currentAnswer).forEach((v) => v && usedChoices.add(v as string))
                        }
                        const availableChoices = choicesArray.filter((c) => !usedChoices.has(c))

                        const handleDragStart = (e: React.DragEvent<HTMLDivElement>, choice: string) => {
                          e.dataTransfer.effectAllowed = "move"
                          e.dataTransfer.setData("text/plain", choice)
                          e.currentTarget.classList.add("opacity-60")
                          setDraggedItem(choice)
                          setDragSource("choices")
                        }

                        const handleDragStartFromGap = (e: React.DragEvent<HTMLDivElement>, key: string) => {
                          const val = currentAnswer?.[key]
                          if (val) {
                            e.dataTransfer.effectAllowed = "move"
                            e.dataTransfer.setData("text/plain", val)
                            e.dataTransfer.setData("removeFrom", key)
                            e.currentTarget.classList.add("opacity-60")
                            setDraggedItem(val)
                            setDragSource("gap")
                          }
                        }

                        const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
                          e.preventDefault()
                          e.currentTarget.classList.add("bg-blue-50", "border-blue-500")
                        }

                        const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
                          e.currentTarget.classList.remove("bg-blue-50", "border-blue-500")
                        }

                        const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
                          e.currentTarget.classList.remove("opacity-60")
                        }

                        const handleDropOnGap = (e: React.DragEvent<HTMLDivElement>, key: string) => {
                          e.preventDefault()
                          e.currentTarget.classList.remove("bg-blue-50", "border-blue-500")
                          const choice = e.dataTransfer.getData("text/plain")
                          const removeFrom = e.dataTransfer.getData("removeFrom")
                          if (choice) {
                            const newAnswer = { ...currentAnswer, [key]: choice }
                            if (removeFrom && removeFrom !== key) delete newAnswer[removeFrom]
                            handleAnswerChange(question.id.toString(), newAnswer, `${question.id}_summary_`)
                          }
                          setDraggedItem(null)
                          setDragSource(null)
                        }

                        const handleDropOnChoices = (e: React.DragEvent<HTMLDivElement>) => {
                          e.preventDefault()
                          e.currentTarget.classList.remove("bg-blue-50", "border-blue-500")
                          const removeFrom = e.dataTransfer.getData("removeFrom")
                          if (removeFrom) {
                            const newAnswer = { ...currentAnswer }
                            delete newAnswer[removeFrom]
                            handleAnswerChange(question.id.toString(), newAnswer, `${question.id}_summary_`)
                          }
                          setDraggedItem(null)
                          setDragSource(null)
                        }

                        return (
                          <div className="space-y-5">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <div className="font-bold text-gray-900 mb-1" style={{ fontSize: `${textSize}px` }}>
                                  {headersData[0]}
                                </div>

                                {Object.entries(optionsData).map(([key, text], idx) => {
                                  const currentValue = currentAnswer?.[key]
                                  const num = questionStartNum + idx
                                  const isAnswered = currentValue !== undefined && currentValue !== ""
                                  return (
                                    <div key={key} className="flex items-center justify-between gap-3">
                                      <div
                                        className="text-gray-900 font-medium flex-1"
                                        style={{ fontSize: `${textSize}px` }}
                                      >
                                        {text}
                                      </div>
                                      <div
                                        className={`border-2 border-dashed rounded-md px-3 py-1 w-[160px] text-center cursor-pointer transition-all ${
                                          isAnswered
                                            ? "bg-green-50 border-green-500"
                                            : "bg-white border-gray-400 hover:border-[#4B61D1]"
                                        }`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDropOnGap(e, key)}
                                      >
                                        {currentValue ? (
                                          <div
                                            draggable
                                            onDragStart={(e) => handleDragStartFromGap(e, key)}
                                            onDragEnd={handleDragEnd}
                                            className="cursor-move text-gray-900 font-semibold truncate hover:opacity-70"
                                            style={{ fontSize: `${textSize}px` }}
                                            title="Drag back to options to remove"
                                          >
                                            {currentValue}
                                          </div>
                                        ) : (
                                          <span
                                            className="text-gray-400 font-semibold"
                                            style={{ fontSize: `${textSize}px` }}
                                          >
                                            {num}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              <div className="space-y-2">
                                <div className="font-bold text-gray-900 mb-1" style={{ fontSize: `${textSize}px` }}>
                                  {headersData[1]}
                                </div>

                                <div
                                  className="border-2 border-dashed border-gray-300 rounded-md px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors min-h-[40px] flex items-center justify-center"
                                  onDragOver={handleDragOver}
                                  onDragLeave={handleDragLeave}
                                  onDrop={handleDropOnChoices}
                                >
                                  <span className="text-sm text-gray-500">Drop here to remove</span>
                                </div>

                                <div className="space-y-2">
                                  {availableChoices.map((choice, idx) => (
                                    <div
                                      key={idx}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, choice)}
                                      onDragEnd={handleDragEnd}
                                      className={`border border-gray-400 rounded-md px-3 py-2 text-center cursor-move transition-all hover:border-[#4B61D1] hover:shadow ${
                                        draggedItem === choice ? "opacity-60 bg-gray-100" : "bg-white"
                                      }`}
                                    >
                                      <span className="text-gray-900 font-medium" style={{ fontSize: `${textSize}px` }}>
                                        {choice}
                                      </span>
                                    </div>
                                  ))}

                                  {availableChoices.length === 0 && (
                                    <p className="text-sm text-gray-500 text-center mt-2">All options used</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 ${getNavigationColorClasses()} border-t z-50 shadow-md`}>
        <div className="w-full px-12 py-6 bg-white">
          <div className="flex items-center justify-center gap-20 relative">
            <div className="flex items-center gap-20">
              {allParts.map((part) => {
                const range = getPartQuestionRange(part.partNumber)
                const isCurrentPart = currentPart === part.partNumber

                return (
                  <div key={part.partNumber} className="flex items-center gap-4 flex-shrink-0">
                    <button
                      onClick={() => switchToPart(part.partNumber)}
                      className={`font-semibold text-xl whitespace-nowrap transition-colors ${
                        isCurrentPart
                          ? "text-gray-900 underline underline-offset-4"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Part {part.partNumber}
                    </button>

                    {isCurrentPart ? (
                      <div className="flex items-center gap-3">
                        {(() => {
                          const questionButtons: ReactElement[] = []
                          const partQuestions = getQuestionsByPart(part.partNumber)
                          const range = getPartQuestionRange(part.partNumber)
                          const baseNumber = range.start

                          let currentQuestionNum = baseNumber
                          partQuestions.forEach((question) => {
                            const questionCount = getQuestionCount(question)
                            for (let i = 0; i < questionCount; i++) {
                              const isAnswered = isSubQuestionAnswered(question, i)

                              questionButtons.push(
                                <button
                                  key={`${question.id}_${i}`}
                                  onClick={() => {
                                    const element = questionRefs.current[question.id]
                                    if (element) {
                                      element.scrollIntoView({
                                        behavior: "smooth",
                                        block: "center",
                                      })
                                    }
                                    const allQuestionsForIndex = getAllQuestions()
                                    const clickedQuestionIndex = allQuestionsForIndex.findIndex(
                                      (q) => q.id === question.id,
                                    )
                                    if (clickedQuestionIndex !== -1) {
                                      setCurrentQuestionIndex(clickedQuestionIndex)
                                    }
                                  }}
                                  className={`w-10 h-10 text-lg font-semibold rounded-md transition-all flex-shrink-0 flex items-center justify-center ${
                                    isAnswered
                                      ? "bg-green-500 text-white hover:bg-green-600"
                                      : currentQuestionNum === currentQuestionIndex + 1
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                                  }`}
                                  title={`Question ${currentQuestionNum}`}
                                >
                                  {currentQuestionNum}
                                </button>,
                              )
                              currentQuestionNum++
                            }
                          })

                          return questionButtons
                        })()}
                      </div>
                    ) : (
                      <span className="text-base text-gray-600 whitespace-nowrap font-medium">
                        {part.answeredQuestions} of {part.totalQuestions}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`absolute right-12 w-12 h-12 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 flex items-center justify-center ${
                isWarningMode ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-900 text-white hover:bg-gray-800"
              }`}
              title="Submit test"
            >
              {isSubmitting ? "..." : "✓"}
            </button>
          </div>
        </div>
      </div>

      <AlertComponent />
      <CompletionModal isOpen={showCompletionModal} onClose={() => setShowCompletionModal(false)} />
    </div>
  )
}

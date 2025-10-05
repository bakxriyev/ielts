"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Timer } from "@/components/timer"
import { markSectionCompleted } from "../../../../../lib/test-strotage"
import { Volume2, VolumeX, Check } from "lucide-react"
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
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
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
    } else if (question.q_type === "MATCHING_INFORMATION") {
      return question.rows?.length || 1
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

  const handleAnswerChange = (questionId: number | string, answer: any, questionIdentifier?: string) => {
    const questionIdStr = questionId.toString()
    const newAnswers = { ...answers, [questionIdStr]: answer }
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

    if (answer && (typeof answer === "string" ? answer.trim() : Array.isArray(answer) ? answer.length > 0 : true)) {
      const formattedAnswer = answer

      if (questionIdentifier && questionIdentifier.includes("_map_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const position = parts[2]
        const selectedOptionKey = answer

        // Find the l_question record for this MAP question
        const mapQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (!mapQuestion) {
          console.error("[v0] Could not find MAP question for baseQuestionId:", baseQuestionId)
          return
        }

        // Use the actual l_question ID from the database (e.g., 14)
        // This is the id field from the l_questions table
        const actualLQuestionId = mapQuestion.id

        console.log("[v0] MAP_LABELING Debug:", {
          questionIdentifier,
          baseQuestionId,
          position,
          selectedOptionKey,
          mapQuestionId: mapQuestion.id,
          actualLQuestionId,
          listening_questions_id: mapQuestion.listening_questions_id,
        })

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
          answer: `${position}:${selectedOptionKey}`, // Store as "1:A"
          l_questionsID: actualLQuestionId, // This should be 14 from database
        })

        console.log("[v0] Saved MAP answer:", {
          position,
          selectedOptionKey,
          l_questionsID: actualLQuestionId,
          answer: `${position}:${selectedOptionKey}`,
        })
      } else if (questionIdStr.includes("_table_")) {
        const parts = questionIdStr.split("_")
        const baseQuestionId = parts[0]
        const rowIndex = Number.parseInt(parts[parts.length - 2])
        const cellIndex = Number.parseInt(parts[parts.length - 1])
        const cellPosition = `${rowIndex}_${cellIndex}`

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        const l_questionsID = question?.listening_questions_id

        // Calculate the starting question number for this table
        const allQuestions = getAllQuestions()
        const baseQuestionIndex = allQuestions.findIndex((q) => q.id.toString() === baseQuestionId)

        let questionCounter = 1
        for (let i = 0; i < baseQuestionIndex; i++) {
          questionCounter += getQuestionCount(allQuestions[i])
        }

        // Count which input this is within the table (0-indexed)
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
          answer: answer, // Store as simple string
          l_questionsID: uniqueLQuestionsID,
        })
      } else if (questionIdStr.includes("_matching_")) {
        const parts = questionIdStr.split("_")
        const baseQuestionId = parts[0]
        const rowIndex = Number.parseInt(parts[2])

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        const l_questionsID = question?.listening_questions_id

        // Calculate unique l_questionsID for this row
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
      // Handle deletion
      if (questionIdentifier && questionIdentifier.includes("_map_")) {
        const parts = questionIdentifier.split("_")
        const baseQuestionId = parts[0]
        const position = parts[2]

        const mapQuestion = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)

        if (mapQuestion) {
          const actualLQuestionId = mapQuestion.id
          // Remove answer for this specific position
          answersArray = answersArray.filter(
            (item: any) => !(item.l_questionsID === actualLQuestionId && item.answer?.startsWith(`${position}:`)),
          )
        }
      } else if (questionIdStr.includes("_table_") || questionIdStr.includes("_matching_")) {
        // Handle table and matching deletions
        const parts = questionIdStr.split("_")
        const baseQuestionId = parts[0]

        const question = getAllQuestions().find((q) => q.id.toString() === baseQuestionId)
        const l_questionsID = question?.listening_questions_id

        answersArray = answersArray.filter((item: any) => !(item.questionId === l_questionsID))
      } else {
        const question = getAllQuestions().find((q) => q.id.toString() === questionIdStr)
        const l_questionsID = question?.listening_questions_id
        answersArray = answersArray.filter(
          (item: any) => !(item.questionId === l_questionsID && item.l_questionsID === Number.parseInt(questionIdStr)),
        )
      }
    }

    console.log("[v0] Saving to localStorage:", {
      key: answersKey,
      totalAnswers: answersArray.length,
      currentQuestionId: questionIdStr,
      l_questionsID: question?.id, // Changed from question?.listening_questions_id to question?.id based on the original code's intent for logging
      questionType: questionType,
    })

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
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

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

  const isQuestionAnswered = (questionId: number) => {
    return answers[questionId] !== undefined && answers[questionId] !== ""
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
    // Auto-submit without confirmation
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
        answeredQuestions: questions.filter((q) => isQuestionAnswered(q.id)).length,
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
          src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${testData.audio_url}`}
          onEnded={handleAudioEnded}
          onPlay={() => setAudioPlaying(true)}
          onPause={() => setAudioPlaying(false)}
          volume={volume[0] / 100}
        />
      )}

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 sm:space-x-6">
            <div className="text-red-600 font-bold text-xl sm:text-2xl">IELTS</div>
            <div className="text-base sm:text-lg font-medium text-gray-800">Test taker ID</div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 w-full sm:w-auto">
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

            {audioPlaying && (
              <div className="text-blue-600 text-sm sm:text-base flex items-center gap-2">
                <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
                <span className="hidden sm:inline">Audio is playing</span>
                <span className="sm:hidden">Playing</span>
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2">{currentPartData.title}</h4>
                    <p className="text-blue-800">{currentPartData.instruction}</p>
                  </div>
                ) : null
              })()}

              {audioPlaying && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Volume2 className="h-5 w-5 animate-pulse" />
                    <span className="font-medium">Audio is currently playing</span>
                  </div>
                  <p className="text-blue-700 text-sm mt-1">Listen carefully and answer the questions below.</p>
                </div>
              )}

              {audioEnded && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Audio has finished</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">You now have time to complete your answers.</p>
                </div>
              )}
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
                    <div className="text-base sm:text-lg font-semibold mb-4 text-blue-600">
                      Question {getGlobalQuestionNumber(question.id)}
                      {getQuestionCount(question) > 1 &&
                        ` - ${getGlobalQuestionNumber(question.id) + getQuestionCount(question) - 1}`}
                    </div>

                    {question.q_text && (
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
                        <p className="text-xs text-gray-500">Write NO MORE THAN THREE WORDS for each answer.</p>
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

                        <p className="text-xs text-gray-500">Choose the correct group for each item.</p>
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
                        <p className="text-xs text-gray-500">Write NO MORE THAN THREE WORDS for each answer.</p>
                      </div>
                    )}

                    {question.q_type === "MAP_LABELING" && question.photo && question.rows && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Map Image with Drop Zones */}
                          <div className="lg:col-span-2">
                            <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                              <img
                                src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/uploads/l_questions/${question.photo}`}
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
                        <p className="text-xs text-gray-500">Drag the options to the correct positions on the map.</p>
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
                    } ${currentPart === part.partNumber ? "ring-2 ring-blue-600 ring-offset-1" : ""}`}
                  >
                    Part {part.partNumber}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center space-x-1 flex-wrap justify-center">
              {allQuestions.map((question) => {
                const questionNumber = getGlobalQuestionNumber(question.id)
                const isAnswered = !!answers[question.id.toString()]
                const isCurrentPart = question.part === `PART${currentPart}`

                return (
                  <button
                    key={question.id}
                    onClick={() => {
                      // Switch to the correct part if needed
                      const questionPart = Number.parseInt(question.part.replace("PART", ""))
                      if (questionPart !== currentPart) {
                        switchToPart(questionPart)
                      }
                      // Then jump to the question
                      setTimeout(() => jumpToQuestion(question.id), 100)
                    }}
                    className={`w-6 h-6 sm:w-8 sm:h-8 text-xs font-medium rounded transition-all ${
                      isAnswered
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : isCurrentPart
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    } ${isCurrentPart ? "ring-2 ring-blue-600 ring-offset-1" : ""}`}
                    title={`Question ${questionNumber} - ${question.part}`}
                  >
                    {questionNumber}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 sm:px-6 py-2 bg-gray-800 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Submitting..." : "Submit Test"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

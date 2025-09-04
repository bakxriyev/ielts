"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "../../../../../components/ui/button"
import { Input } from "../../../../../components/ui/input"
import { Timer } from "../../../../../components/timer"
import { markSectionCompleted } from "../../../../../lib/test-strotage"
import { Volume2, VolumeX, ArrowLeft, ArrowRight, Check } from "lucide-react"
import { useCustomAlert } from "../../../../../components/custom-allert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../../../components/ui/dialog"
import { Slider } from "../../../../../components/ui/slider"
import { getAudioUrl } from "../../../../../utils/audio-utils" // Declare the getAudioUrl function

interface Question {
  id: number
  listening_id: number
  part: string
  title: string
  question_text: string
  question_type: string
  options?: string[]
  correct_answers?: string[]
  audio?: string
}

interface Listening {
  id: string
  title: string
  description: string
  audio_url?: string // Updated to match backend field name
  questions: Question[]
}

interface ListeningTestData {
  id: string
  title: string
  description: string
  listenings: Listening[]
  duration: number
}

export default function ListeningTestPage() {
  const params = useParams()
  const router = useRouter()
  const [testData, setTestData] = useState<ListeningTestData | null>(null)
  const [currentPart, setCurrentPart] = useState(1)
  const [expandedPart, setExpandedPart] = useState<number | null>(null) // Added expandedPart state to control which part shows question numbers
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [timerActive, setTimerActive] = useState(false) // Added timerActive state to control when timer starts counting
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSubmitLoading, setShowSubmitLoading] = useState(false)
  const [showAudioWarning, setShowAudioWarning] = useState(true)
  const [audioStarted, setAudioStarted] = useState(false)
  const [audioEnded, setAudioEnded] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [volume, setVolume] = useState([70])
  const [userId] = useState(1)
  const { showAlert, AlertComponent } = useCustomAlert()
  const audioRef = useRef<HTMLAudioElement>(null)
  const questionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  const examId = params.examId as string

  useEffect(() => {
    fetchTestData()
  }, [examId])

  const startAudioTest = () => {
    setShowAudioWarning(false)
    setAudioStarted(true)
    setTimeRemaining(120) // Set timer to 2 minutes but don't start counting yet
    setTimerActive(false) // Ensure timer is not active initially

    if (audioRef.current) {
      audioRef.current.play()
      setAudioPlaying(true)
    }
  }

  const fetchTestData = async () => {
    try {
      setIsLoading(true)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
      const response = await fetch(`${API_BASE_URL}/exams/${examId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch test data")
      }

      const data = await response.json()
      setTestData({
        id: data.id,
        title: data.title,
        description: data.description,
        listenings: data.listenings || [],
        duration: 2, // 2 minutes for listening
      })
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

  const handleAnswerChange = (questionId: number, answer: any) => {
    const newAnswers = { ...answers, [questionId]: answer }
    setAnswers(newAnswers)

    const answersKey = `answers_${examId}_listening`
    localStorage.setItem(answersKey, JSON.stringify(newAnswers))

    submitSingleAnswer(questionId, answer)
  }

  const submitSingleAnswer = async (questionId: number, answer: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
      await fetch(`${API_BASE_URL}/listening-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          question_id: questionId,
          exam_id: Number.parseInt(examId),
          user_answer: answer,
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
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
          const answerPromises = Object.entries(answers).map(([questionId, answer]) =>
            fetch(`${API_BASE_URL}/listening-answers`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: userId,
                exam_id: Number.parseInt(examId),
                listening_question_id: Number.parseInt(questionId),
                user_answer: answer,
              }),
            }),
          )

          await Promise.all(answerPromises)
          localStorage.removeItem(`answers_${examId}_listening`)
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
      },
    })
  }

  const getAllQuestions = () => {
    return testData?.listenings.flatMap((listening) => listening.questions) || []
  }

  const getQuestionsByPart = (part: number) => {
    const partName = `part${part}`
    return getAllQuestions().filter((q) => q.part === partName)
  }

  const getGlobalQuestionNumber = (questionId: number) => {
    const allQuestions = getAllQuestions()
    return allQuestions.findIndex((q) => q.id === questionId) + 1
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

  const navigateToQuestion = (direction: "prev" | "next") => {
    const currentPartQuestions = getQuestionsByPart(currentPart)
    const currentQuestionInPart = currentPartQuestions.findIndex((q) => questionRefs.current[q.id])

    if (direction === "prev") {
      if (currentQuestionInPart > 0) {
        const prevQuestion = currentPartQuestions[currentQuestionInPart - 1]
        questionRefs.current[prevQuestion.id]?.scrollIntoView({ behavior: "smooth", block: "center" })
      } else if (currentPart > 1) {
        switchToPart(currentPart - 1)
      }
    } else if (direction === "next") {
      if (currentQuestionInPart < currentPartQuestions.length - 1) {
        const nextQuestion = currentPartQuestions[currentQuestionInPart + 1]
        questionRefs.current[nextQuestion.id]?.scrollIntoView({ behavior: "smooth", block: "center" })
      } else if (currentPart < 4) {
        switchToPart(currentPart + 1)
      }
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
    setAudioPlaying(false)
    setAudioEnded(true)
    setTimerActive(true) // Only start timer countdown after audio completely finishes
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
    <div className="min-h-screen bg-gray-50">
      <AlertComponent />

      {/* Audio Warning Dialog */}
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

      {getAudioUrl(testData.listenings[0]) && (
        <audio
          ref={audioRef}
          src={getAudioUrl(testData.listenings[0])!}
          onEnded={handleAudioEnded}
          onPlay={() => setAudioPlaying(true)}
          onPause={() => setAudioPlaying(false)}
          volume={volume[0] / 100}
        />
      )}

      <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/mock/${examId}`)}
              className="text-gray-600 hover:text-gray-900 p-2"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="text-red-600 font-bold text-lg sm:text-2xl tracking-wide">IELTS</div>
            <div className="hidden sm:block text-gray-600 text-base">Test taker ID: Student</div>
            {audioPlaying && (
              <div className="text-blue-600 text-sm sm:text-base flex items-center gap-1 sm:gap-2">
                <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
                <span className="hidden sm:inline">Audio is playing</span>
                <span className="sm:hidden">Audio</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
            {timeRemaining !== null && (
              <div className={`text-center ${timerActive ? "animate-pulse" : ""}`}>
                <Timer
                  initialTime={timeRemaining}
                  onTimeUpdate={setTimeRemaining}
                  onTimeUp={handleSubmit}
                  isActive={timerActive}
                  className="text-lg sm:text-2xl font-mono font-bold bg-red-50 text-red-600 px-2 sm:px-4 py-1 sm:py-2 rounded border border-red-200"
                />
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2">
              <VolumeX className="h-5 w-5 text-gray-600" />
              <Slider value={volume} onValueChange={handleVolumeChange} max={100} step={1} className="w-24" />
              <Volume2 className="h-5 w-5 text-gray-600" />
            </div>
            <div className="sm:hidden">
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => {
                  const newVolume = volume[0] > 0 ? 0 : 70
                  handleVolumeChange([newVolume])
                }}
              >
                {volume[0] > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-gray-100 border-b border-gray-200 px-3 sm:px-6 py-4 sm:py-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900">Part {currentPart}</h2>
          <p className="text-base sm:text-lg text-gray-600 mt-2">
            Listen and answer questions{" "}
            {currentPartQuestions.length > 0 ? getGlobalQuestionNumber(currentPartQuestions[0].id) : 1}–
            {currentPartQuestions.length > 0
              ? getGlobalQuestionNumber(currentPartQuestions[currentPartQuestions.length - 1].id)
              : 10}
            .
          </p>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-10">
          <div className="mb-6 sm:mb-10">
            <h3 className="text-xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">
              Questions {currentPartQuestions.length > 0 ? getGlobalQuestionNumber(currentPartQuestions[0].id) : 1}–
              {currentPartQuestions.length > 0
                ? getGlobalQuestionNumber(currentPartQuestions[currentPartQuestions.length - 1].id)
                : 10}
            </h3>
            <p className="text-base sm:text-xl text-gray-600 mb-6 sm:mb-10">
              Complete the notes. Write <strong className="text-gray-900">ONE WORD AND/OR A NUMBER</strong> for each
              answer.
            </p>

            <div className="bg-gray-50 p-4 sm:p-10 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-lg sm:text-2xl text-gray-900 mb-4 sm:mb-8">
                {testData.listenings[0]?.title}
              </h4>
              <div className="space-y-4 sm:space-y-8">
                <div className="text-base sm:text-xl text-gray-600">
                  <strong>Items:</strong>
                </div>

                {currentPartQuestions.map((question) => (
                  <div
                    key={question.id}
                    ref={(el) => (questionRefs.current[question.id] = el)}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8 ml-2 sm:ml-8 p-3 sm:p-4 rounded hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-base sm:text-xl text-gray-700 flex-1">{question.question_text}</span>
                    <div className="flex items-center gap-3 sm:gap-6 justify-between sm:justify-end">
                      <span
                        className={`px-3 sm:px-4 py-2 sm:py-3 rounded text-sm sm:text-lg font-medium ${
                          isQuestionAnswered(question.id)
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {getGlobalQuestionNumber(question.id)}
                      </span>
                      <Input
                        value={answers[question.id] || ""}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="w-32 sm:w-48 h-10 sm:h-12 text-base sm:text-lg"
                        placeholder="Answer"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6 sm:mb-10">
            <Button
              variant="outline"
              onClick={() => navigateToQuestion("prev")}
              disabled={currentPart === 1}
              className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 text-base sm:text-lg"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigateToQuestion("next")}
              disabled={currentPart === 4}
              className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 text-base sm:text-lg"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 sm:px-20 py-3 sm:py-4 text-lg sm:text-xl font-medium rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 flex items-center gap-2 sm:gap-3"
            >
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <Check className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="hidden sm:inline">Submit Test</span>
                  <span className="sm:hidden">Submit</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="px-2 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {allParts.map((part) => (
              <div key={part.partNumber} className="flex-1 text-center min-w-0">
                <button
                  onClick={() => switchToPart(part.partNumber)}
                  className={`text-sm sm:text-lg font-medium mb-1 sm:mb-2 px-2 sm:px-4 py-1 sm:py-2 rounded transition-colors w-full ${
                    currentPart === part.partNumber
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-900 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="hidden sm:inline">Part {part.partNumber}</span>
                  <span className="sm:hidden">P{part.partNumber}</span>
                </button>
                <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                  {part.answeredQuestions}/{part.totalQuestions}
                </div>
                {expandedPart === part.partNumber && (
                  <div className="flex justify-start gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pb-2 px-1">
                    {part.questions.map((question) => {
                      const globalNumber = getGlobalQuestionNumber(question.id)
                      return (
                        <button
                          key={question.id}
                          onClick={() => jumpToQuestion(question.id)}
                          className={`w-6 h-6 sm:w-7 sm:h-7 text-xs sm:text-sm font-medium rounded flex-shrink-0 transition-all duration-200 touch-manipulation ${
                            isQuestionAnswered(question.id)
                              ? "bg-green-500 text-white shadow-md hover:bg-green-600"
                              : currentPart === part.partNumber
                                ? "bg-blue-500 text-white shadow-md"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-sm"
                          }`}
                        >
                          {globalNumber}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-center justify-center w-20 sm:w-32 ml-2">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded transition-all duration-200 touch-manipulation"
              >
                {isSubmitting ? (
                  <span className="hidden sm:inline">Submitting...</span>
                ) : (
                  <span className="hidden sm:inline">Submit</span>
                )}
                {isSubmitting ? "..." : <span className="sm:hidden">✓</span>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="h-24 sm:h-32"></div>
    </div>
  )
}

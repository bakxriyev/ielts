"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { VideoPlayer } from "../../../../components/video-player"
import { Button } from "../../../../components/ui/button"
import { ThemeToggle } from "../../../../components/theme-toggle"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface TestData {
  id: string
  title: string
  videoUrl?: string
  section: string
}

export default function TestPage() {
  const params = useParams()
  const router = useRouter()
  const [testData, setTestData] = useState<TestData | null>(null)
  const [showVideo, setShowVideo] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isNavigating, setIsNavigating] = useState(false)

  const section = params.section as string
  const examId = params.examId as string

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = "Are you sure you want to leave? Your test progress may be lost."
      return "Are you sure you want to leave? Your test progress may be lost."
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    fetchTestData()

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [section, examId, router])

  const fetchTestData = async () => {
    try {
      setIsLoading(true)
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const response = await fetch(`${API_BASE_URL}/exams/${examId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch test data")
      }

      const data = await response.json()

      const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1)
      const videoUrls = {
        reading: "/reading.mp4",
        listening: "/listening.mp4",
        writing: "/writing.mp4",
      }

      setTestData({
        id: examId,
        title: `${data.title} - ${sectionTitle} Test`,
        videoUrl: videoUrls[section as keyof typeof videoUrls],
        section: section,
      })
    } catch (error) {
      console.error("Failed to fetch test data:", error)
      const videoUrls = {
        reading: "/reading.mp4",
        listening: "/listening.mp4",
        writing: "/writing.mp4",
      }

      setTestData({
        id: examId,
        title: `${section.charAt(0).toUpperCase() + section.slice(1)} Test Instructions`,
        videoUrl: videoUrls[section as keyof typeof videoUrls] ,
        section: section,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVideoEnd = () => {
    // Video ended naturally, but user can still continue
  }

  const handleContinue = () => {
    if (isNavigating) return

    setIsNavigating(true)
    console.log("[v0] Continue button clicked, navigating to:", section)

    setTimeout(() => {
      switch (section) {
        case "reading":
          router.push(`/test/reading/${examId}/questions`)
          break
        case "listening":
          router.push(`/test/listening/${examId}/questions`)
          break
        case "writing":
          router.push(`/test/writing/${examId}/questions`)
          break
        default:
          router.push(`/mock/${examId}`)
      }
    }, 100)
  }

  const handleSkipVideo = () => {
    const confirmed = window.confirm("Are you sure you want to skip the instructions video?")
    if (confirmed) {
      handleContinue()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-blue-300 text-lg">Loading test instructions...</p>
        </div>
      </div>
    )
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-white">Test Not Found</h1>
          <Link href={`/mock/${examId}`}>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">Back to Mock Test</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isNavigating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold mb-4 text-white">Starting test...</h1>
          <p className="text-blue-300">Please wait while we prepare your test</p>
        </div>
      </div>
    )
  }

  if (showVideo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <nav className="absolute top-0 left-0 right-0 z-40 border-b border-blue-800/30 bg-slate-900/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={`/exams/${examId}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 text-blue-300 hover:text-white hover:bg-blue-800/30"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Mock Test
                  </Button>
                </Link>
                <div className="flex items-center gap-3">
                  <Image
                    src="/realieltsexam-logo.png"
                    alt="REALIELTSEXAM"
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                  <span className="text-lg font-bold text-white">REALIELTSEXAM</span>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </nav>

        <div className="relative">
          <VideoPlayer
            videoUrl={testData.videoUrl}
            title={testData.title}
            onVideoEnd={handleVideoEnd}
            onContinue={handleContinue}
            showContinueButton={true}
            autoPlay={true}
          />
        </div>

        <div className="fixed bottom-6 right-6 z-50">
          <Button
            variant="outline"
            onClick={handleSkipVideo}
            className="bg-slate-800/90 backdrop-blur-sm border-blue-600 text-blue-300 hover:bg-blue-600 hover:text-white"
          >
            Skip Instructions
          </Button>
        </div>
      </div>
    )
  }

  return null
}

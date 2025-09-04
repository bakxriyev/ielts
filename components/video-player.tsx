"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"

interface VideoPlayerProps {
  videoUrl?: string
  title: string
  onVideoEnd?: () => void
  onContinue?: () => void
  showContinueButton?: boolean
  autoPlay?: boolean
}

export function VideoPlayer({
  videoUrl,
  title,
  onVideoEnd,
  onContinue,
  showContinueButton = false,
  autoPlay = false,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setDuration(video.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      onVideoEnd?.()
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("durationchange", handleDurationChange)
    video.addEventListener("ended", handleEnded)

    if (autoPlay) {
      video
        .play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((error) => {
          console.log("Auto-play failed:", error)
        })
    }

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("durationchange", handleDurationChange)
      video.removeEventListener("ended", handleEnded)
    }
  }, [onVideoEnd, autoPlay])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-800/30 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8 text-center">
            <h1 className="text-3xl font-bold mb-4 text-white">{title}</h1>
            <p className="text-blue-300 mb-8">Watch the instructions video before starting your test</p>
          </div>

          <div className="relative bg-black">
            {videoUrl ? (
              <video
                ref={videoRef}
                className="w-full aspect-video"
                src={videoUrl}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration)
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-slate-900">
                <div className="text-center text-white">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Play className="h-8 w-8 ml-1" />
                  </div>
                  <p className="text-lg">Video instructions will play here</p>
                  <p className="text-sm text-blue-300 mt-2">Click continue to proceed to the test</p>
                </div>
              </div>
            )}

            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={togglePlay} className="text-white hover:bg-white/20">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                <Button variant="ghost" size="sm" onClick={toggleMute} className="text-white hover:bg-white/20">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>

                <div className="flex-1 flex items-center gap-2 text-white text-sm">
                  <span>{formatTime(currentTime)}</span>
                  <div className="flex-1 bg-white/20 rounded-full h-1">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 text-center">
            {showContinueButton && (
              <Button
                onClick={onContinue}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                I Understand
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

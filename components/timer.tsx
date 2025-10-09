"use client"

import { useEffect, useState, useRef } from "react"
import { Clock } from "lucide-react"

interface TimerProps {
  initialMinutes?: number
  initialTime?: number // in seconds
  isActive?: boolean
  onTimeUpdate?: (timeRemaining: number) => void
  onTimeUp?: () => void
  className?: string
  textColor?: string
}

function Timer({
  initialMinutes,
  initialTime,
  isActive = true,
  onTimeUpdate,
  onTimeUp,
  className = "",
  textColor = "text-gray-900 dark:text-gray-100",
}: TimerProps) {
  const initialSeconds = initialTime || (initialMinutes ? initialMinutes * 60 : 0)
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const onTimeUpRef = useRef(onTimeUp)

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate
    onTimeUpRef.current = onTimeUp
  }, [onTimeUpdate, onTimeUp])

  useEffect(() => {
    setTimeRemaining(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (onTimeUpdateRef.current) {
      onTimeUpdateRef.current(timeRemaining)
    }
  }, [timeRemaining])

  useEffect(() => {
    if (!isActive) {
      return
    }

    if (timeRemaining <= 0) {
      onTimeUpRef.current?.()
      return
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1

        if (newTime <= 0) {
          return 0
        }

        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, isActive])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const getTimerColor = () => {
    if (timeRemaining <= 300) return "text-red-600"
    if (timeRemaining <= 600) return "text-orange-600"
    return textColor
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className={`h-4 w-4 ${getTimerColor()}`} />
      <span className={`font-mono font-semibold ${getTimerColor()}`}>{formatTime(timeRemaining)}</span>
    </div>
  )
}

export { Timer }
export default Timer

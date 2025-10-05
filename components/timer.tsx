"use client"

import { useEffect, useState, useRef } from "react"
import { Clock } from "lucide-react"

interface TimerProps {
  initialTime: number // in seconds
  isActive?: boolean // Added isActive prop to control countdown
  onTimeUpdate?: (timeRemaining: number) => void
  onTimeUp?: () => void
  className?: string
}

export function Timer({ initialTime, isActive = true, onTimeUpdate, onTimeUp, className = "" }: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const onTimeUpRef = useRef(onTimeUp)

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate
    onTimeUpRef.current = onTimeUp
  }, [onTimeUpdate, onTimeUp])

  useEffect(() => {
    setTimeRemaining(initialTime)
  }, [initialTime])

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
          // onTimeUp will be called in the next useEffect when timeRemaining becomes 0
          return 0
        }

        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, isActive]) // Added isActive to dependencies

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
    if (timeRemaining <= 300) return "text-black-600" // Last 5 minutes
    if (timeRemaining <= 600) return "text-red-900" // Last 10 minutes
    return "text-black-900 dark:text-black-100"
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className={`h-4 w-4 ${getTimerColor()}`} />
      <span className={`font-mono font-semibold ${getTimerColor()}`}>{formatTime(timeRemaining)}</span>
    </div>
  )
}

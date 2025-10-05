"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle } from "lucide-react"
import { FireworksBackground } from "./fireworks-background"

interface CompletionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CompletionModal({ isOpen, onClose }: CompletionModalProps) {
  const [countdown, setCountdown] = useState(15)
  const router = useRouter()

  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          localStorage.clear()
          router.push("/join")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, router])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" />

      {/* Fireworks background */}
      <FireworksBackground
        className="absolute inset-0"
        population={8}
        color={["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]}
        fireworkSpeed={{ min: 6, max: 10 }}
        particleSpeed={{ min: 3, max: 8 }}
        particleSize={{ min: 2, max: 6 }}
      />

      {/* Modal content - perfectly centered */}
      <div className="relative z-10 text-center text-white space-y-8 max-w-2xl mx-auto px-8">
        <div className="flex justify-center">
          <div className="relative">
            <CheckCircle className="h-24 w-24 text-green-400 animate-pulse" />
            <div className="absolute -inset-4 bg-green-400/20 rounded-full animate-ping"></div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
            🎉 Tabriklaymiz! 🎉
          </h1>
          <p className="text-xl text-gray-200 font-medium">
            Siz testni muvaffaqiyatli yakunladingiz. Natijalar tez orada e'lon qilinadi.
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-9xl font-mono font-bold text-green-400 animate-bounce drop-shadow-2xl">{countdown}</div>
          <p className="text-lg text-gray-300 font-medium">Asosiy sahifaga yo'naltirilmoqda...</p>
        </div>

        <div className="bg-gradient-to-r from-green-500/30 to-blue-500/30 rounded-xl p-8 border border-green-400/50 backdrop-blur-sm shadow-2xl">
          <p className="text-green-200 font-bold text-lg">
            ✨ Barcha qismlar (Reading, Listening, Writing) muvaffaqiyatli yakunlandi! ✨
          </p>
        </div>
      </div>
    </div>
  )
}

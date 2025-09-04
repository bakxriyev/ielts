"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Lock } from "lucide-react"

interface PasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  correctPassword: string
  examTitle: string
}

export function PasswordModal({ isOpen, onClose, onSuccess, correctPassword, examTitle }: PasswordModalProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (password === correctPassword) {
      onSuccess()
      setPassword("")
      setError("")
    } else {
      setError("Incorrect password. Please try again.")
    }

    setIsLoading(false)
  }

  const handleClose = () => {
    setPassword("")
    setError("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-blue-800/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Lock className="h-5 w-5 text-blue-400" />
            Enter Mock Test Password
          </DialogTitle>
          <DialogDescription className="text-blue-300">
            Please enter the password to access "{examTitle}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter mock test password"
              className="bg-slate-700 border-blue-800/30 text-white placeholder:text-blue-300"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-blue-600 text-blue-300 hover:bg-blue-600 hover:text-white bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isLoading ? "Verifying..." : "Access Test"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

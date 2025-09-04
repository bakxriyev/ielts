"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react"

interface AlertOptions {
  title: string
  description: string
  type?: "info" | "warning" | "success" | "error"
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  onConfirm?: () => void
  onCancel?: () => void
}

export function useCustomAlert() {
  const [alertState, setAlertState] = useState<{
    isOpen: boolean
    options: AlertOptions | null
  }>({
    isOpen: false,
    options: null,
  })

  const showAlert = (options: AlertOptions) => {
    setAlertState({
      isOpen: true,
      options: {
        showCancel: true,
        confirmText: "OK",
        cancelText: "Cancel",
        type: "info",
        ...options,
      },
    })
  }

  const hideAlert = () => {
    setAlertState({
      isOpen: false,
      options: null,
    })
  }

  const handleConfirm = () => {
    alertState.options?.onConfirm?.()
    hideAlert()
  }

  const handleCancel = () => {
    alertState.options?.onCancel?.()
    hideAlert()
  }

  const getIcon = () => {
    switch (alertState.options?.type) {
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-orange-500" />
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case "error":
        return <XCircle className="h-6 w-6 text-red-500" />
      default:
        return <Info className="h-6 w-6 text-blue-500" />
    }
  }

  const AlertComponent = () => (
    <Dialog open={alertState.isOpen} onOpenChange={hideAlert}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getIcon()}
            {alertState.options?.title}
          </DialogTitle>
          <DialogDescription className="text-base leading-relaxed">{alertState.options?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          {alertState.options?.showCancel && (
            <Button variant="outline" onClick={handleCancel}>
              {alertState.options?.cancelText}
            </Button>
          )}
          <Button onClick={handleConfirm} variant={alertState.options?.type === "error" ? "destructive" : "default"}>
            {alertState.options?.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { showAlert, AlertComponent }
}

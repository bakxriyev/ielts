"use client"

import { useState } from "react"

interface AlertOptions {
  title: string
  description: string
  type: "success" | "error" | "warning" | "info"
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

export const useCustomAlert = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [alertOptions, setAlertOptions] = useState<AlertOptions | null>(null)

  const showAlert = (options: AlertOptions) => {
    setAlertOptions(options)
    setIsOpen(true)
  }

  const hideAlert = () => {
    setIsOpen(false)
    setAlertOptions(null)
  }

  const handleConfirm = () => {
    if (alertOptions?.onConfirm) {
      alertOptions.onConfirm()
    }
    hideAlert()
  }

  const handleCancel = () => {
    if (alertOptions?.onCancel) {
      alertOptions.onCancel()
    }
    hideAlert()
  }

  return {
    showAlert,
    hideAlert,
    handleConfirm,
    handleCancel,
    isOpen,
    alertOptions,
  }
}

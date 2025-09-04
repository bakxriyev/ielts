"use client"

import { ProtectedRoute } from "../../components/protected-route"
import { AccountContent } from "../../components/account-content"

export default function AccountPage() {
  return (
    <ProtectedRoute>
      <AccountContent />
    </ProtectedRoute>
  )
}

"use client"

import { ProtectedRoute } from "../../components/protected-route"
import { ContactContent } from "../../components/contact-content"

export default function ContactPage() {
  return (
    <ProtectedRoute>
      <ContactContent />
    </ProtectedRoute>
  )
}

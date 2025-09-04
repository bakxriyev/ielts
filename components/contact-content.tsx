"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { Mail, Phone, MapPin, Send } from "lucide-react"

export function ContactContent() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // TODO: Implement contact form submission
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setIsSubmitting(false)
    setFormData({ name: "", email: "", subject: "", message: "" })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <nav className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Contact Us</h1>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-slate-100">Get in Touch</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
              Have questions about our IELTS mock tests? We're here to help you succeed in your English language
              journey.
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">Email</h3>
                  <p className="text-slate-600 dark:text-slate-400">support@ielts-platform.com</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Phone className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">Phone</h3>
                  <p className="text-slate-600 dark:text-slate-400">+1 (555) 123-4567</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">Office</h3>
                  <p className="text-slate-600 dark:text-slate-400">123 Education Street, Learning City, LC 12345</p>
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <CardDescription>Fill out the form below and we'll get back to you as soon as possible.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Sending...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Send Message
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

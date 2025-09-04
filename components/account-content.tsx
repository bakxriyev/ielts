"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/auth-context"
import { User, Lock, Save } from "lucide-react"

export function AccountContent() {
  const { user, logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    username: user?.username || "",
  })

  const handleSave = () => {
    // TODO: Implement save functionality
    setIsEditing(false)
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <nav className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Account Settings</h1>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your account details and personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security
              </CardTitle>
              <CardDescription>Manage your password and security settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">Change Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test History</CardTitle>
              <CardDescription>View your past test results and performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No test history available yet.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

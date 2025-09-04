interface LoginResult {
  success: boolean
  user?: any
  message?: string
}

interface RegisterResult {
  success: boolean
  user?: any
  message?: string
}

const TEST_USER = {
  id: 1,
  name: "Test User",
  email: "test@realieltsexam.com",
  username: "test",
}

const TEST_CREDENTIALS = {
  username: "test",
  password: "123456",
}

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  if (username === TEST_CREDENTIALS.username && password === TEST_CREDENTIALS.password) {
    // Store test user and mock token
    localStorage.setItem("user", JSON.stringify(TEST_USER))
    localStorage.setItem("token", "test-token-123")
    return { success: true, user: TEST_USER }
  }

  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()

    if (response.ok && data.user) {
      localStorage.setItem("user", JSON.stringify(data.user))
      if (data.access_token) {
        localStorage.setItem("token", data.access_token)
      }
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token)
      }
      return { success: true, user: data.user }
    } else {
      return { success: false, message: data.message || "Login failed" }
    }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, message: "Network error. Please try again." }
  }
}

export async function registerUser(
  name: string,
  email: string,
  username: string,
  password: string,
): Promise<RegisterResult> {
  try {
    console.log("[v0] Registration data:", { name, email, username, password: password ? "***" : "empty" })

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const requestBody = { name, email, username, password }

    console.log("[v0] Sending registration request to:", `${API_BASE_URL}/auth/register`)
    console.log("[v0] Request body:", { ...requestBody, password: "***" })

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()
    console.log("[v0] Registration response:", { status: response.status, data })

    if (response.ok) {
      // Use user from response or create from registration data
      const user = data.user || {
        id: data.id || Date.now(),
        name,
        email,
        username,
      }

      localStorage.setItem("user", JSON.stringify(user))
      if (data.access_token) {
        localStorage.setItem("token", data.access_token)
      }
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token)
      }
      console.log("[v0] Registration successful, user stored:", user)
      return { success: true, user }
    } else {
      console.log("[v0] Registration failed with status:", response.status)
      return { success: false, message: data.message || "Registration failed" }
    }
  } catch (error) {
    console.error("Registration error:", error)
    return { success: false, message: "Network error. Please try again." }
  }
}

export function getStoredUser() {
  if (typeof window === "undefined") return null

  const storedUser = localStorage.getItem("user")
  if (storedUser) {
    try {
      return JSON.parse(storedUser)
    } catch (error) {
      console.error("Failed to parse stored user:", error)
      return null
    }
  }
  return null
}

export function getAuthToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

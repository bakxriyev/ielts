const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

interface UserAnswer {
  id: number
  userId: number
  questionId: number
  examId: number
  answer: string
  is_correct: boolean
  createdAt: string
  updatedAt: string
}

interface UserData {
  id: string
  name: string
  email: string
  username: string
  readingAnswers: UserAnswer[]
  listeningAnswers: UserAnswer[]
  writingAnswers: UserAnswer[]
}

export async function checkSectionCompletion(
  userId: number,
  examId: string,
  section: "reading" | "listening" | "writing",
): Promise<boolean> {
  try {
    console.log(`[v0] Checking completion for user ${userId}, exam ${examId}, section ${section}`)

    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.log(`[v0] Failed to fetch user data: ${response.status}`)
      return false
    }

    const userData: UserData = await response.json()
    console.log(`[v0] User data fetched successfully`)

    // Check if user has answers for this exam in the specified section
    const sectionAnswers = userData[`${section}Answers`] || []
    const hasAnswersForExam = sectionAnswers.some((answer) => answer.examId.toString() === examId.toString())

    console.log(`[v0] Section ${section} completion status: ${hasAnswersForExam}`)
    return hasAnswersForExam
  } catch (error) {
    console.error(`[v0] Error checking section completion:`, error)
    return false
  }
}

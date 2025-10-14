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

interface WritingAnswer {
  id: number
  userId: number
  examId: number
  writingId: number
  answerText: string
  part: string
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
  writingAnswers: WritingAnswer[]
}

/**
 * Check if a section is completed by verifying answers exist in the API
 * This function fetches user data from the backend and checks if they have
 * submitted answers for the specified section and exam
 */
export async function checkSectionCompletion(
  userId: string,
  examId: string,
  section: "reading" | "listening" | "writing",
): Promise<boolean> {
  try {
    console.log(`[v0] Checking ${section} completion for user ${userId}, exam ${examId}`)

    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", // Ensure we get fresh data
    })

    if (!response.ok) {
      console.log(`[v0] Failed to fetch user data: ${response.status}`)
      return false
    }

    const userData: UserData = await response.json()
    console.log(`[v0] User data fetched successfully for ${section} check`)

    // Get the appropriate answers array based on section
    const sectionKey = `${section}Answers` as keyof UserData
    const sectionAnswers = (userData[sectionKey] || []) as UserAnswer[] | WritingAnswer[]

    // Check if user has answers for this exam in the specified section
    const hasAnswersForExam = sectionAnswers.some((answer: any) => answer.examId.toString() === examId.toString())

    console.log(`[v0] ${section} completion status: ${hasAnswersForExam}`)
    console.log(
      `[v0] Found ${sectionAnswers.length} total ${section} answers, ${hasAnswersForExam ? "including" : "excluding"} exam ${examId}`,
    )

    return hasAnswersForExam
  } catch (error) {
    console.error(`[v0] Error checking ${section} completion:`, error)
    return false
  }
}

/**
 * Check completion status for all sections at once
 * Returns an object with completion status for each section
 */
export async function checkAllSectionsCompletion(
  userId: string,
  examId: string,
): Promise<{ reading: boolean; listening: boolean; writing: boolean }> {
  try {
    console.log(`[v0] Checking all sections completion for user ${userId}, exam ${examId}`)

    const [reading, listening, writing] = await Promise.all([
      checkSectionCompletion(userId, examId, "reading"),
      checkSectionCompletion(userId, examId, "listening"),
      checkSectionCompletion(userId, examId, "writing"),
    ])

    const result = { reading, listening, writing }
    console.log(`[v0] All sections completion status:`, result)

    return result
  } catch (error) {
    console.error("[v0] Error checking all sections completion:", error)
    return { reading: false, listening: false, writing: false }
  }
}

/**
 * Check if all sections are completed
 */
export async function areAllSectionsCompletedFromAPI(userId: string, examId: string): Promise<boolean> {
  const status = await checkAllSectionsCompletion(userId, examId)
  const allCompleted = status.reading && status.listening && status.writing

  console.log(`[v0] All sections completed from API: ${allCompleted}`)
  return allCompleted
}

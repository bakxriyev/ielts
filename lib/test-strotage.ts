interface TestProgress {
  mockTestId: string
  sectionId: string
  answers: Record<string, any>
  timeRemaining: number
  completed: boolean
  completedTasks?: string[]
}

export function saveTestProgress(progress: TestProgress) {
  const key = `test_progress_${progress.mockTestId}_${progress.sectionId}`
  localStorage.setItem(key, JSON.stringify(progress))
}

export function getTestProgress(mockTestId: string, sectionId: string): TestProgress | null {
  const key = `test_progress_${mockTestId}_${sectionId}`
  const stored = localStorage.getItem(key)

  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (error) {
      console.error("Failed to parse test progress:", error)
      return null
    }
  }

  return null
}

export function markSectionCompleted(mockTestId: string, sectionId: string) {
  const key = `section_completed_${mockTestId}_${sectionId}`
  localStorage.setItem(key, "true")
}

export function isSectionCompleted(mockTestId: string, sectionId: string): boolean {
  const key = `section_completed_${mockTestId}_${sectionId}`
  return localStorage.getItem(key) === "true"
}

export function areAllSectionsCompleted(mockTestId: string): boolean {
  const sections = ["reading", "listening", "writing"]
  return sections.every((section) => isSectionCompleted(mockTestId, section))
}

export function clearTestProgress(mockTestId: string, sectionId: string) {
  const progressKey = `test_progress_${mockTestId}_${sectionId}`
  const completedKey = `section_completed_${mockTestId}_${sectionId}`

  localStorage.removeItem(progressKey)
  localStorage.removeItem(completedKey)
}

export function clearAllTestData(mockTestId: string) {
  const sections = ["reading", "listening", "writing"]

  sections.forEach((section) => {
    clearTestProgress(mockTestId, section)
    // Also clear answers and timer data
    localStorage.removeItem(`answers_${mockTestId}_${section}`)
    localStorage.removeItem(`timer_${mockTestId}_${section}`)
  })
}

export function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0

  // Remove extra whitespace and split by spaces
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length
}

export async function checkWritingCompletion(userId: string, examId: string): Promise<boolean> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const response = await fetch(`${API_BASE_URL}/users/${userId}`)

    if (!response.ok) return false

    const userData = await response.json()

    const writingAnswers = userData.writingAnswers || []
    const hasRequiredWritings =
      writingAnswers.filter(
        (answer: any) =>
          answer.exam_id?.toString() === examId.toString() || answer.examId?.toString() === examId.toString(),
      ).length >= 2

    console.log(`[v0] Writing completion check: ${hasRequiredWritings}, found ${writingAnswers.length} writing answers`)
    return hasRequiredWritings
  } catch (error) {
    console.error("Failed to check writing completion:", error)
    return false
  }
}

export async function checkAllSectionsCompletedAPI(userId: string, examId: string): Promise<boolean> {
  try {
    const [readingCompleted, listeningCompleted, writingCompleted] = await Promise.all([
      checkSectionCompletionAPI(userId, examId, "reading"),
      checkSectionCompletionAPI(userId, examId, "listening"),
      checkWritingCompletion(userId, examId),
    ])

    return readingCompleted && listeningCompleted && writingCompleted
  } catch (error) {
    console.error("Failed to check all sections completion:", error)
    return false
  }
}

async function checkSectionCompletionAPI(
  userId: string,
  examId: string,
  section: "reading" | "listening",
): Promise<boolean> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const response = await fetch(`${API_BASE_URL}/users/${userId}`)

    if (!response.ok) return false

    const userData = await response.json()
    const sectionAnswers = userData[`${section}Answers`] || []

    return sectionAnswers.some((answer: any) => answer.examId.toString() === examId.toString())
  } catch (error) {
    console.error(`Failed to check ${section} completion:`, error)
    return false
  }
}

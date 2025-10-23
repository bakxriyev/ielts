/**
 * Check if a specific section is completed for a user in a specific exam
 * @param userId - User ID
 * @param examId - Exam ID
 * @param section - Section name (reading, listening, writing, speaking)
 * @returns true if section has answers, false otherwise
 */
export async function checkSectionCompletion(
  userId: string,
  examId: string,
  section: "reading" | "listening" | "writing" | "speaking",
): Promise<boolean> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

    if (!API_BASE_URL) {
      console.error("[v0] API_BASE_URL environment variable not set")
      return false
    }

    console.log(`[v0] Checking ${section} completion for user ${userId} in exam ${examId}`)
    const response = await fetch(`${API_BASE_URL}/users/${userId}`)

    if (!response.ok) {
      console.error(`[v0] Failed to fetch user data: ${response.status}`)
      return false
    }

    const userData = await response.json()

    // Map section names to answer field names
    const answerFieldMap: Record<string, string> = {
      reading: "readingAnswers",
      listening: "listeningAnswers",
      writing: "writingAnswers",
      speaking: "speakingAnswers",
    }

    const answerField = answerFieldMap[section]
    const sectionAnswers = userData[answerField] || []

    // Check if there are any answers for this exam in this section
    const hasAnswersForExam = sectionAnswers.some(
      (answer: any) =>
        answer.examId?.toString() === examId.toString() || answer.exam_id?.toString() === examId.toString(),
    )

    console.log(
      `[v0] ${section} completion for exam ${examId}: ${hasAnswersForExam}, found ${sectionAnswers.length} total ${section} answers`,
    )
    return hasAnswersForExam
  } catch (error) {
    console.error(`[v0] Error checking ${section} completion:`, error)
    return false
  }
}

/**
 * Check completion status for all sections
 * @param userId - User ID
 * @param examId - Exam ID
 * @returns Object with completion status for each section
 */
export async function checkAllSectionsCompletion(
  userId: string,
  examId: string,
): Promise<{
  reading: boolean
  listening: boolean
  writing: boolean
  speaking: boolean
}> {
  try {
    const [reading, listening, writing, speaking] = await Promise.all([
      checkSectionCompletion(userId, examId, "reading"),
      checkSectionCompletion(userId, examId, "listening"),
      checkSectionCompletion(userId, examId, "writing"),
      checkSectionCompletion(userId, examId, "speaking"),
    ])

    return { reading, listening, writing, speaking }
  } catch (error) {
    console.error("[v0] Error checking all sections completion:", error)
    return {
      reading: false,
      listening: false,
      writing: false,
      speaking: false,
    }
  }
}

/**
 * Check if writing section is completed (requires at least 2 writing answers)
 * @param userId - User ID
 * @param examId - Exam ID
 * @returns true if user has at least 2 writing answers for this exam
 */
export async function checkWritingCompletion(userId: string, examId: string): Promise<boolean> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

    if (!API_BASE_URL) {
      console.error("[v0] API_BASE_URL environment variable not set")
      return false
    }

    const response = await fetch(`${API_BASE_URL}/users/${userId}`)

    if (!response.ok) return false

    const userData = await response.json()
    const writingAnswers = userData.writingAnswers || []

    // Check if user has at least 2 writing answers for this exam
    const hasRequiredWritings =
      writingAnswers.filter(
        (answer: any) =>
          answer.exam_id?.toString() === examId.toString() || answer.examId?.toString() === examId.toString(),
      ).length >= 2

    console.log(`[v0] Writing completion check: ${hasRequiredWritings}, found ${writingAnswers.length} writing answers`)
    return hasRequiredWritings
  } catch (error) {
    console.error("[v0] Failed to check writing completion:", error)
    return false
  }
}

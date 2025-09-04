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

export function clearTestProgress(mockTestId: string, sectionId: string) {
  const progressKey = `test_progress_${mockTestId}_${sectionId}`
  const completedKey = `section_completed_${mockTestId}_${sectionId}`

  localStorage.removeItem(progressKey)
  localStorage.removeItem(completedKey)
}

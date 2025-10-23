/**
 * Utility functions for managing exam ID in localStorage
 * Ensures that the correct exam ID is used when saving answers
 */

const CURRENT_EXAM_ID_KEY = "current_exam_id"

/**
 * Get the current exam ID from localStorage
 * @returns The current exam ID or null if not set
 */
export function getCurrentExamId(): string | null {
  if (typeof window === "undefined") return null
  const examId = localStorage.getItem(CURRENT_EXAM_ID_KEY)
  return examId
}

/**
 * Set the current exam ID in localStorage
 * Call this when the exam loads to ensure the correct exam ID is stored
 * @param examId The exam ID to store
 */
export function setCurrentExamId(examId: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CURRENT_EXAM_ID_KEY, examId)
  console.log("[v0] Set current exam ID in localStorage:", examId)
}

/**
 * Clear the current exam ID from localStorage
 * Call this when the exam is completed or user leaves
 */
export function clearCurrentExamId(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(CURRENT_EXAM_ID_KEY)
  console.log("[v0] Cleared current exam ID from localStorage")
}

/**
 * Get the exam ID for saving answers
 * Prioritizes localStorage value over URL param
 * @param urlExamId The exam ID from URL params as fallback
 * @returns The exam ID to use for saving answers
 */
export function getExamIdForAnswers(urlExamId: string): string {
  const storedExamId = getCurrentExamId()
  if (storedExamId) {
    console.log("[v0] Using exam ID from localStorage:", storedExamId)
    return storedExamId
  }
  console.log("[v0] Falling back to URL param exam ID:", urlExamId)
  return urlExamId
}

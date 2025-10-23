export interface QuestionNumberingConfig {
  part1Start: number
  part1Count: number
  part2Start: number
  part2Count: number
  part3Start: number
  part3Count: number
}

export const QUESTION_NUMBERING: QuestionNumberingConfig = {
  part1Start: 1,
  part1Count: 13,
  part2Start: 14,
  part2Count: 13,
  part3Start: 27,
  part3Count: 14,
}

export function getPartStartNumber(partNumber: number): number {
  switch (partNumber) {
    case 1:
      return QUESTION_NUMBERING.part1Start
    case 2:
      return QUESTION_NUMBERING.part2Start
    case 3:
      return QUESTION_NUMBERING.part3Start
    default:
      return 1
  }
}

export function getPartQuestionCount(partNumber: number): number {
  switch (partNumber) {
    case 1:
      return QUESTION_NUMBERING.part1Count
    case 2:
      return QUESTION_NUMBERING.part2Count
    case 3:
      return QUESTION_NUMBERING.part3Count
    default:
      return 0
  }
}

export function getTotalQuestions(): number {
  return QUESTION_NUMBERING.part1Count + QUESTION_NUMBERING.part2Count + QUESTION_NUMBERING.part3Count
}

export function getPartNumberFromString(partString: string | number): number {
  if (typeof partString === "number") return partString
  return Number.parseInt(partString.replace("PART", ""))
}

export function getPartQuestionRange(partNumber: number): { start: number; end: number } {
  const start = getPartStartNumber(partNumber)
  const count = getPartQuestionCount(partNumber)
  return { start, end: start + count - 1 }
}

export function countQuestionItems(question: any, passages?: any[], partNumber?: number): number {
  const { q_type, correct_answers, rows, table_structure, q_text } = question

  if (q_type === "MATCHING_HEADINGS") {
    if (passages && partNumber) {
      const part = `PART${partNumber}`
      const matchingPassage = passages.find((p) => p.type === "matching" && p.part === part)
      if (matchingPassage) {
        const underscorePattern = /_{2,}/g
        const matches = [...matchingPassage.reading_text.matchAll(underscorePattern)]
        return matches.length
      }
    }
    return 1
  } else if (q_type === "MCQ_MULTI") {
    return correct_answers?.length || 1
  } else if (q_type === "TABLE_COMPLETION") {
    let inputCount = 0
    if (rows && Array.isArray(rows)) {
      rows.forEach((row) => {
        if (row.cells && Array.isArray(row.cells)) {
          row.cells.forEach((cell) => {
            if (cell === "" || cell === "_") {
              inputCount++
            }
          })
        }
      })
    } else if (table_structure?.rows) {
      table_structure.rows.forEach((row) => {
        Object.values(row).forEach((value) => {
          if (value === "" || value === "_") {
            inputCount++
          }
        })
      })
    }
    return inputCount > 0 ? inputCount : 1
  } else if (q_type === "MATCHING_INFORMATION") {
    return (question as any).rows?.length || 1
  } else if (q_type === "SENTENCE_COMPLETION" || q_type === "SUMMARY_COMPLETION") {
    const blankCount = (q_text?.match(/_+/g) || []).length
    return blankCount > 0 ? blankCount : 1
  }
  return 1
}

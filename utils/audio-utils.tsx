interface Listening {
  id: string
  title: string
  description: string
  audio_url?: string
  questions: any[]
}

export const getAudioUrl = (listening: Listening | undefined): string | null => {
  if (!listening?.audio_url) {
    return null
  }

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  return `${API_BASE_URL}${listening.audio_url}`
}

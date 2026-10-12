import { translations } from './translations.js'

export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
export const MAX_BYTES = 10 * 1024 * 1024

// Used when no translate function is passed in.
const defaultT = (key) => translations.en[key] ?? key

export function toBase64(blob, t = defaultT) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = () => reject(new Error(t('readFile')))
    r.readAsDataURL(blob)
  })
}

// Returns an error string, or null when the file is usable.
export async function validateFile(file, t = defaultT) {
  if (!ALLOWED_TYPES.includes(file.type)) return t('unsupportedFile')
  if (file.size === 0) return t('emptyFile')
  if (file.size > MAX_BYTES) return t('fileTooLarge')
  if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file)
    const ok = await new Promise((res) => {
      const img = new Image()
      img.onload = () => res(true)
      img.onerror = () => res(false)
      img.src = url
    })
    URL.revokeObjectURL(url)
    if (!ok) return t('corruptedImage')
  }
  return null
}

// `language` is the language name for the model, e.g. "English", "Telugu", "Hindi".
export async function sendChat({ conversationId, prompt, history, fileRecord, language = 'English', t = defaultT }) {
  const body = { conversation_id: conversationId, prompt, history, language, file: null }
  if (fileRecord) {
    body.file = {
      name: fileRecord.name,
      mime_type: fileRecord.type,
      data: await toBase64(fileRecord.blob, t),
    }
  }
  let res
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(t('backendDown'))
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const d = data.detail
    throw new Error(typeof d === 'string' ? d : t('requestRejected'))
  }
  return data
}
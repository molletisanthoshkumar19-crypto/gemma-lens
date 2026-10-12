// Conversations live in localStorage; file bytes live in IndexedDB (too big for localStorage).
const KEY = 'gemma-lens.conversations.v1'

export function loadConversations() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages))
      .map((c) => ({
        id: c.id,
        title: String(c.title || 'Untitled'),
        createdAt: c.createdAt || Date.now(),
        updatedAt: c.updatedAt || Date.now(),
        file: c.file && c.file.name ? c.file : null,
        messages: c.messages.filter((m) => m && (m.role === 'user' || m.role === 'assistant')),
      }))
  } catch {
    return []
  }
}

export function saveConversations(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* quota exceeded: keep working in memory */
  }
}

export function makeTitle(prompt) {
  const clean = prompt.replace(/\s+/g, ' ').trim().replace(/[?.!]+$/, '')
  if (!clean) return 'New conversation'
  const t = clean.length > 42 ? clean.slice(0, 42).trimEnd() + '…' : clean
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const DB = 'gemma-lens'
const STORE = 'files'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const r = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(r?.result)
    t.onerror = () => reject(t.error)
  })
}

export const putFile = (id, file) => tx('readwrite', (s) => s.put(file, id)).catch(() => {})
export const getFile = (id) => tx('readonly', (s) => s.get(id)).catch(() => undefined)
export const deleteFile = (id) => tx('readwrite', (s) => s.delete(id)).catch(() => {})

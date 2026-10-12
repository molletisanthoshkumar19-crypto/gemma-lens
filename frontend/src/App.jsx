import { useCallback, useEffect, useMemo, useState } from 'react'
import { PanelLeft } from 'lucide-react'
import Sidebar from './components/Sidebar.jsx'
import Home from './components/Home.jsx'
import Chat from './components/Chat.jsx'
import { ThemeToggle, useTheme } from './components/ui.jsx'
import { validateFile, sendChat } from './lib/api.js'
import { loadConversations, saveConversations, makeTitle, putFile, getFile, deleteFile } from './lib/storage.js'
import { LanguageProvider, LanguageSelect, useI18n } from './lib/i18n.jsx'

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))

function AppInner() {
  const { t, modelLanguage } = useI18n()
  const [theme, toggleTheme] = useTheme()
  const [conversations, setConversations] = useState(loadConversations)
  const [activeId, setActiveId] = useState(null)        // null = home screen
  const [homeKey, setHomeKey] = useState(0)             // remounts Home so no stale file/prompt survives
  const [busyIds, setBusyIds] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 860)
  const [fileUrl, setFileUrl] = useState(null)
  const [fileMissing, setFileMissing] = useState(false)

  useEffect(() => { saveConversations(conversations) }, [conversations])

  const active = useMemo(() => conversations.find((c) => c.id === activeId) || null, [conversations, activeId])

  // Load the stored file for the active conversation (preview + availability).
  useEffect(() => {
    let url = null, cancelled = false
    setFileUrl(null); setFileMissing(false)
    if (!active?.file) return
    getFile(active.id).then((rec) => {
      if (cancelled) return
      if (!rec) { setFileMissing(true); return }
      if (rec.type.startsWith('image/')) { url = URL.createObjectURL(rec.blob); setFileUrl(url) }
    })
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [active?.id, active?.file?.name, active?.file?.size])

  const patch = useCallback((id, fn) => {
    setConversations((list) => list.map((c) => (c.id === id ? fn(c) : c)))
  }, [])

  // The language is read at send time, so switching language mid-chat
  // makes the next answer come back in the newly selected language.
  const ask = useCallback(async (id, prompt, history, fileRecord) => {
    setBusyIds((b) => [...b, id])
    try {
      const data = await sendChat({ conversationId: id, prompt, history, fileRecord, language: modelLanguage, t })
      patch(id, (c) => ({ ...c, updatedAt: Date.now(),
        messages: [...c.messages, { id: uid(), role: 'assistant', text: data.reply, ts: Date.now() }] }))
    } catch (e) {
      patch(id, (c) => ({ ...c, messages: [...c.messages,
        { id: uid(), role: 'assistant', text: e.message, error: true, ts: Date.now() }] }))
    } finally {
      setBusyIds((b) => b.filter((x) => x !== id))
    }
  }, [patch, modelLanguage, t])

  const startConversation = async (file, prompt) => {
    if (!prompt) return
    const id = uid()
    const err = await validateFile(file, t)
    if (err) return
    await putFile(id, { name: file.name, type: file.type, blob: file })
    const now = Date.now()
    const conv = {
      id, title: makeTitle(prompt), createdAt: now, updatedAt: now,
      file: { name: file.name, type: file.type, size: file.size },
      messages: [{ id: uid(), role: 'user', text: prompt, ts: now }],
    }
    setConversations((l) => [conv, ...l])
    setActiveId(id)
    if (window.innerWidth <= 860) setSidebarOpen(false)
    ask(id, prompt, [], { name: file.name, type: file.type, blob: file })
  }

  const sendFollowUp = async (prompt) => {
    if (!active || !prompt) return
    const id = active.id
    // Only this conversation's successful messages go to the model.
    const history = active.messages.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.text }))
    const rec = active.file ? await getFile(id) : null
    if (active.file && !rec) { setFileMissing(true); return }
    patch(id, (c) => ({ ...c, updatedAt: Date.now(),
      messages: [...c.messages, { id: uid(), role: 'user', text: prompt, ts: Date.now() }] }))
    ask(id, prompt, history, rec)
  }

  const replaceFile = async (file) => {
    if (!active) return
    const err = await validateFile(file, t)
    if (err) {
      patch(active.id, (c) => ({ ...c, messages: [...c.messages, { id: uid(), role: 'assistant', text: err, error: true, ts: Date.now() }] }))
      return
    }
    await putFile(active.id, { name: file.name, type: file.type, blob: file })
    patch(active.id, (c) => ({ ...c, file: { name: file.name, type: file.type, size: file.size } }))
    setFileMissing(false)
  }

  const newChat = () => {
    setActiveId(null)
    setHomeKey((k) => k + 1)
    if (window.innerWidth <= 860) setSidebarOpen(false)
  }
  const openConv = (id) => {
    setActiveId(id)
    if (window.innerWidth <= 860) setSidebarOpen(false)
  }
  const deleteConv = (id) => {
    setConversations((l) => l.filter((c) => c.id !== id))
    deleteFile(id)
    if (activeId === id) newChat()
  }

  return (
    <div className={`app ${sidebarOpen ? 'with-sidebar' : ''}`}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} conversations={conversations}
        activeId={activeId} onNew={newChat} onOpen={openConv} onDelete={deleteConv}
        theme={theme} onToggleTheme={toggleTheme} />
      <main className="main">
        <header className="topbar">
          {!sidebarOpen && (
            <button className="icon-btn" onClick={() => setSidebarOpen(true)} aria-label={t('openSidebar')}>
              <PanelLeft size={18} />
            </button>
          )}
          <span className="topbar-title">{active ? active.title : t('newChatTitle')}</span>
          <LanguageSelect />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>
        <div className="workspace">
          {active ? (
            <Chat key={active.id} conv={active} busy={busyIds.includes(active.id)} fileUrl={fileUrl}
              fileMissing={fileMissing} onSend={sendFollowUp} onAttach={replaceFile} />
          ) : (
            <Home key={homeKey} onStart={startConversation} />
          )}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  )
}
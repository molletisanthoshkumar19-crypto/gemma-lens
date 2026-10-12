import { useState } from 'react'
import { PanelLeftClose, SquarePen, Trash2, MessageSquare } from 'lucide-react'
import { Logo, ThemeToggle, ConfirmDialog } from './ui.jsx'

export default function Sidebar({ open, onClose, conversations, activeId, onNew, onOpen, onDelete, theme, onToggleTheme }) {
  const [pending, setPending] = useState(null)
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)

  return (
    <>
      {open && <div className="scrim" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Conversations">
        <div className="sidebar-top">
          <div className="brand"><Logo /><span>Gemma Lens</span></div>
          <button className="icon-btn" onClick={onClose} aria-label="Collapse sidebar">
            <PanelLeftClose size={18} />
          </button>
        </div>
        <button className="new-chat" onClick={onNew}><SquarePen size={16} />New chat</button>

        <div className="history-label">Recent</div>
        <nav className="history">
          {sorted.length === 0 && <p className="history-empty">Conversations you start will appear here.</p>}
          {sorted.map((c) => (
            <div key={c.id} className={`history-item ${c.id === activeId ? 'active' : ''}`}>
              <button className="history-open" onClick={() => onOpen(c.id)}
                aria-current={c.id === activeId ? 'true' : undefined}>
                <MessageSquare size={15} /><span>{c.title}</span>
              </button>
              <button className="history-del" onClick={() => setPending(c)} aria-label={`Delete ${c.title}`}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <ThemeToggle theme={theme} onToggle={onToggleTheme} withLabel />
        </div>
      </aside>
      {pending && (
        <ConfirmDialog title="Delete this conversation?"
          body={`“${pending.title}” and its attached file will be removed from this device.`}
          confirmLabel="Delete"
          onCancel={() => setPending(null)}
          onConfirm={() => { onDelete(pending.id); setPending(null) }} />
      )}
    </>
  )
}

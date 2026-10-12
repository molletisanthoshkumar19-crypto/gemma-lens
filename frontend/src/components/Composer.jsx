import { useEffect, useRef } from 'react'
import { ArrowUp, Paperclip } from 'lucide-react'

export default function Composer({ value, onChange, onSubmit, disabled, busy, placeholder, onAttach, submitLabel = 'Analyze' }) {
  const ta = useRef(null)
  const attach = useRef(null)

  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 180) + 'px'
  }, [value])

  const canSend = value.trim().length > 0 && !disabled && !busy

  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); canSend && onSubmit() }}>
      {onAttach && (
        <>
          <input ref={attach} type="file" hidden accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={(e) => { e.target.files[0] && onAttach(e.target.files[0]); e.target.value = '' }} />
          <button type="button" className="icon-btn" onClick={() => attach.current?.click()}
            aria-label="Attach or replace file" title="Attach or replace file"><Paperclip size={18} /></button>
        </>
      )}
      <textarea ref={ta} rows={1} value={value} placeholder={placeholder} aria-label="Your question"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); canSend && onSubmit() } }} />
      <button type="submit" className="send" disabled={!canSend} aria-label={submitLabel} title={submitLabel}>
        <ArrowUp size={18} strokeWidth={2.4} />
        <span className="send-label">{submitLabel}</span>
      </button>
    </form>
  )
}

import { useEffect, useState } from 'react'
import { Moon, Sun, Copy, Check } from 'lucide-react'

export function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <circle cx="16" cy="16" r="7" fill="none" stroke="var(--on-accent)" strokeWidth="3" />
    </svg>
  )
}

export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('gemma-lens.theme', theme) } catch { /* ignore */ }
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}

export function ThemeToggle({ theme, onToggle, withLabel }) {
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button className={withLabel ? 'btn-ghost wide' : 'icon-btn'} onClick={onToggle}
      aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      {withLabel && <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>}
    </button>
  )
}

export function CopyButton({ text, label = 'Copy', className = 'copy-btn' }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch { /* clipboard unavailable */ }
  }
  return (
    <button className={className} onClick={copy} aria-label={label}>
      {done ? <Check size={14} /> : <Copy size={14} />}
      <span>{done ? 'Copied' : label}</span>
    </button>
  )
}

export function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title"
        onClick={(e) => e.stopPropagation()}>
        <h3 id="dlg-title">{title}</h3>
        <p>{body}</p>
        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

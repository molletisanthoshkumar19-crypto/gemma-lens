import { useEffect, useRef, useState } from 'react'
import { UploadCloud, X, RefreshCw, FileText } from 'lucide-react'

const fmt = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB')

export default function FileDrop({ file, error, onFile, onClear }) {
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const u = URL.createObjectURL(file)
      setUrl(u)
      return () => URL.revokeObjectURL(u)
    }
    setUrl(null)
  }, [file])

  const pick = (f) => f && onFile(f)
  const browse = () => input.current?.click()

  return (
    <div>
      <input ref={input} type="file" hidden accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => { pick(e.target.files[0]); e.target.value = '' }} />
      {file ? (
        <div className="file-card">
          <div className="file-thumb">
            {url ? <img src={url} alt={`Preview of ${file.name}`} /> : <FileText size={40} />}
          </div>
          <div className="file-meta">
            <strong title={file.name}>{file.name}</strong>
            <span>{file.type.split('/')[1].toUpperCase()} · {fmt(file.size)}</span>
          </div>
          <div className="file-actions">
            <button className="btn-secondary" onClick={browse}><RefreshCw size={14} />Replace</button>
            <button className="icon-btn" onClick={onClear} aria-label="Remove file"><X size={18} /></button>
          </div>
        </div>
      ) : (
        <div className={`dropzone ${over ? 'over' : ''}`} role="button" tabIndex={0}
          onClick={browse} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), browse())}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]) }}>
          <UploadCloud size={34} strokeWidth={1.6} />
          <p className="drop-title">Drag and drop your file here</p>
          <p className="drop-sub">Or browse files from your device</p>
          <p className="drop-types">JPG, PNG, WEBP or PDF · up to 10 MB</p>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, AlertTriangle } from 'lucide-react'
import Composer from './Composer.jsx'
import { CopyButton } from './ui.jsx'

function textOf(node) {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(textOf).join('')
  return node?.props?.children ? textOf(node.props.children) : ''
}

function CodeBlock({ children }) {
  const code = textOf(children).replace(/\n$/, '')
  return (
    <div className="codeblock">
      <CopyButton text={code} className="copy-btn code-copy" />
      <pre>{children}</pre>
    </div>
  )
}

// react-markdown does not render raw HTML by default, so model output cannot inject scripts.
function Markdown({ text }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        pre: CodeBlock,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
      }}>{text}</ReactMarkdown>
    </div>
  )
}

function FileChip({ conv, url }) {
  if (!conv.file) return null
  const isImg = conv.file.type?.startsWith('image/')
  return (
    <div className="msg-file">
      {isImg && url ? <img src={url} alt={conv.file.name} /> : (
        <div className="msg-file-icon"><FileText size={22} /></div>
      )}
      <span>{conv.file.name}</span>
    </div>
  )
}

export default function Chat({ conv, busy, fileUrl, fileMissing, onSend, onAttach }) {
  const [draft, setDraft] = useState('')
  const end = useRef(null)

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) },
    [conv.messages.length, busy])
  useEffect(() => { setDraft('') }, [conv.id])

  const firstUser = conv.messages.findIndex((m) => m.role === 'user')

  return (
    <div className="chat">
      <div className="thread">
        {conv.messages.map((m, i) => (
          <div key={m.id} className={`msg ${m.role}`}>
            {m.role === 'user' ? (
              <div className="bubble">
                {i === firstUser && <FileChip conv={conv} url={fileUrl} />}
                <p>{m.text}</p>
              </div>
            ) : m.error ? (
              <div className="error-msg" role="alert"><AlertTriangle size={16} /><span>{m.text}</span></div>
            ) : (
              <div className="answer">
                <Markdown text={m.text} />
                <CopyButton text={m.text} label="Copy response" />
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="msg assistant" aria-live="polite">
            <div className="thinking"><span /><span /><span /><em>Gemma is reading your file…</em></div>
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="dock">
        {fileMissing && (
          <p className="notice">The attached file is no longer stored on this device. Use the paperclip to upload it again before asking more questions about it.</p>
        )}
        <Composer value={draft} onChange={setDraft} busy={busy} onAttach={onAttach}
          placeholder="Ask a follow-up question..." submitLabel="Send"
          onSubmit={() => { const t = draft.trim(); setDraft(''); onSend(t) }} />
      </div>
    </div>
  )
}

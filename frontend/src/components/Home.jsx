import { useState } from 'react'
import { Logo } from './ui.jsx'
import FileDrop from './FileDrop.jsx'
import Composer from './Composer.jsx'
import { validateFile } from '../lib/api.js'

const EXAMPLES = [
  'Identify this error, explain why it happened, and show me how to fix it.',
  'Summarize this notice and tell me what I need to do.',
  'Explain this diagram like I am a beginner.',
  'Explain the important trends in this chart.',
]

export default function Home({ onStart }) {
  const [file, setFile] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState('')

  const choose = async (f) => {
    const err = await validateFile(f)
    if (err) { setError(err); return }
    setError(''); setFile(f)
  }
  const submit = () => {
    if (!file) { setError('Add an image or PDF first, then ask your question.'); return }
    onStart(file, prompt.trim())
  }

  return (
    <div className="home">
      <Logo size={44} />
      <h1>Your Image. Your Question. One Intelligent Answer.</h1>
      <p className="lede">Upload a visual, ask a question, and turn what you see into something you can understand and act on.</p>

      <FileDrop file={file} error={error} onFile={choose} onClear={() => { setFile(null); setError('') }} />

      <Composer value={prompt} onChange={setPrompt} onSubmit={submit}
        placeholder="Ask anything about your file..." submitLabel="Analyze" />

      <div className="examples">
        {EXAMPLES.map((ex) => (
          <button key={ex} className="chip" onClick={() => setPrompt(ex)}>{ex}</button>
        ))}
      </div>
    </div>
  )
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Globe } from 'lucide-react'
import { translations } from './translations.js'

// `model` is the language name sent to Gemma so it replies in that language.
export const LANGUAGES = [
  { code: 'en', native: 'English', model: 'English' },
  { code: 'te', native: 'తెలుగు', model: 'Telugu' },
  { code: 'hi', native: 'हिन्दी', model: 'Hindi' },
]

const STORAGE_KEY = 'app-language'
const I18nContext = createContext(null)

function readSavedLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return LANGUAGES.some((l) => l.code === saved) ? saved : 'en'
  } catch {
    return 'en'
  }
}

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readSavedLanguage)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang) } catch { /* storage unavailable */ }
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations.en[key] ?? key,
    [lang],
  )

  const modelLanguage = LANGUAGES.find((l) => l.code === lang)?.model ?? 'English'
  const value = useMemo(() => ({ lang, setLang, t, modelLanguage }), [lang, t, modelLanguage])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>')
  return ctx
}

// Dropdown to place next to the theme toggle.
export function LanguageSelect() {
  const { lang, setLang, t } = useI18n()
  return (
    <label className="lang-select" title={t('language')}>
      <Globe size={16} aria-hidden="true" />
      <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('language')}>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.native}</option>
        ))}
      </select>
    </label>
  )
}
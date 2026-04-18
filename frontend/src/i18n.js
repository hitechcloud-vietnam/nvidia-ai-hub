import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en'
import vi from './locales/vi'
import ja from './locales/ja'
import zh from './locales/zh'
import es from './locales/es'
import fr from './locales/fr'
import de from './locales/de'
import pt from './locales/pt'
import ru from './locales/ru'
import ko from './locales/ko'
import ar from './locales/ar'
import hi from './locales/hi'
import id from './locales/id'
import th from './locales/th'
import it from './locales/it'
import nl from './locales/nl'
import tr from './locales/tr'
import pl from './locales/pl'

const LANGUAGE_STORAGE_KEY = 'nvidia-ai-hub-language'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', nativeLabel: 'English' },
  { code: 'vi', nativeLabel: 'Tiếng Việt' },
  { code: 'ja', nativeLabel: '日本語' },
  { code: 'zh', nativeLabel: '中文' },
  { code: 'es', nativeLabel: 'Español' },
  { code: 'fr', nativeLabel: 'Français' },
  { code: 'de', nativeLabel: 'Deutsch' },
  { code: 'pt', nativeLabel: 'Português' },
  { code: 'ru', nativeLabel: 'Русский' },
  { code: 'ko', nativeLabel: '한국어' },
  { code: 'ar', nativeLabel: 'العربية' },
  { code: 'hi', nativeLabel: 'हिन्दी' },
  { code: 'id', nativeLabel: 'Bahasa Indonesia' },
  { code: 'th', nativeLabel: 'ไทย' },
  { code: 'it', nativeLabel: 'Italiano' },
  { code: 'nl', nativeLabel: 'Nederlands' },
  { code: 'tr', nativeLabel: 'Türkçe' },
  { code: 'pl', nativeLabel: 'Polski' },
]

const resources = { en, vi, ja, zh, es, fr, de, pt, ru, ko, ar, hi, id, th, it, nl, tr, pl }

function getInitialLanguage() {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (saved && resources[saved]) return saved

  const browserLanguage = navigator.language?.toLowerCase() || 'en'
  if (browserLanguage.startsWith('vi')) return 'vi'
  if (browserLanguage.startsWith('ja')) return 'ja'
  if (browserLanguage.startsWith('zh')) return 'zh'
  if (browserLanguage.startsWith('es')) return 'es'
  if (browserLanguage.startsWith('fr')) return 'fr'
  if (browserLanguage.startsWith('de')) return 'de'
  if (browserLanguage.startsWith('pt')) return 'pt'
  if (browserLanguage.startsWith('ru')) return 'ru'
  if (browserLanguage.startsWith('ko')) return 'ko'
  if (browserLanguage.startsWith('ar')) return 'ar'
  if (browserLanguage.startsWith('hi')) return 'hi'
  if (browserLanguage.startsWith('id')) return 'id'
  if (browserLanguage.startsWith('th')) return 'th'
  if (browserLanguage.startsWith('it')) return 'it'
  if (browserLanguage.startsWith('nl')) return 'nl'
  if (browserLanguage.startsWith('tr')) return 'tr'
  if (browserLanguage.startsWith('pl')) return 'pl'
  return 'en'
}

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: getInitialLanguage(),
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    })
}

export function persistLanguage(language) {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
}

document.documentElement.lang = i18n.resolvedLanguage || i18n.language || 'en'
document.documentElement.dir = (i18n.resolvedLanguage || i18n.language || 'en') === 'ar' ? 'rtl' : 'ltr'

export default i18n
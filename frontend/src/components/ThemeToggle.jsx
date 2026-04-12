import { useStore } from '../store'

export default function ThemeToggle() {
  const theme = useStore((s) => s.theme)
  const toggleTheme = useStore((s) => s.toggleTheme)

  return (
    <button
      onClick={toggleTheme}
      className="w-9 h-9 rounded-xl bg-surface-high flex items-center justify-center cursor-pointer border-none transition-all duration-300 hover:bg-surface-highest"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <svg
        className={`absolute w-4 h-4 transition-all duration-500 ${
          theme === 'light'
            ? 'opacity-100 rotate-0 scale-100 text-amber-500'
            : 'opacity-0 rotate-90 scale-50 text-amber-500'
        }`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
      <svg
        className={`absolute w-4 h-4 transition-all duration-500 ${
          theme === 'dark'
            ? 'opacity-100 rotate-0 scale-100 text-primary'
            : 'opacity-0 -rotate-90 scale-50 text-primary'
        }`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  )
}

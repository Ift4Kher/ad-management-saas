/**
 * LanguageToggle — switches between English and Bengali.
 *
 * Persists selection to localStorage via i18next AND to the server
 * (User.locale) when the user is authenticated, ensuring the preference
 * survives across devices and sessions.
 */
'use client';

import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('bn') ? 'bn' : 'en';

  const toggleLanguage = async () => {
    const nextLang = currentLang === 'en' ? 'bn' : 'en';
    await i18n.changeLanguage(nextLang);

    // Persist to server if user is logged in
    const token = typeof window !== 'undefined' ? localStorage.getItem('adsync_token') : null;
    if (token) {
      try {
        await fetch('http://localhost:4000/api/auth/locale', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ locale: nextLang }),
        });
      } catch {
        // Non-critical — localStorage already cached via i18next
      }
    }
  };

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-neutral-200 bg-surface px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary-start"
      aria-label={`Switch language to ${currentLang === 'en' ? 'Bengali' : 'English'}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span>{currentLang === 'en' ? 'বাং' : 'EN'}</span>
    </button>
  );
}

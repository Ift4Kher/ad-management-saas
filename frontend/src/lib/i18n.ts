/**
 * i18next configuration for AdSync.
 *
 * Supports English (en) and Bengali (bn) from the start.
 * Uses browser language detection and falls back to English.
 * Translation files are loaded from src/locales/{lang}/common.json.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '@/locales/en/common.json';
import bn from '@/locales/bn/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'bn'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;

/**
 * I18nProvider — wraps the app with i18next context.
 *
 * Ensures client-side hydration completes before rendering translated text,
 * eliminating React hydration mismatch warnings between SSR and localStorage state.
 */
'use client';

import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <div style={{ visibility: mounted ? 'visible' : 'hidden' }}>{children}</div>
    </I18nextProvider>
  );
}

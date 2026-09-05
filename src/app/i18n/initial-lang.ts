import { isPlatformBrowser } from '@angular/common';

/** Languages the portfolio is translated into. */
export type AppLang = 'en' | 'es';

/** Language the static HTML is prerendered in. */
export const DEFAULT_LANG: AppLang = 'en';

/**
 * Resolves the language to boot the app with.
 *
 * Order: persisted choice in localStorage → browser language → English.
 * On the server there is no user context, so the prerendered language is used.
 */
export function resolveInitialLang(
  platformId: Object,
  browserLang: string | undefined
): AppLang {
  if (!isPlatformBrowser(platformId)) {
    return DEFAULT_LANG;
  }
  const saved = localStorage.getItem('language');
  if (saved === 'en' || saved === 'es') {
    return saved;
  }
  return browserLang === 'es' ? 'es' : DEFAULT_LANG;
}

import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { catchError, map, of } from 'rxjs';

/** Languages the portfolio is translated into. */
export type AppLang = 'en' | 'es';

/** Language served at the root URL and used as `x-default` for search engines. */
export const DEFAULT_LANG: AppLang = 'en';

/** Public origin, used for canonical / hreflang links. */
export const SITE_ORIGIN = 'https://www.pablodiazjorge.com';

/**
 * Cookie that stores an explicit language choice. It is read at the edge
 * (see vercel.json and server.ts) to redirect `/` to `/es` before any HTML
 * is sent, so the visitor never sees the page in the wrong language.
 */
export const LANG_COOKIE = 'language';

/** URL path (without origin) for a language. */
export function pathForLang(lang: AppLang): string {
  return lang === DEFAULT_LANG ? '/' : `/${lang}`;
}

/** Absolute URL for a language. */
export function urlForLang(lang: AppLang): string {
  return SITE_ORIGIN + pathForLang(lang);
}

/** Language encoded in a route: `/es` → es, anything else → en. */
export function langFromRoute(route: ActivatedRouteSnapshot): AppLang {
  return route.url[0]?.path === 'es' ? 'es' : DEFAULT_LANG;
}

/** Persists an explicit language choice for the edge redirect. */
export function rememberLang(doc: Document, lang: AppLang): void {
  const oneYear = 60 * 60 * 24 * 365;
  doc.cookie = `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${oneYear}; SameSite=Lax`;
}

/**
 * Loads the translations for the language in the URL before the route
 * activates. Running it as a resolver (rather than an app initializer) means
 * the same code path works for `/`, `/es`, prerendering and in-app switches,
 * and hydration always renders real content instead of empty strings.
 */
export const langResolver: ResolveFn<AppLang> = (route) => {
  const lang = langFromRoute(route);
  return inject(TranslateService)
    .use(lang)
    .pipe(
      map(() => lang),
      catchError(() => of(lang))
    );
};

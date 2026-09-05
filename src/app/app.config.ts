import { ApplicationConfig, inject, PLATFORM_ID, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { HttpClient, withFetch } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideClientHydration } from '@angular/platform-browser';
import { catchError, lastValueFrom, of } from 'rxjs';
import { resolveInitialLang } from './i18n/initial-lang';

/** Factory function to create TranslateHttpLoader for loading translation files */
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, '/assets/i18n/', '.json');
}

/**
 * Loads the user's language before the first render.
 *
 * Without this, hydration runs while the translation file is still pending:
 * every `| translate` binding resolves to an empty string, the prerendered
 * content is wiped and then re-rendered once the file arrives (visible blank
 * flash + large layout shift). The JSON is preloaded from index.html, so this
 * normally costs no extra network time.
 */
function preloadTranslations() {
  const translate = inject(TranslateService);
  const lang = resolveInitialLang(inject(PLATFORM_ID), translate.getBrowserLang());
  return lastValueFrom(translate.use(lang).pipe(catchError(() => of(null))));
}

/** Application configuration with providers for routing, HTTP, and translation */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }).providers!,
    provideAppInitializer(preloadTranslations),
  ],
};

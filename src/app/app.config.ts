import { ApplicationConfig } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy, provideRouter, RouteReuseStrategy } from '@angular/router';
import { routes } from './app.routes';
import { HttpClient, withFetch } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideClientHydration } from '@angular/platform-browser';
import { I18N_VERSION } from './i18n/lang';

/**
 * Factory function to create TranslateHttpLoader for loading translation files.
 * The `?v=` suffix gives the files a URL that no browser has cached as
 * immutable. Prerendering reads them from disk by pathname, so the query
 * string does not affect it.
 */
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, '/assets/i18n/', `.json?v=${I18N_VERSION}`);
}

/**
 * Keeps the page component alive when navigating between `/` and `/es`.
 * Both routes render the same component; without this Angular would destroy
 * and recreate it on every language switch.
 */
export class SameComponentReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return (
      future.routeConfig === curr.routeConfig ||
      (!!future.component && future.component === curr.component)
    );
  }
}

/** Application configuration with providers for routing, HTTP, and translation */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    { provide: RouteReuseStrategy, useClass: SameComponentReuseStrategy },
    provideClientHydration(),
    provideHttpClient(withFetch()),
    // No defaultLanguage: the language comes from the URL and is loaded by
    // langResolver, so a second translation file is never fetched.
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }).providers!,
  ],
};

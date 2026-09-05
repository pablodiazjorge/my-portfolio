import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { langResolver } from './i18n/lang';

/**
 * One route per language, both rendered by HomeComponent and both
 * prerendered (see app.routes.server.ts). The resolver loads the matching
 * translations before the component is created.
 */
export const routes: Routes = [
  { path: '', component: HomeComponent, resolve: { lang: langResolver } },
  { path: 'es', component: HomeComponent, resolve: { lang: langResolver } },
  { path: '**', redirectTo: '' }, // Redirect any unknown route to home
];

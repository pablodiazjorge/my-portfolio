import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // English at the root, Spanish under /es: both become static HTML files.
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'es', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Prerender },
];

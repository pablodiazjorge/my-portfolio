import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Sends Spanish visitors from `/` to the prerendered `/es` page before any
 * HTML is served. Mirrors the redirect rules in vercel.json so local runs of
 * this server behave like production. An explicit choice (cookie) wins over
 * the browser's Accept-Language header.
 */
app.get('/', (req, res, next) => {
  const cookie = /(?:^|;\s*)language=(en|es)(?:;|$)/.exec(req.headers.cookie ?? '')?.[1];
  const acceptsSpanish = /^\s*es\b/i.test(req.headers['accept-language'] ?? '');
  if (cookie === 'es' || (!cookie && acceptsSpanish)) {
    res.redirect(307, '/es');
    return;
  }
  next();
});

/**
 * Translations and CV files keep their URL from one deploy to the next, so
 * browsers must revalidate them instead of caching them for a year. Mirrors
 * the Cache-Control rules in vercel.json. Mounted before the generic static
 * handler, which would otherwise serve them with `maxAge: '1y'`.
 */
const revalidate = {
  index: false,
  redirect: false,
  setHeaders: (res: express.Response) => res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate'),
};
app.use('/assets/i18n', express.static(resolve(browserDistFolder, 'assets/i18n'), revalidate));
app.use('/assets/docs', express.static(resolve(browserDistFolder, 'assets/docs'), revalidate));

// Serve the remaining static files from /browser (hashed bundles, fonts, images)
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

// Explicitly serve assets
app.use('/assets', express.static(resolve(browserDistFolder, 'assets'), {
  maxAge: '1y',
}));

// Handle all other requests by rendering the Angular application
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);

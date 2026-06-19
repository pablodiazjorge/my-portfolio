import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Forwards requests to an external origin, preserving method, headers, and body.
 * Express strips the mount path from req.url, so /test-maker/foo → /foo.
 */
function createReverseProxy(targetBase: string) {
  const HOP_BY_HOP = new Set([
    'connection', 'keep-alive', 'transfer-encoding', 'host',
    'te', 'trailer', 'upgrade', 'proxy-authorization',
  ]);

  return async (req: express.Request, res: express.Response) => {
    try {
      const url = targetBase + req.url;

      // Filter out hop-by-hop headers
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        if (value && !HOP_BY_HOP.has(key.toLowerCase())) {
          headers[key] = Array.isArray(value) ? value.join(', ') : value;
        }
      }

      // Read body for non-GET/HEAD requests
      let body: Buffer | undefined;
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.from(chunk));
        }
        body = Buffer.concat(chunks);
      }

      const proxyRes = await fetch(url, {
        method: req.method,
        headers,
        body,
        redirect: 'manual',
      });

      // Forward status and headers
      res.status(proxyRes.status);
      proxyRes.headers.forEach((value, key) => {
        if (!HOP_BY_HOP.has(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      // Forward body
      const buffer = Buffer.from(await proxyRes.arrayBuffer());
      res.end(buffer);
    } catch (err: any) {
      console.error(`[proxy] ${targetBase}${req.url} → ${err.message}`);
      if (!res.headersSent) {
        res.status(502).send('Bad Gateway');
      }
    }
  };
}

// Proxy /test-maker/* → test-maker-five.vercel.app
app.use('/test-maker', createReverseProxy('https://test-maker-five.vercel.app'));

// Proxy /palaze/* → palaze-pablodiazjorge.netlify.app
app.use('/palaze', createReverseProxy('https://palaze-pablodiazjorge.netlify.app'));

// Serve static files from /browser
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
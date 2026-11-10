import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { behandle } from './server/api';

// Die /api-Routen laufen im selben Prozess wie der Vite-Server.
// Der API-Schlüssel wird nur hier (serverseitig) geladen und nie an den Browser gegeben.
function apiPlugin(): Plugin {
  return {
    name: 'spinnen-trainer-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        behandle(req, res).catch((fehler: unknown) => {
          console.error('[api] Unerwarteter Fehler:', fehler instanceof Error ? fehler.message : fehler);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
          }
          res.end(JSON.stringify({ fehler: 'Interner Fehler im lokalen Server.' }));
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const name of ['ANTHROPIC_API_KEY', 'KI_MODELL'] as const) {
    if (env[name] && !process.env[name]) process.env[name] = env[name];
  }
  return {
    plugins: [react(), apiPlugin()],
    server: { host: '127.0.0.1', port: 5199, strictPort: true },
  };
});

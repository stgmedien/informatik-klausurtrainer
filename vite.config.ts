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

const AUS_DATEI = 'SPINNEN_TRAINER_ENV_AUS_DATEI';

export default defineConfig(({ mode }) => {
  // Ändert sich .env.local, startet Vite im selben Prozess neu. Werte, die beim letzten Start
  // aus der Datei kamen, werden deshalb erst entfernt – sonst bliebe ein alter Schlüssel aktiv.
  for (const name of (process.env[AUS_DATEI] ?? '').split(',').filter(Boolean)) delete process.env[name];
  const env = loadEnv(mode, process.cwd(), '');
  const gesetzt: string[] = [];
  for (const name of ['ANTHROPIC_API_KEY', 'KI_MODELL'] as const) {
    if (env[name] && !process.env[name]) {
      process.env[name] = env[name];
      gesetzt.push(name);
    }
  }
  process.env[AUS_DATEI] = gesetzt.join(',');
  return {
    plugins: [react(), apiPlugin()],
    server: { host: '127.0.0.1', port: 5199, strictPort: true },
  };
});

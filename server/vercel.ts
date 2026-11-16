import type { IncomingMessage, ServerResponse } from 'node:http';
import { behandle } from './api.js';

/** Eine Vercel-Funktion für genau eine Route; der Verteiler ist derselbe wie im lokalen Vite-Server. */
export function route(pfad: string) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    req.url = pfad;
    try {
      await behandle(req, res);
    } catch (fehler) {
      console.error('[api]', fehler instanceof Error ? fehler.message : fehler);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify({ fehler: 'Interner Fehler auf dem Server.' }));
    }
  };
}

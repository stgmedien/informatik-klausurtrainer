import type { IncomingMessage, ServerResponse } from 'node:http';
import { KiFehler, kiVerfuegbar, modell } from './ki/klient';
import { gibHinweis, korrigiere } from './ki/rollen';
import { leseStand, schreibeStand } from './stand';

const MAX_BYTES = 5 * 1024 * 1024;

function sende(res: ServerResponse, status: number, daten: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(daten));
}

async function leseKoerper(req: IncomingMessage): Promise<unknown> {
  const teile: Buffer[] = [];
  let groesse = 0;
  for await (const teil of req) {
    const puffer = teil as Buffer;
    groesse += puffer.length;
    if (groesse > MAX_BYTES) throw new Error('Anfrage zu groß');
    teile.push(puffer);
  }
  const text = Buffer.concat(teile).toString('utf8');
  return text ? JSON.parse(text) : null;
}

async function kiRoute(req: IncomingMessage, res: ServerResponse, rolle: (koerper: unknown) => Promise<unknown>): Promise<void> {
  try {
    sende(res, 200, await rolle(await leseKoerper(req)));
  } catch (fehler) {
    if (fehler instanceof KiFehler) return sende(res, fehler.status, { fehler: fehler.message });
    throw fehler;
  }
}

/** Verteiler für alle /api-Routen. `req.url` ist bereits ohne das Präfix /api. */
export async function behandle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const pfad = (req.url ?? '/').split('?')[0];
  const methode = req.method ?? 'GET';

  if (pfad === '/stand' && methode === 'GET') {
    return sende(res, 200, { stand: await leseStand() });
  }
  if (pfad === '/stand' && methode === 'PUT') {
    const koerper = await leseKoerper(req);
    if (!koerper || typeof koerper !== 'object') return sende(res, 400, { fehler: 'Kein gültiger Lernstand.' });
    await schreibeStand(koerper);
    return sende(res, 200, { ok: true });
  }
  if (pfad === '/ki/status' && methode === 'GET') {
    return sende(res, 200, { verfuegbar: kiVerfuegbar(), modell: modell() });
  }
  if (pfad === '/ki/korrektur' && methode === 'POST') return kiRoute(req, res, korrigiere);
  if (pfad === '/ki/tutor' && methode === 'POST') return kiRoute(req, res, gibHinweis);

  return sende(res, 404, { fehler: `Unbekannte Route: ${methode} ${pfad}` });
}

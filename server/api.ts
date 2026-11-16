import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { KiFehler, kiVerfuegbar, modell } from './ki/klient.js';
import { diagnostiziere, gibHinweis, korrigiere } from './ki/rollen.js';
import { STAND_IM_BROWSER, leseStand, schreibeStand } from './stand.js';

const MAX_BYTES = 5 * 1024 * 1024;

function sende(res: ServerResponse, status: number, daten: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(daten));
}

async function leseKoerper(req: IncomingMessage): Promise<unknown> {
  // Auf Vercel ist der Körper schon gelesen und steht in req.body.
  const vorab = (req as IncomingMessage & { body?: unknown }).body;
  if (vorab !== undefined) {
    if (Buffer.isBuffer(vorab)) return vorab.length ? JSON.parse(vorab.toString('utf8')) : null;
    if (typeof vorab === 'string') return vorab ? JSON.parse(vorab) : null;
    return vorab;
  }
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

function hash(text: string): Buffer {
  return createHash('sha256').update(text).digest();
}

/** Ist KI_ZUGANGSCODE gesetzt (online), braucht jede KI-Anfrage diesen Code – sonst könnte jeder mit dem Link den Schlüssel nutzen. */
function zugangErlaubt(req: IncomingMessage): boolean {
  const soll = process.env.KI_ZUGANGSCODE;
  if (!soll) return true;
  const ist = req.headers['x-zugangscode'];
  return typeof ist === 'string' && timingSafeEqual(hash(ist.trim()), hash(soll));
}

async function kiRoute(req: IncomingMessage, res: ServerResponse, rolle: (koerper: unknown) => Promise<unknown>): Promise<void> {
  if (!zugangErlaubt(req)) return sende(res, 401, { fehler: 'Der Zugangscode für die KI fehlt oder ist falsch. Trage ihn unter Einstellungen ein.' });
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
    if (STAND_IM_BROWSER) return sende(res, 200, { stand: null, ort: 'browser' });
    return sende(res, 200, { stand: await leseStand(), ort: 'datei' });
  }
  if (pfad === '/stand' && methode === 'PUT') {
    if (STAND_IM_BROWSER) return sende(res, 200, { ok: true, ort: 'browser' });
    const koerper = await leseKoerper(req);
    if (!koerper || typeof koerper !== 'object') return sende(res, 400, { fehler: 'Kein gültiger Lernstand.' });
    await schreibeStand(koerper);
    return sende(res, 200, { ok: true });
  }
  if (pfad === '/ki/status' && methode === 'GET') {
    return sende(res, 200, { verfuegbar: kiVerfuegbar(), modell: modell(), codeNoetig: Boolean(process.env.KI_ZUGANGSCODE) });
  }
  if (pfad === '/ki/korrektur' && methode === 'POST') return kiRoute(req, res, korrigiere);
  if (pfad === '/ki/tutor' && methode === 'POST') return kiRoute(req, res, gibHinweis);
  if (pfad === '/ki/diagnose' && methode === 'POST') return kiRoute(req, res, diagnostiziere);

  return sende(res, 404, { fehler: `Unbekannte Route: ${methode} ${pfad}` });
}

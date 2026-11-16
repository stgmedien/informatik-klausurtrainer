import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';

const korrigiere = vi.fn(async () => ({ ok: true }));
vi.mock('../../server/ki/rollen', () => ({ korrigiere, gibHinweis: vi.fn(), diagnostiziere: vi.fn() }));

function anfrage(methode: string, url: string, koerper?: unknown, kopf: Record<string, string> = {}): IncomingMessage {
  const req = Readable.from(koerper === undefined ? [] : [Buffer.from(JSON.stringify(koerper))]) as unknown as IncomingMessage;
  Object.assign(req, { method: methode, url, headers: kopf });
  return req;
}

function antwort(): ServerResponse & { status: () => number; daten: () => unknown } {
  let text = '';
  const res = {
    statusCode: 200,
    headersSent: false,
    setHeader: () => undefined,
    end: (t: string) => {
      text = t;
    },
  } as unknown as ServerResponse;
  return Object.assign(res, { status: () => res.statusCode, daten: () => JSON.parse(text) });
}

async function lade() {
  vi.resetModules();
  return import('../../server/api');
}

afterEach(() => {
  vi.unstubAllEnvs();
  korrigiere.mockClear();
});

describe('API in der Online-Version', () => {
  it('speichert den Lernstand dort im Browser statt in einer Datei', async () => {
    vi.stubEnv('VERCEL', '1');
    const { behandle } = await lade();
    const res = antwort();
    await behandle(anfrage('GET', '/stand'), res);
    expect(res.daten()).toEqual({ stand: null, ort: 'browser' });
    const res2 = antwort();
    await behandle(anfrage('PUT', '/stand', { versuche: [] }), res2);
    expect(res2.daten()).toEqual({ ok: true, ort: 'browser' });
  });

  it('verlangt für die KI den Zugangscode, wenn einer gesetzt ist', async () => {
    vi.stubEnv('KI_ZUGANGSCODE', 'spinne42');
    const { behandle } = await lade();

    const status = antwort();
    await behandle(anfrage('GET', '/ki/status'), status);
    expect(status.daten()).toMatchObject({ codeNoetig: true });

    const ohne = antwort();
    await behandle(anfrage('POST', '/ki/korrektur', { a: 1 }), ohne);
    expect(ohne.status()).toBe(401);

    const falsch = antwort();
    await behandle(anfrage('POST', '/ki/korrektur', { a: 1 }, { 'x-zugangscode': 'spinne' }), falsch);
    expect(falsch.status()).toBe(401);
    expect(korrigiere).not.toHaveBeenCalled();

    const richtig = antwort();
    await behandle(anfrage('POST', '/ki/korrektur', { a: 1 }, { 'x-zugangscode': ' spinne42 ' }), richtig);
    expect(richtig.status()).toBe(200);
    expect(korrigiere).toHaveBeenCalledWith({ a: 1 });
  });

  it('lässt lokal ohne Zugangscode durch und nimmt einen vorab gelesenen Körper an (Vercel)', async () => {
    const { behandle } = await lade();
    const req = anfrage('POST', '/ki/korrektur');
    Object.assign(req, { body: { b: 2 } });
    const res = antwort();
    await behandle(req, res);
    expect(res.status()).toBe(200);
    expect(korrigiere).toHaveBeenCalledWith({ b: 2 });
  });
});

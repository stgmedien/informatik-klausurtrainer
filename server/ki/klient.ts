import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';

export class KiFehler extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let klient: Anthropic | null = null;

export function kiVerfuegbar(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function modell(): string {
  return process.env.KI_MODELL || 'claude-opus-5-5';
}

function holeKlient(): Anthropic {
  if (!kiVerfuegbar()) throw new KiFehler(503, 'Es ist kein API-Schlüssel eingerichtet.');
  klient ??= new Anthropic();
  return klient;
}

/** Übersetzt SDK-Fehler in Meldungen, die in der App angezeigt werden können. */
function uebersetze(fehler: unknown): KiFehler {
  if (fehler instanceof KiFehler) return fehler;
  if (fehler instanceof Anthropic.AuthenticationError) return new KiFehler(401, 'Der API-Schlüssel wurde nicht akzeptiert. Prüfe den Eintrag in .env.local.');
  if (fehler instanceof Anthropic.PermissionDeniedError) return new KiFehler(403, 'Der API-Schlüssel hat keinen Zugriff auf dieses Modell.');
  if (fehler instanceof Anthropic.NotFoundError) return new KiFehler(404, `Das Modell „${modell()}“ wurde nicht gefunden. Prüfe KI_MODELL in .env.local.`);
  if (fehler instanceof Anthropic.RateLimitError) return new KiFehler(429, 'Zu viele Anfragen in kurzer Zeit. Warte einen Moment und versuche es noch einmal.');
  if (fehler instanceof Anthropic.BadRequestError) return new KiFehler(400, 'Die KI konnte die Anfrage nicht verarbeiten.');
  if (fehler instanceof Anthropic.APIConnectionError) return new KiFehler(503, 'Keine Verbindung zur KI. Besteht eine Internetverbindung?');
  if (fehler instanceof Anthropic.APIError) return new KiFehler(fehler.status ?? 502, 'Die KI ist gerade nicht erreichbar. Versuche es später noch einmal.');
  return new KiFehler(500, 'Unerwarteter Fehler bei der KI-Anfrage.');
}

/** Serverseitige Ausweichmodelle gibt es nur für die aktuellen Opus-, Sonnet- und Fable-Modelle. */
function unterstuetztAusweichmodell(name: string): boolean {
  return /^claude-(opus-5|sonnet-5-5|fable-5)/.test(name);
}

/**
 * Eine Anfrage mit strukturierter Antwort. Der Systemtext bleibt je Rolle bytegleich,
 * damit er zwischengespeichert werden kann; alles Veränderliche steht in der Nutzernachricht.
 */
export async function frage<Schema extends z.ZodType>(opt: {
  schema: Schema;
  system: string;
  nachricht: string;
  aufwand: 'low' | 'medium' | 'high';
}): Promise<z.infer<Schema>> {
  const name = modell();
  try {
    const antwort = await holeKlient().beta.messages.parse({
      model: name,
      max_tokens: 16000,
      system: [{ type: 'text', text: opt.system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: opt.nachricht }],
      output_config: { effort: opt.aufwand, format: betaZodOutputFormat(opt.schema) },
      ...(unterstuetztAusweichmodell(name) ? { betas: ['server-side-fallback-2026-07-01' as const], fallbacks: 'default' as const } : {}),
    });
    if (antwort.stop_reason === 'refusal') throw new KiFehler(422, 'Die KI hat diese Anfrage abgelehnt. Nutze stattdessen die Selbstkontrolle.');
    if (antwort.stop_reason === 'max_tokens' || !antwort.parsed_output) throw new KiFehler(502, 'Die Antwort der KI war unvollständig. Versuche es noch einmal.');
    return antwort.parsed_output as z.infer<Schema>;
  } catch (fehler) {
    throw uebersetze(fehler);
  }
}

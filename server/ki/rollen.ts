import { z } from 'zod';
import { KiFehler, frage, modell } from './klient';
import { SYSTEM_KORREKTUR, SYSTEM_TUTOR, nachrichtKorrektur, nachrichtTutor } from './prompts';
import type { KorrekturErgebnis, TutorErgebnis } from './typen';

const OperatorSchema = z.object({ name: z.string(), definition: z.string(), erwartet: z.string() });

const KorrekturAnfrageSchema = z.object({
  stellung: z.string().min(1).max(8000),
  operator: OperatorSchema.optional(),
  material: z.string().max(12000).optional(),
  kriterien: z.array(z.object({ id: z.string(), text: z.string(), punkte: z.number() })).min(1).max(20),
  musterantwort: z.string().max(8000),
  fachbegriffe: z.array(z.string()).max(30).optional(),
  wortlaut: z.array(z.object({ titel: z.string(), text: z.string() })).max(30).optional(),
  antwort: z.string().min(1).max(12000),
});

const TutorAnfrageSchema = z.object({
  stellung: z.string().min(1).max(8000),
  operator: OperatorSchema.optional(),
  material: z.string().max(12000).optional(),
  entwurf: z.string().max(12000),
  stufe: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  befunde: z.array(z.string()).max(30).optional(),
  bisherigeHinweise: z.array(z.string()).max(10).optional(),
});

// Antwortformate der KI. Punkte stehen bewusst nicht darin: Die App rechnet sie aus den Urteilen aus.
const KorrekturAntwort = z.object({
  kriterien: z.array(
    z.object({
      id: z.string().describe('id des Kriteriums aus dem Erwartungshorizont'),
      urteil: z.enum(['erfuellt', 'teilweise', 'nicht']),
      begruendung: z.string().describe('Ein Satz: was dazu in der Antwort steht oder was fehlt'),
    }),
  ),
  operator_getroffen: z.boolean().describe('Leistet die Antwort, was der Operator verlangt?'),
  operator_hinweis: z.string().describe('Ein Satz zum Operator'),
  fachsprache: z.string().describe('Ein bis zwei Sätze zur Verwendung der Fachbegriffe'),
  sprachhinweise: z.array(z.string()).describe('Höchstens drei Hinweise zu Rechtschreibung, Grammatik oder Ausdruck; leer, wenn nichts auffällt'),
  naechster_schritt: z.string().describe('Der eine Tipp, der die Antwort am meisten verbessert'),
});

const TutorAntwort = z.object({
  hinweis: z.string().describe('Genau ein Hinweis der verlangten Stufe, höchstens drei Sätze, ohne Lösung'),
});

function pruefe<S extends z.ZodType>(schema: S, koerper: unknown): z.infer<S> {
  const ergebnis = schema.safeParse(koerper);
  if (!ergebnis.success) throw new KiFehler(400, 'Die Anfrage an die KI war unvollständig.');
  return ergebnis.data;
}

export async function korrigiere(koerper: unknown): Promise<KorrekturErgebnis> {
  const anfrage = pruefe(KorrekturAnfrageSchema, koerper);
  const roh = await frage({ schema: KorrekturAntwort, system: SYSTEM_KORREKTUR, nachricht: nachrichtKorrektur(anfrage), aufwand: 'medium' });

  // Jedes erwartete Kriterium genau einmal; was die KI ausgelassen hat, gilt als nicht erfüllt.
  const nachId = new Map(roh.kriterien.map((k) => [k.id, k]));
  return {
    kriterien: anfrage.kriterien.map((k) => {
      const urteil = nachId.get(k.id);
      return urteil ? { id: k.id, urteil: urteil.urteil, begruendung: urteil.begruendung } : { id: k.id, urteil: 'nicht' as const, begruendung: 'Dieses Kriterium wurde nicht bewertet.' };
    }),
    operatorGetroffen: roh.operator_getroffen,
    operatorHinweis: roh.operator_hinweis,
    fachsprache: roh.fachsprache,
    sprachhinweise: roh.sprachhinweise.slice(0, 3),
    naechsterSchritt: roh.naechster_schritt,
    modell: modell(),
  };
}

export async function gibHinweis(koerper: unknown): Promise<TutorErgebnis> {
  const anfrage = pruefe(TutorAnfrageSchema, koerper);
  const roh = await frage({ schema: TutorAntwort, system: SYSTEM_TUTOR, nachricht: nachrichtTutor(anfrage), aufwand: 'low' });
  return { hinweis: roh.hinweis.trim(), modell: modell() };
}

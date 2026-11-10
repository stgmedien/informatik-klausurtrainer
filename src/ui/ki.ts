import type { DiagnoseAnfrage, DiagnoseErgebnis, KorrekturAnfrage, KorrekturErgebnis, TutorAnfrage, TutorErgebnis } from '../../server/ki/typen';

async function sende<T>(pfad: string, koerper: unknown): Promise<T> {
  let antwort: Response;
  try {
    antwort = await fetch(pfad, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(koerper) });
  } catch {
    throw new Error('Der lokale Server antwortet nicht. Läuft „npm run dev“ noch?');
  }
  const daten = (await antwort.json().catch(() => null)) as (T & { fehler?: string }) | null;
  if (!antwort.ok || !daten) throw new Error(daten?.fehler ?? 'Die KI-Anfrage ist fehlgeschlagen.');
  return daten;
}

export function korrigiere(anfrage: KorrekturAnfrage): Promise<KorrekturErgebnis> {
  return sende<KorrekturErgebnis>('/api/ki/korrektur', anfrage);
}

export function frageTutor(anfrage: TutorAnfrage): Promise<TutorErgebnis> {
  return sende<TutorErgebnis>('/api/ki/tutor', anfrage);
}

export function diagnostiziere(anfrage: DiagnoseAnfrage): Promise<DiagnoseErgebnis> {
  return sende<DiagnoseErgebnis>('/api/ki/diagnose', anfrage);
}

import type { DiagnoseAnfrage, DiagnoseErgebnis, KorrekturAnfrage, KorrekturErgebnis, TutorAnfrage, TutorErgebnis } from '../../server/ki/typen';

const CODE = 'spinnen-trainer-zugangscode';

/** Zugangscode für die KI in der Online-Version; bleibt nur in diesem Browser. */
export function leseZugangscode(): string {
  try {
    return localStorage.getItem(CODE) ?? '';
  } catch {
    return '';
  }
}

export function schreibeZugangscode(code: string): void {
  try {
    if (code.trim()) localStorage.setItem(CODE, code.trim());
    else localStorage.removeItem(CODE);
  } catch {
    // Ohne Browser-Speicher muss der Code nach jedem Neuladen neu eingegeben werden.
  }
}

async function sende<T>(pfad: string, koerper: unknown): Promise<T> {
  let antwort: Response;
  try {
    antwort = await fetch(pfad, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Zugangscode': leseZugangscode() },
      body: JSON.stringify(koerper),
    });
  } catch {
    throw new Error('Der Server antwortet nicht. Besteht eine Internetverbindung?');
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

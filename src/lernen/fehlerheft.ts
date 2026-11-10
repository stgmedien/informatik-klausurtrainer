// Das Fehlerheft wird aus den Versuchen abgeleitet: Jede Aufgabe, die einmal nicht geklappt hat,
// steht darin – bis sie an einem späteren Tag wieder richtig gelöst wurde.
import { aufgabe } from '../inhalte';
import { type Lernstand, type Versuch, istRichtig, plusTage } from './stand';

export interface FehlerEintrag {
  aufgabe: string;
  status: 'offen' | 'gefestigt';
  letzter: Versuch;
  fehlversuche: number;
  /** Fehlermuster aller Fehlversuche dieser Aufgabe. */
  muster: string[];
  /** Wiedervorlage ab diesem Tag. */
  faelligAm: string | null;
}

export function fehlerheft(stand: Lernstand): FehlerEintrag[] {
  const nachAufgabe = new Map<string, Versuch[]>();
  for (const v of stand.versuche) {
    if (!aufgabe(v.aufgabe)) continue; // erzeugte Logik-Übungen haben kein festes Gegenstück
    nachAufgabe.set(v.aufgabe, [...(nachAufgabe.get(v.aufgabe) ?? []), v]);
  }
  const eintraege: FehlerEintrag[] = [];
  for (const [id, versuche] of nachAufgabe) {
    const fehl = versuche.filter((v) => !istRichtig(v));
    if (fehl.length === 0) continue;
    const letzterFehl = fehl[fehl.length - 1];
    const letzter = versuche[versuche.length - 1];
    // Gefestigt ist ein Fehler erst, wenn die Aufgabe an einem späteren Tag ohne Hinweis richtig gelöst wurde.
    const spaeterRichtig = versuche.some((v) => v.zeit > letzterFehl.zeit && v.tag > letzterFehl.tag && istRichtig(v) && v.hinweise === 0);
    const status = spaeterRichtig ? 'gefestigt' : 'offen';
    const nurAmSelbenTag = !spaeterRichtig && istRichtig(letzter);
    eintraege.push({
      aufgabe: id,
      status,
      letzter,
      fehlversuche: fehl.length,
      muster: [...new Set(fehl.flatMap((v) => v.muster ?? []))],
      // Wiedervorlage: am Tag nach dem Fehler; wurde er am selben Tag schon behoben, nach drei Tagen.
      faelligAm: status === 'gefestigt' ? null : plusTage(letzterFehl.tag, nurAmSelbenTag ? 3 : 1),
    });
  }
  return eintraege.sort((a, b) => (a.status === b.status ? b.letzter.zeit.localeCompare(a.letzter.zeit) : a.status === 'offen' ? -1 : 1));
}

export function faelligeFehler(stand: Lernstand, tag: string): FehlerEintrag[] {
  return fehlerheft(stand).filter((e) => e.faelligAm !== null && e.faelligAm <= tag && e.letzter.tag < tag);
}

export function musterStatistik(stand: Lernstand): { id: string; anzahl: number }[] {
  const zahl = new Map<string, number>();
  for (const v of stand.versuche) {
    if (istRichtig(v)) continue;
    for (const m of v.muster ?? []) zahl.set(m, (zahl.get(m) ?? 0) + 1);
  }
  return [...zahl].map(([id, anzahl]) => ({ id, anzahl })).sort((a, b) => b.anzahl - a.anzahl);
}

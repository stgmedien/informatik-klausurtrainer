import type { Bereich } from '../inhalte/typen';

/** Wo sich die App gerade befindet. Einfache Navigation ohne Router. */
export type Ansicht =
  | { seite: 'heute' }
  | { seite: 'einheit'; id: string }
  | { seite: 'wiederholung' }
  | { seite: 'kann' }
  | { seite: 'ueben'; bereich?: Bereich; kann?: string }
  | { seite: 'aufgabe'; id: string; zurueck: Ansicht }
  | { seite: 'lektion'; id: string; zurueck: Ansicht }
  | { seite: 'logik'; modus: 'auswertung' | 'tabelle'; stufe: 1 | 2 | 3; zurueck: Ansicht }
  | { seite: 'werkstatt' }
  | { seite: 'fehlerheft' }
  | { seite: 'klausuren' }
  | { seite: 'klausur'; id: string }
  | { seite: 'druck'; id: string }
  | { seite: 'spick' }
  | { seite: 'einstellungen' };

export type GeheZu = (ansicht: Ansicht) => void;

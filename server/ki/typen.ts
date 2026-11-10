// Gemeinsame Datentypen für die KI-Routen. Der Browser importiert sie nur als Typen.

export interface KriteriumAnfrage {
  id: string;
  text: string;
  punkte: number;
}

export interface KorrekturAnfrage {
  stellung: string;
  operator?: { name: string; definition: string; erwartet: string };
  /** Material der Aufgabe als Text (Quelltext, Klassendiagramm in Worten …). */
  material?: string;
  kriterien: KriteriumAnfrage[];
  musterantwort: string;
  fachbegriffe?: string[];
  /** Formulierungen aus dem eigenen Heft; sie haben Vorrang vor der Musterantwort. */
  wortlaut?: { titel: string; text: string }[];
  antwort: string;
}

export type Urteil = 'erfuellt' | 'teilweise' | 'nicht';

export interface KorrekturErgebnis {
  kriterien: { id: string; urteil: Urteil; begruendung: string }[];
  operatorGetroffen: boolean;
  operatorHinweis: string;
  fachsprache: string;
  sprachhinweise: string[];
  naechsterSchritt: string;
  modell: string;
}

export interface TutorAnfrage {
  stellung: string;
  operator?: { name: string; definition: string; erwartet: string };
  material?: string;
  /** Bisheriger Entwurf der Antwort (kann leer sein). */
  entwurf: string;
  /** 1 = Denkanstoß, 2 = Konzept, 3 = nächster Teilschritt. */
  stufe: 1 | 2 | 3;
  /** Automatisch ermittelte Befunde, z.B. Compilermeldungen oder Testergebnisse. */
  befunde?: string[];
  bisherigeHinweise?: string[];
}

export interface TutorErgebnis {
  hinweis: string;
  modell: string;
}

export interface DiagnoseAnfrage {
  stellung: string;
  quelltext: string;
  /** Automatisch ermittelte Befunde: Compilermeldungen, Testergebnisse, erkannte Muster. */
  befunde: string[];
  /** Erlaubte Fehlermuster (Katalog), aus denen die KI auswählt. */
  katalog: { id: string; titel: string }[];
}

export interface DiagnoseErgebnis {
  muster: string[];
  erklaerung: string;
  woranErkennen: string;
  naechsterSchritt: string;
  modell: string;
}

export interface KiFehlerAntwort {
  fehler: string;
}

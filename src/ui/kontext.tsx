import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { type Lernstand, ergaenzeStand } from '../lernen/stand';
import { leseZugangscode, schreibeZugangscode } from './ki';

export interface KiStatus {
  /** KI ist nutzbar: Schlüssel eingerichtet und – falls verlangt – Zugangscode eingetragen. */
  verfuegbar: boolean;
  /** Der Server hat einen Schlüssel. */
  eingerichtet: boolean;
  /** Der Server verlangt einen Zugangscode (Online-Version). */
  codeNoetig: boolean;
  modell: string;
}

/** Wo der Lernstand liegt: lokal in daten/lernstand.json oder (online) nur in diesem Browser. */
export type SpeicherOrt = 'datei' | 'browser';

interface Kontext {
  stand: Lernstand;
  aendere: (fn: (alt: Lernstand) => Lernstand) => void;
  ki: KiStatus;
  speicherOrt: SpeicherOrt;
  speicherFehler: string | null;
  setzeZugangscode: (code: string) => void;
}

const StandKontext = createContext<Kontext | null>(null);
const LOKAL = 'spinnen-trainer-stand';

function leseLokal(): unknown {
  try {
    return JSON.parse(localStorage.getItem(LOKAL) ?? 'null');
  } catch {
    return null;
  }
}

export function StandAnbieter({ children }: { children: ReactNode }) {
  const [stand, setStand] = useState<Lernstand | null>(null);
  const [speicherOrt, setSpeicherOrt] = useState<SpeicherOrt>('datei');
  const [server, setServer] = useState({ eingerichtet: false, codeNoetig: false, modell: '' });
  const [code, setCode] = useState(leseZugangscode);
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null);
  const geladen = useRef(false);

  useEffect(() => {
    let aktiv = true;
    fetch('/api/stand')
      .then((r) => r.json())
      .then((d: { stand: unknown; ort?: SpeicherOrt }) => {
        if (d.ort === 'browser') {
          if (aktiv) setSpeicherOrt('browser');
          return leseLokal();
        }
        return d.stand ?? leseLokal();
      })
      .catch(() => {
        // Ohne Server (z.B. reine statische Seite) bleibt nur der Browser-Speicher.
        if (aktiv) setSpeicherOrt('browser');
        return leseLokal();
      })
      .then((roh) => {
        if (aktiv) setStand(ergaenzeStand(roh));
      });
    fetch('/api/ki/status')
      .then((r) => r.json())
      .then((d: { verfuegbar: boolean; modell: string; codeNoetig?: boolean }) => {
        if (aktiv) setServer({ eingerichtet: d.verfuegbar, codeNoetig: Boolean(d.codeNoetig), modell: d.modell });
      })
      .catch(() => undefined);
    return () => {
      aktiv = false;
    };
  }, []);

  // Jede Änderung landet im Browser-Speicher und – lokal – kurz verzögert in daten/lernstand.json.
  useEffect(() => {
    if (!stand) return;
    if (!geladen.current) {
      geladen.current = true;
      return;
    }
    try {
      localStorage.setItem(LOKAL, JSON.stringify(stand));
      if (speicherOrt === 'browser') setSpeicherFehler(null);
    } catch {
      if (speicherOrt === 'browser') setSpeicherFehler('Der Browser erlaubt kein Speichern (privates Fenster?). Dein Fortschritt geht beim Schließen verloren.');
    }
    if (speicherOrt === 'browser') return;
    const timer = setTimeout(() => {
      fetch('/api/stand', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stand) })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          setSpeicherFehler(null);
        })
        .catch(() => setSpeicherFehler('Der Lernstand konnte nicht in die Datei geschrieben werden. Läuft „npm run dev“ noch?'));
    }, 300);
    return () => clearTimeout(timer);
  }, [stand, speicherOrt]);

  const aendere = useCallback((fn: (alt: Lernstand) => Lernstand) => {
    setStand((alt) => (alt ? fn(alt) : alt));
  }, []);

  const setzeZugangscode = useCallback((neu: string) => {
    schreibeZugangscode(neu);
    setCode(neu.trim());
  }, []);

  const ki: KiStatus = {
    ...server,
    verfuegbar: server.eingerichtet && (!server.codeNoetig || code !== ''),
  };

  if (!stand) return <p className="laden">Lernstand wird geladen …</p>;
  return <StandKontext.Provider value={{ stand, aendere, ki, speicherOrt, speicherFehler, setzeZugangscode }}>{children}</StandKontext.Provider>;
}

export function useStand(): Kontext {
  const kontext = useContext(StandKontext);
  if (!kontext) throw new Error('useStand außerhalb von StandAnbieter');
  return kontext;
}

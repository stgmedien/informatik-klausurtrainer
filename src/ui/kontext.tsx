import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { type Lernstand, ergaenzeStand } from '../lernen/stand';

export interface KiStatus {
  verfuegbar: boolean;
  modell: string;
}

interface Kontext {
  stand: Lernstand;
  aendere: (fn: (alt: Lernstand) => Lernstand) => void;
  ki: KiStatus;
  speicherFehler: string | null;
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
  const [ki, setKi] = useState<KiStatus>({ verfuegbar: false, modell: '' });
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null);
  const geladen = useRef(false);

  useEffect(() => {
    let aktiv = true;
    fetch('/api/stand')
      .then((r) => r.json())
      .then((d: { stand: unknown }) => d.stand ?? leseLokal())
      .catch(() => leseLokal())
      .then((roh) => {
        if (aktiv) setStand(ergaenzeStand(roh));
      });
    fetch('/api/ki/status')
      .then((r) => r.json())
      .then((d: KiStatus) => aktiv && setKi(d))
      .catch(() => undefined);
    return () => {
      aktiv = false;
    };
  }, []);

  // Jede Änderung wird kurz verzögert in die Datei daten/lernstand.json geschrieben.
  useEffect(() => {
    if (!stand) return;
    if (!geladen.current) {
      geladen.current = true;
      return;
    }
    try {
      localStorage.setItem(LOKAL, JSON.stringify(stand));
    } catch {
      // Der Browser-Speicher ist nur eine Reserve.
    }
    const timer = setTimeout(() => {
      fetch('/api/stand', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stand) })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          setSpeicherFehler(null);
        })
        .catch(() => setSpeicherFehler('Der Lernstand konnte nicht in die Datei geschrieben werden. Läuft „npm run dev“ noch?'));
    }, 300);
    return () => clearTimeout(timer);
  }, [stand]);

  const aendere = useCallback((fn: (alt: Lernstand) => Lernstand) => {
    setStand((alt) => (alt ? fn(alt) : alt));
  }, []);

  if (!stand) return <p className="laden">Lernstand wird geladen …</p>;
  return <StandKontext.Provider value={{ stand, aendere, ki, speicherFehler }}>{children}</StandKontext.Provider>;
}

export function useStand(): Kontext {
  const kontext = useContext(StandKontext);
  if (!kontext) throw new Error('useStand außerhalb von StandAnbieter');
  return kontext;
}

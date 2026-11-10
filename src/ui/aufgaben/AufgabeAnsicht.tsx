import { useRef, useState } from 'react';
import { kannItem, operator } from '../../inhalte';
import type { Aufgabe } from '../../inhalte/typen';
import { tutorGrunddaten } from '../../lernen/korrektur';
import { BESTANDEN_AB, heute, verbuche } from '../../lernen/stand';
import { Markdown } from '../Markdown';
import { MaterialAnsicht } from '../bausteine/MaterialAnsicht';
import { punkteText } from '../hilfen';
import { frageTutor } from '../ki';
import { useStand } from '../kontext';
import { Freitext } from './Freitext';
import { KlassenModellieren, StruktogrammZeichnen } from './Modellieren';
import { Programmieren } from './Programmieren';
import { ZeilenOrdnen } from './ZeilenOrdnen';
import { Vorhersage } from './Vorhersage';
import { type Abgabe, Auswahl, Luecke, Reihenfolge, Zuordnen } from './einfach';
import { AuswertungAufgabe, WahrheitstabelleAufgabe } from './logik';
import { KlassenLesen } from './weitere';

interface KoerperProps {
  aufgabe: Aufgabe;
  durchgang: number;
  fertig: boolean;
  onAbgabe: (a: Abgabe) => void;
  onEntwurf: (text: string) => void;
}

function Koerper({ aufgabe, durchgang, fertig, onAbgabe, onEntwurf }: KoerperProps) {
  const gemeinsam = { durchgang, fertig, onAbgabe, onEntwurf };
  switch (aufgabe.typ) {
    case 'auswahl':
      return <Auswahl aufgabe={aufgabe} {...gemeinsam} />;
    case 'zuordnen':
      return <Zuordnen aufgabe={aufgabe} {...gemeinsam} />;
    case 'reihenfolge':
      return <Reihenfolge aufgabe={aufgabe} {...gemeinsam} />;
    case 'luecke':
      return <Luecke aufgabe={aufgabe} {...gemeinsam} />;
    case 'wahrheitstabelle':
      return <WahrheitstabelleAufgabe aufgabe={aufgabe} {...gemeinsam} />;
    case 'auswertung':
      return <AuswertungAufgabe aufgabe={aufgabe} {...gemeinsam} />;
    case 'klassen-lesen':
      return <KlassenLesen aufgabe={aufgabe} {...gemeinsam} />;
    case 'freitext':
      return <Freitext aufgabe={aufgabe} {...gemeinsam} />;
    case 'vorhersage':
      return <Vorhersage aufgabe={aufgabe} {...gemeinsam} />;
    case 'programmieren':
      return <Programmieren aufgabe={aufgabe} {...gemeinsam} />;
    case 'zeilen-ordnen':
      return <ZeilenOrdnen aufgabe={aufgabe} {...gemeinsam} />;
    case 'struktogramm-zeichnen':
      return <StruktogrammZeichnen aufgabe={aufgabe} {...gemeinsam} />;
    case 'klassen-modellieren':
      return <KlassenModellieren aufgabe={aufgabe} {...gemeinsam} />;
  }
}

interface Props {
  aufgabe: Aufgabe;
  onWeiter?: () => void;
  weiterText?: string;
  /** false: Der Versuch wird nicht im Lernstand verbucht (z.B. Vorschau). */
  verbuchen?: boolean;
}

export function AufgabeAnsicht({ aufgabe, onWeiter, weiterText = 'Weiter', verbuchen = true }: Props) {
  const { aendere, ki } = useStand();
  const [durchgang, setDurchgang] = useState(0);
  // Zahl der aufgedeckten vorformulierten Hinweise (0–3).
  const [stufen, setStufen] = useState(0);
  const [tutorHinweise, setTutorHinweise] = useState<string[]>([]);
  const [tutorLaedt, setTutorLaedt] = useState(false);
  const [tutorFehler, setTutorFehler] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<Abgabe | null>(null);
  const entwurf = useRef('');
  const op = operator(aufgabe.operator);
  const fertig = ergebnis !== null;
  const hinweise = stufen + tutorHinweise.length;
  // Der Tutor bezieht sich auf einen Entwurf; den gibt es bisher bei Freitextaufgaben.
  const tutorMoeglich = ki.verfuegbar && (aufgabe.typ === 'freitext' || aufgabe.typ === 'programmieren');

  const tutor = async () => {
    setTutorLaedt(true);
    setTutorFehler(null);
    try {
      const antwort = await frageTutor({
        ...tutorGrunddaten(aufgabe),
        entwurf: entwurf.current,
        stufe: Math.min(3, tutorHinweise.length + 1) as 1 | 2 | 3,
        bisherigeHinweise: [...aufgabe.hinweise.slice(0, stufen), ...tutorHinweise],
      });
      setTutorHinweise((alt) => [...alt, antwort.hinweis]);
    } catch (e) {
      setTutorFehler(e instanceof Error ? e.message : 'Der Tutor ist gerade nicht erreichbar.');
    } finally {
      setTutorLaedt(false);
    }
  };

  const abgabe = (a: Abgabe) => {
    setErgebnis(a);
    if (!verbuchen) return;
    const jetzt = new Date();
    aendere((s) =>
      verbuche(s, {
        id: `${jetzt.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
        aufgabe: aufgabe.id,
        kann: aufgabe.kann,
        zeit: jetzt.toISOString(),
        tag: heute(jetzt),
        punkte: a.punkte,
        max: a.max,
        quelle: a.quelle,
        hinweise,
        klausurnah: Boolean(aufgabe.klausurnah),
        ...(a.muster?.length ? { muster: a.muster } : {}),
      }),
    );
  };

  const nochmal = () => {
    setErgebnis(null);
    setStufen(0);
    setTutorHinweise([]);
    setTutorFehler(null);
    entwurf.current = '';
    setDurchgang(durchgang + 1);
  };

  const quote = ergebnis ? ergebnis.punkte / ergebnis.max : 0;
  const stufe = quote >= BESTANDEN_AB ? 'gut' : quote >= 0.5 ? 'mittel' : 'schwach';

  return (
    <article className="aufgabe">
      <header className="aufgabe-kopf">
        <h2>{aufgabe.titel}</h2>
        <div className="marken">
          {aufgabe.klausurnah && <span className="marke klausur">Klausurformat</span>}
          <span className="marke">{aufgabe.punkte} P.</span>
          <span className="marke">ca. {aufgabe.minuten} min</span>
        </div>
      </header>
      {op && (
        <p className="operator-hinweis">
          Operator <strong>{op.name}</strong> (Anforderungsbereich {op.afb}): {op.erwartet}
        </p>
      )}
      <Markdown text={aufgabe.stellung} klasse="stellung" />
      {aufgabe.material?.map((m, i) => (
        <MaterialAnsicht key={i} material={m} />
      ))}

      <Koerper
        key={durchgang}
        aufgabe={aufgabe}
        durchgang={durchgang}
        fertig={fertig}
        onAbgabe={abgabe}
        onEntwurf={(text) => {
          entwurf.current = text;
        }}
      />

      {!fertig && (
        <div className="hinweise">
          {aufgabe.hinweise.slice(0, stufen).map((h, i) => (
            <p key={i} className="hinweis">
              <strong>Hinweis {i + 1}:</strong> {h}
            </p>
          ))}
          {tutorHinweise.map((h, i) => (
            <p key={`t${i}`} className="hinweis tutor">
              <strong>Tutor:</strong> {h}
            </p>
          ))}
          {tutorFehler && (
            <p className="meldung falsch" role="alert">
              {tutorFehler}
            </p>
          )}
          <div className="knopfreihe">
            {stufen < 3 && (
              <button className="knopf leise" onClick={() => setStufen(stufen + 1)}>
                {stufen === 0 ? 'Ich hänge fest – Hinweis zeigen' : `Noch ein Hinweis (${stufen + 1} von 3)`}
              </button>
            )}
            {tutorMoeglich && (
              <button className="knopf leise" onClick={tutor} disabled={tutorLaedt}>
                {tutorLaedt ? 'Tutor liest deinen Entwurf …' : 'Tutor zu meinem Entwurf fragen'}
              </button>
            )}
          </div>
        </div>
      )}

      {ergebnis && (
        <div className={`ergebnis ${stufe}`} role="status">
          <strong>{punkteText(ergebnis.punkte, ergebnis.max)}</strong>
          {ergebnis.quelle === 'selbst' && <span> · eigene Einschätzung</span>}
          {ergebnis.quelle === 'ki' && <span> · Einschätzung der KI</span>}
          {hinweise > 0 && quote >= BESTANDEN_AB && <span> · mit Hinweis gelöst: zählt als geübt, noch nicht als sicher</span>}
          {quote < BESTANDEN_AB && <span> · kommt als Wiederholung zurück</span>}
          <div className="ergebnis-ziele">
            Lernziel: {aufgabe.kann.map((id) => kannItem(id)?.kurz ?? id).join(' · ')}
          </div>
        </div>
      )}

      {fertig && (
        <footer className="aufgabe-fuss">
          <button className="knopf leise" onClick={nochmal}>
            Nochmal versuchen
          </button>
          {onWeiter && (
            <button className="knopf primaer" onClick={onWeiter} autoFocus>
              {weiterText}
            </button>
          )}
        </footer>
      )}
    </article>
  );
}

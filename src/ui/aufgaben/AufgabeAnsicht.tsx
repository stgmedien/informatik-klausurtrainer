import { useState } from 'react';
import { kannItem, operator } from '../../inhalte';
import type { Aufgabe } from '../../inhalte/typen';
import { BESTANDEN_AB, heute, verbuche } from '../../lernen/stand';
import { Markdown } from '../Markdown';
import { MaterialAnsicht } from '../bausteine/MaterialAnsicht';
import { punkteText } from '../hilfen';
import { useStand } from '../kontext';
import { type Abgabe, Auswahl, Luecke, Reihenfolge, Zuordnen } from './einfach';
import { AuswertungAufgabe, WahrheitstabelleAufgabe } from './logik';
import { Freitext, KlassenLesen } from './weitere';

function Koerper({ aufgabe, durchgang, fertig, onAbgabe }: { aufgabe: Aufgabe; durchgang: number; fertig: boolean; onAbgabe: (a: Abgabe) => void }) {
  const gemeinsam = { durchgang, fertig, onAbgabe };
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
  const { aendere } = useStand();
  const [durchgang, setDurchgang] = useState(0);
  const [hinweise, setHinweise] = useState(0);
  const [ergebnis, setErgebnis] = useState<Abgabe | null>(null);
  const op = operator(aufgabe.operator);
  const fertig = ergebnis !== null;

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
      }),
    );
  };

  const nochmal = () => {
    setErgebnis(null);
    setHinweise(0);
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

      <Koerper key={durchgang} aufgabe={aufgabe} durchgang={durchgang} fertig={fertig} onAbgabe={abgabe} />

      {!fertig && (
        <div className="hinweise">
          {aufgabe.hinweise.slice(0, hinweise).map((h, i) => (
            <p key={i} className="hinweis">
              <strong>Hinweis {i + 1}:</strong> {h}
            </p>
          ))}
          {hinweise < 3 && (
            <button className="knopf leise" onClick={() => setHinweise(hinweise + 1)}>
              {hinweise === 0 ? 'Ich hänge fest – Hinweis zeigen' : `Noch ein Hinweis (${hinweise + 1} von 3)`}
            </button>
          )}
        </div>
      )}

      {ergebnis && (
        <div className={`ergebnis ${stufe}`} role="status">
          <strong>{punkteText(ergebnis.punkte, ergebnis.max)}</strong>
          {ergebnis.quelle === 'selbst' && <span> · eigene Einschätzung</span>}
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

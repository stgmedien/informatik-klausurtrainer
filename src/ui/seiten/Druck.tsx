import { useMemo } from 'react';
import { parseLogik, variablen, wahrheitstabelle, formatiereLogik } from '../../engine/logik';
import { aufgabe as findeAufgabe } from '../../inhalte';
import { probeklausur } from '../../inhalte/klausuren';
import type { Aufgabe } from '../../inhalte/typen';
import { baueWelt, uebersetze } from '../../lernen/ausfuehren';
import { eintraegeKlassenLesen, zeilenDerLoesung } from '../../lernen/bewertung';
import { Markdown } from '../Markdown';
import { KlassenDiagramm } from '../bausteine/KlassenDiagramm';
import { CodeAnsicht, MaterialAnsicht } from '../bausteine/MaterialAnsicht';
import { StruktogrammAnsicht } from '../bausteine/StruktogrammAnsicht';
import { WeltAnsicht } from '../bausteine/WeltAnsicht';
import { hash, mische } from '../hilfen';

function Linien({ anzahl }: { anzahl: number }) {
  return (
    <div className="druck-linien" aria-hidden="true">
      {Array.from({ length: anzahl }, (_, i) => (
        <div key={i} />
      ))}
    </div>
  );
}

/** Eine Aufgabe für Papier: Aufgabenstellung, Material und Platz zum Schreiben – ohne Lösungen. */
function DruckAufgabe({ a, nummer }: { a: Aufgabe; nummer: string }) {
  const programm = useMemo(() => ('quelltext' in a && a.typ === 'vorhersage' ? uebersetze(a.quelltext).programm : null), [a]);
  let koerper;
  switch (a.typ) {
    case 'auswahl':
      koerper = (
        <ul className="druck-optionen">
          {mische(a.optionen, hash(a.id)).map((o, i) => (
            <li key={i}>
              <span className="kaestchen" /> <Markdown text={o.text} />
            </li>
          ))}
        </ul>
      );
      break;
    case 'zuordnen':
      koerper = (
        <>
          <p className="leise-text">Kategorien: {a.kategorien.join(' · ')}</p>
          <table className="md-tabelle druck-tabelle">
            <tbody>
              {mische(a.elemente, hash(a.id)).map((e) => (
                <tr key={e.text}>
                  <td>{e.text}</td>
                  <td className="druck-feld" />
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
      break;
    case 'reihenfolge':
      koerper = (
        <ul className="druck-optionen">
          {mische(a.elemente, hash(a.id)).map((e) => (
            <li key={e}>
              <span className="kaestchen breit" /> {e}
            </li>
          ))}
        </ul>
      );
      break;
    case 'freitext':
      koerper = <Linien anzahl={(a.zeilen ?? 6) + 2} />;
      break;
    case 'luecke':
      koerper = <pre className={`codeblock${a.code ? '' : ' fliess'}`}>{a.vorlage.replace(/\{\{\w+\}\}/g, '________')}</pre>;
      break;
    case 'wahrheitstabelle': {
      const t = wahrheitstabelle(parseLogik(a.ausdruck));
      koerper = (
        <>
          {a.ausdruckZeigen && <p className="formel">{formatiereLogik(parseLogik(a.ausdruck), a.notation)}</p>}
          <table className="wahrheitstabelle">
            <thead>
              <tr>
                {t.variablen.map((v) => (
                  <th key={v}>{a.namen?.[v] ?? v}</th>
                ))}
                <th className="ergebnis-spalte">{a.ergebnisName ?? 'Y'}</th>
              </tr>
            </thead>
            <tbody>
              {t.zeilen.map((z, i) => (
                <tr key={i}>
                  {z.werte.map((w, n) => (
                    <td key={n}>{a.notation === 'java' ? String(w) : w ? 1 : 0}</td>
                  ))}
                  <td className="ergebnis-spalte" />
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
      break;
    }
    case 'auswertung': {
      const baum = parseLogik(a.ausdruck);
      koerper = (
        <>
          <p className="formel">{formatiereLogik(baum, a.notation)}</p>
          <p>Belegung: {variablen(baum).map((v) => `${v} = ${a.notation === 'java' ? a.belegung[v] : a.belegung[v] ? 1 : 0}`).join(', ')}</p>
          <Linien anzahl={5} />
        </>
      );
      break;
    }
    case 'klassen-lesen':
      koerper = (
        <>
          <KlassenDiagramm modell={a.modell} />
          <p className="leise-text">Mögliche Einträge: {eintraegeKlassenLesen(a).map((e) => e.name).join(', ')}</p>
          <Linien anzahl={3} />
        </>
      );
      break;
    case 'vorhersage':
      koerper = (
        <>
          <div className="druck-zwei">
            {a.darstellung === 'struktogramm' && programm ? (
              <StruktogrammAnsicht programm={programm} methode={a.methode} mitHilfsmethoden />
            ) : (
              <CodeAnsicht quelltext={a.quelltext} />
            )}
            <WeltAnsicht welt={baueWelt(a.welt)} zelle={26} />
          </div>
          <p>Gib an: {a.fragen.map((f) => ({ feld: 'Endfeld (x|y)', richtung: 'Blickrichtung', gefressen: 'Zahl gefressener Fliegen', meldung: 'Meldung in der Konsole', endet: 'endet die Methode?' })[f]).join(' · ')}</p>
          <Linien anzahl={3} />
        </>
      );
      break;
    case 'programmieren': {
      const p = a.struktogrammZeigen ? uebersetze(a.musterloesung).programm : null;
      koerper = (
        <>
          {p && <StruktogrammAnsicht programm={p} methode={a.methode} mitHilfsmethoden />}
          <div className="druck-zwei">
            {a.tests
              .filter((t, i) => t.sichtbar ?? i === 0)
              .map((t) => (
                <WeltAnsicht key={t.name} welt={baueWelt(t.welt)} zelle={26} />
              ))}
          </div>
          <CodeAnsicht quelltext={a.vorlage} titel="Vorlage" />
          <Linien anzahl={14} />
        </>
      );
      break;
    }
    case 'zeilen-ordnen':
      koerper = (
        <>
          <pre className="codeblock">{mische([...zeilenDerLoesung(a.loesung).map((z) => z.text), ...(a.distraktoren ?? [])], hash(a.id)).join('\n')}</pre>
          <Linien anzahl={zeilenDerLoesung(a.loesung).length + 1} />
        </>
      );
      break;
    case 'struktogramm-zeichnen':
      koerper = (
        <>
          {a.codeZeigen && <CodeAnsicht quelltext={a.musterloesung} />}
          <div className="druck-kasten" />
        </>
      );
      break;
    case 'klassen-modellieren':
      koerper = <div className="druck-kasten gross" />;
      break;
  }
  return (
    <section className="druck-aufgabe">
      <h3>
        {nummer} {a.titel} <span className="druck-punkte">({a.punkte} P.)</span>
      </h3>
      <Markdown text={a.stellung} />
      {a.material?.map((m, i) => (
        <MaterialAnsicht key={i} material={m} />
      ))}
      {koerper}
    </section>
  );
}

/** Druckfassung einer Probeklausur – zum Bearbeiten auf Papier. */
export function Druck({ id, onEnde }: { id: string; onEnde: () => void }) {
  const k = probeklausur(id);
  if (!k) return null;
  return (
    <div className="seite druck">
      <div className="spieler-kopf nicht-drucken">
        <button className="textknopf" onClick={onEnde}>
          ← Zurück
        </button>
        <button className="knopf primaer" onClick={() => window.print()}>
          Drucken
        </button>
      </div>
      <header className="druck-kopf">
        <h1>{k.titel}</h1>
        <p>
          Informatik EF · Bearbeitungszeit {k.minuten} Minuten · Name: ______________________ · Datum: ____________
        </p>
      </header>
      {k.teile.map((t, ti) => (
        <div key={t.titel}>
          <h2 className="teil-titel">{t.titel}</h2>
          {t.aufgaben.map((aid, ai) => {
            const a = findeAufgabe(aid);
            return a ? <DruckAufgabe key={aid} a={a} nummer={`${ti + 1}${String.fromCharCode(97 + ai)})`} /> : null;
          })}
        </div>
      ))}
    </div>
  );
}

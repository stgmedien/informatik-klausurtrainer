// Logik-Aufgaben: Wahrheitstabelle ausfüllen und Ausdrücke Schritt für Schritt auswerten.
import { useMemo, useState } from 'react';
import {
  type OperatorKnoten,
  alleOperatoren,
  findeOperator,
  formatiereLogik,
  istBereit,
  istFertig,
  musterloesung,
  parseLogik,
  rechne,
  sicht,
  variablen,
  wahrheitstabelle,
  warumNichtBereit,
  zeigeWert,
  zeileAlsText,
} from '../../engine/logik';
import { bewerteTabelle } from '../../lernen/bewertung';
import { AbgabeKnopf, type TeilProps } from './einfach';

export function WahrheitstabelleAufgabe({ aufgabe, fertig, onAbgabe }: TeilProps<'wahrheitstabelle'>) {
  const baum = useMemo(() => parseLogik(aufgabe.ausdruck), [aufgabe]);
  const tabelle = useMemo(() => wahrheitstabelle(baum), [baum]);
  const [eingaben, setEingaben] = useState<(boolean | undefined)[]>(() => tabelle.zeilen.map(() => undefined));
  const zeige = (w: boolean) => zeigeWert(w, aufgabe.notation);
  const ergebnisName = aufgabe.ergebnisName ?? 'Y';
  const vollstaendig = eingaben.every((e) => e !== undefined);

  return (
    <div>
      {aufgabe.ausdruckZeigen && (
        <p className="formel">
          {ergebnisName} = {formatiereLogik(baum, aufgabe.notation)}
        </p>
      )}
      <table className="wahrheitstabelle">
        <thead>
          <tr>
            {tabelle.variablen.map((v) => (
              <th key={v}>{aufgabe.namen?.[v] ?? v}</th>
            ))}
            <th className="ergebnis-spalte">{ergebnisName}</th>
          </tr>
        </thead>
        <tbody>
          {tabelle.zeilen.map((zeile, i) => {
            const richtig = eingaben[i] === zeile.ergebnis;
            return (
              <tr key={i} className={fertig ? (richtig ? 'richtig' : 'falsch') : ''}>
                {zeile.werte.map((w, n) => (
                  <td key={n}>{zeige(w)}</td>
                ))}
                <td className="ergebnis-spalte">
                  <span className="umschalter" role="group" aria-label={`Ergebnis für Zeile ${i + 1}`}>
                    {[false, true].map((wert) => (
                      <button
                        key={String(wert)}
                        className={`chip${eingaben[i] === wert ? ' an' : ''}${fertig && wert === zeile.ergebnis ? ' loesung' : ''}`}
                        disabled={fertig}
                        aria-pressed={eingaben[i] === wert}
                        onClick={() => setEingaben((alt) => alt.map((e, n) => (n === i ? wert : e)))}
                      >
                        {zeige(wert)}
                      </button>
                    ))}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {fertig && !aufgabe.ausdruckZeigen && (
        <p className="warum">
          Dahinter steckt: <code>{formatiereLogik(baum, 'mathe')}</code> – in Java <code>{formatiereLogik(baum, 'java').replace('^', 'XOR')}</code>
          {aufgabe.namen && (
            <>
              {' '}
              (
              {Object.entries(aufgabe.namen)
                .map(([k, v]) => `${k} = ${v}`)
                .join(', ')}
              )
            </>
          )}
          .
        </p>
      )}
      {!fertig && <AbgabeKnopf aktiv={vollstaendig} onClick={() => onAbgabe({ ...bewerteTabelle(aufgabe, eingaben), quelle: 'automatisch' })} />}
    </div>
  );
}

const REGEL: Record<OperatorKnoten['art'], string> = {
  nicht: 'NICHT dreht den Wert um.',
  und: 'UND ist nur wahr, wenn beide Seiten wahr sind.',
  oder: 'ODER ist wahr, sobald mindestens eine Seite wahr ist.',
  xor: 'EXKLUSIV-ODER ist wahr, wenn genau eine Seite wahr ist.',
};

export function AuswertungAufgabe({ aufgabe, fertig, onAbgabe }: TeilProps<'auswertung'>) {
  const baum = useMemo(() => parseLogik(aufgabe.ausdruck), [aufgabe]);
  const [ausgewertet, setAusgewertet] = useState<ReadonlyMap<number, boolean>>(new Map());
  const [verlauf, setVerlauf] = useState<string[]>([]);
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState(0);

  const zeige = (w: boolean) => zeigeWert(w, aufgabe.notation);
  const tokens = sicht(baum, ausgewertet, aufgabe.belegung, aufgabe.notation);
  const start = zeileAlsText(sicht(baum, new Map(), aufgabe.belegung, aufgabe.notation));
  const operator = gewaehlt === null ? undefined : findeOperator(baum, gewaehlt);

  const waehle = (id: number) => {
    if (fertig) return;
    const op = findeOperator(baum, id);
    if (!op) return;
    if (!istBereit(op, ausgewertet)) {
      setMeldung(warumNichtBereit(op, ausgewertet));
      setFehler(fehler + 1);
      setGewaehlt(null);
      return;
    }
    setMeldung(null);
    setGewaehlt(id);
  };

  // Ist ein Operator dran, sind seine Operanden schon Werte und stehen direkt neben ihm.
  const teilausdruck = (op: OperatorKnoten): string => {
    const stelle = tokens.findIndex((t) => t.knoten === op.id && t.art === 'operator');
    const rechts = tokens[stelle + 1]?.text ?? '';
    if (op.art === 'nicht') return `${tokens[stelle].text}${rechts}`;
    return `${tokens[stelle - 1]?.text ?? ''} ${tokens[stelle].text} ${rechts}`;
  };

  const antworte = (antwort: boolean) => {
    if (!operator) return;
    const richtig = rechne(operator, ausgewertet, aufgabe.belegung);
    if (antwort !== richtig) {
      setMeldung(`Nicht ganz: ${REGEL[operator.art]}`);
      setFehler(fehler + 1);
      return;
    }
    const neu = new Map(ausgewertet).set(operator.id, richtig);
    setAusgewertet(neu);
    setVerlauf([...verlauf, zeileAlsText(sicht(baum, neu, aufgabe.belegung, aufgabe.notation))]);
    setGewaehlt(null);
    setMeldung(null);
    if (istFertig(baum, neu)) {
      // Jeder Fehlgriff kostet einen Punkt.
      onAbgabe({ punkte: Math.max(0, aufgabe.punkte - fehler), max: aufgabe.punkte, quelle: 'automatisch' });
    }
  };

  const muster = fertig ? musterloesung(baum, aufgabe.belegung, aufgabe.notation) : [];
  const offen = alleOperatoren(baum).filter((o) => !ausgewertet.has(o.id)).length;
  // Alle bisherigen Zeilen; die letzte ist die, an der gerade gearbeitet wird.
  const zeilen = [start, ...verlauf];

  return (
    <div className="auswertung">
      <dl className="angaben">
        <dt>Ausdruck</dt>
        <dd>
          <code>{formatiereLogik(baum, aufgabe.notation)}</code>
        </dd>
        <dt>Belegung</dt>
        <dd>
          {variablen(baum)
            .map((v) => `${v} = ${zeige(aufgabe.belegung[v])}`)
            .join(', ')}
        </dd>
      </dl>
      <div className="rechenweg" aria-live="polite">
        {zeilen.slice(0, -1).map((z, i) => (
          <div key={i} className="rw-zeile alt">
            {z}
          </div>
        ))}
        {!fertig && (
          <div className="rw-zeile aktuell">
            {tokens.map((t, i) =>
              t.art === 'operator' ? (
                <button key={i} className={`op${gewaehlt === t.knoten ? ' an' : ''}`} onClick={() => waehle(t.knoten)} aria-label={`Operator ${t.text} auswerten`}>
                  {t.text}
                </button>
              ) : (
                <span key={i} className={`tk ${t.art}`}>
                  {t.text}
                </span>
              ),
            )}
          </div>
        )}
        {fertig && <div className="rw-zeile schluss">{zeilen[zeilen.length - 1]}</div>}
      </div>
      {!fertig && !operator && <p className="hilfstext">Klicke den Operator an, der jetzt dran ist. Noch {offen} offen.</p>}
      {!fertig && operator && (
        <div className="frage">
          Was ergibt <code>{teilausdruck(operator)}</code>?
          <span className="umschalter">
            {[true, false].map((w) => (
              <button key={String(w)} className="chip" onClick={() => antworte(w)}>
                {zeige(w)}
              </button>
            ))}
          </span>
        </div>
      )}
      {meldung && !fertig && <p className="meldung falsch">{meldung}</p>}
      {fertig && (
        <div className="loesung-kasten">
          <strong>Musterlösung in der Reihenfolge aus dem Unterricht:</strong>
          <table className="musterweg">
            <tbody>
              {muster.map((s, i) => (
                <tr key={i}>
                  <td>
                    <code>{s.zeile}</code>
                  </td>
                  <td>{s.regel}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {fehler > 0 && <p>Du hattest {fehler === 1 ? 'einen Fehlgriff' : `${fehler} Fehlgriffe`} – jeder kostet einen Punkt.</p>}
        </div>
      )}
    </div>
  );
}

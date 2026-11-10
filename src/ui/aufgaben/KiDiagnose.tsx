import { useState } from 'react';
import type { DiagnoseErgebnis } from '../../../server/ki/typen';
import { FEHLERMUSTER, fehlermuster } from '../../inhalte/fehlermuster';
import type { Aufgabe } from '../../inhalte/typen';
import type { ProgrammBewertung } from '../../lernen/programm';
import { diagnostiziere } from '../ki';
import { useStand } from '../kontext';

/** Beschreibt die automatischen Befunde in Sätzen – sie sind für die KI die Faktenlage. */
export function befundeAlsText(b: ProgrammBewertung): string[] {
  const befunde: string[] = [];
  for (const d of b.diagnosen) if (!d.folgefehler) befunde.push(`Compiler, Zeile ${d.pos.zeile} (${d.schwere}): ${d.text}`);
  for (const d of b.einrueckung) befunde.push(`Einrückung, Zeile ${d.pos.zeile}: ${d.text}`);
  if (b.repariert) befunde.push('Die Schreibfehler wurden für die Tests automatisch korrigiert.');
  for (const t of b.tests) {
    const lage = t.test.grenzfall ? ` (Grenzfall: ${t.test.grenzfall})` : '';
    befunde.push(`Testwelt „${t.test.name}“${lage}: ${t.bestanden ? 'bestanden' : `nicht bestanden – ${t.grund ?? ''}`}`);
  }
  if (b.strukturFehlt.length) befunde.push(`Verlangt, aber nicht verwendet: ${b.strukturFehlt.join(', ')}`);
  if (b.strukturVerboten.length) befunde.push(`Verwendet, obwohl ausgeschlossen: ${b.strukturVerboten.join(', ')}`);
  if (b.fehlvariante) befunde.push(`Bekanntes Fehlermuster erkannt: ${b.fehlvariante}`);
  return befunde;
}

export function KiDiagnose({ aufgabe, quelltext, bewertung }: { aufgabe: Aufgabe; quelltext: string; bewertung: ProgrammBewertung }) {
  const { ki } = useStand();
  const [laedt, setLaedt] = useState(false);
  const [ergebnis, setErgebnis] = useState<DiagnoseErgebnis | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  if (!ki.verfuegbar) return null;

  const frage = async () => {
    setLaedt(true);
    setFehler(null);
    try {
      setErgebnis(
        await diagnostiziere({
          stellung: aufgabe.stellung,
          quelltext,
          befunde: befundeAlsText(bewertung),
          katalog: FEHLERMUSTER.map((m) => ({ id: m.id, titel: m.titel })),
        }),
      );
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Die Fehlerdiagnose ist fehlgeschlagen.');
    } finally {
      setLaedt(false);
    }
  };

  if (ergebnis) {
    return (
      <section className="rs-block ki-diagnose">
        <h5>Fehlerdiagnose</h5>
        {ergebnis.muster.length > 0 && (
          <p>
            {ergebnis.muster.map((id) => (
              <span key={id} className="marke grad-1">
                {fehlermuster(id)?.titel ?? id}
              </span>
            ))}
          </p>
        )}
        <p>{ergebnis.erklaerung}</p>
        <p>
          <strong>Auf Papier erkennst du das so:</strong> {ergebnis.woranErkennen}
        </p>
        <p>
          <strong>Als Nächstes:</strong> {ergebnis.naechsterSchritt}
        </p>
        <p className="leise-text">Einschätzung der KI ({ergebnis.modell}).</p>
      </section>
    );
  }
  return (
    <div className="ki-diagnose-start">
      <button className="knopf" onClick={frage} disabled={laedt}>
        {laedt ? 'Dein Programm wird untersucht …' : 'KI: Woran liegt der Fehler?'}
      </button>
      {fehler && <p className="meldung falsch">{fehler}</p>}
    </div>
  );
}

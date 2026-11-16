import { useState } from 'react';
import { LEKTIONEN, OPERATOREN } from '../../inhalte';
import type { Merksatz } from '../../inhalte';
import { ergaenzeStand, neuerStand } from '../../lernen/stand';
import { MerksatzKasten } from '../LektionAnsicht';
import { useStand } from '../kontext';

export function Spickzettel() {
  return (
    <div className="seite">
      <header className="seitenkopf">
        <h1>Spickzettel</h1>
        <p>
          Alle Merksätze auf einen Blick. Weicht eine Formulierung von deinem Heft ab, trage den Wortlaut aus dem Unterricht ein – er ersetzt dann
          überall die Vorgabe.
        </p>
      </header>
      {LEKTIONEN.map((l) => {
        const merksaetze = l.abschnitte.filter((a): a is Merksatz => a.art === 'merksatz');
        if (merksaetze.length === 0) return null;
        return (
          <section key={l.id} className="karte">
            <h3>{l.titel}</h3>
            {merksaetze.map((m) => (
              <MerksatzKasten key={m.id} merksatz={m} />
            ))}
          </section>
        );
      })}
      <section className="karte">
        <h3>Operatoren: Was verlangt die Aufgabe?</h3>
        <div className="tabelle-rahmen">
          <table className="md-tabelle operatoren">
            <thead>
              <tr>
                <th>Operator</th>
                <th>Das musst du liefern</th>
                <th>Offizielle Definition (NRW)</th>
                <th>AFB</th>
              </tr>
            </thead>
            <tbody>
              {OPERATOREN.map((o) => (
                <tr key={o.name}>
                  <td>
                    <strong>{o.name}</strong>
                  </td>
                  <td>{o.erwartet}</td>
                  <td className="leise-text">{o.definition}</td>
                  <td>{o.afb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function Einstellungen() {
  const { stand, aendere, ki, speicherOrt, setzeZugangscode } = useStand();
  const [sicher, setSicher] = useState(false);
  const [code, setCode] = useState('');
  const [importMeldung, setImportMeldung] = useState<string | null>(null);

  const importiere = async (datei: File | undefined) => {
    if (!datei) return;
    try {
      const roh = JSON.parse(await datei.text()) as unknown;
      if (!roh || typeof roh !== 'object' || !Array.isArray((roh as { versuche?: unknown }).versuche)) throw new Error('kein Lernstand');
      const neu = ergaenzeStand(roh);
      aendere(() => neu);
      setImportMeldung(`Übernommen: ${neu.versuche.length} bearbeitete Aufgaben.`);
    } catch {
      setImportMeldung('Diese Datei ist kein Lernstand des Spinnen-Trainers.');
    }
  };

  const exportiere = () => {
    const blob = new Blob([JSON.stringify(stand, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'spinnen-trainer-lernstand.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="seite">
      <header className="seitenkopf">
        <h1>Einstellungen</h1>
      </header>
      <section className="karte">
        <h3>Klausurtermin</h3>
        <label className="datum-eingabe">
          Datum der Klausur{' '}
          <input type="date" value={stand.klausurDatum ?? ''} onChange={(e) => aendere((s) => ({ ...s, klausurDatum: e.target.value || undefined }))} />
        </label>
      </section>
      <section className="karte">
        <h3>Struktogramme</h3>
        <p>Beschriftung der Verzweigung:</p>
        <div className="chips">
          {(
            [
              ['wahr-falsch', 'Wahr / Falsch (Arbeitsblatt)'],
              ['ja-nein', 'Ja / Nein (Video)'],
            ] as const
          ).map(([wert, name]) => (
            <button
              key={wert}
              className={`chip${(stand.struktoBeschriftung ?? 'wahr-falsch') === wert ? ' an' : ''}`}
              aria-pressed={(stand.struktoBeschriftung ?? 'wahr-falsch') === wert}
              onClick={() => aendere((s) => ({ ...s, struktoBeschriftung: wert }))}
            >
              {name}
            </button>
          ))}
        </div>
      </section>
      <section className="karte">
        <h3>KI-Unterstützung</h3>
        {ki.eingerichtet && ki.codeNoetig && (
          <div className="zugangscode">
            <p>
              {ki.verfuegbar ? (
                <>
                  <span className="marke grad-3">aktiv</span> Ein Zugangscode ist in diesem Browser gespeichert.
                </>
              ) : (
                <>
                  <span className="marke grad-1">Zugangscode nötig</span> In der Online-Version ist die KI nur mit Zugangscode nutzbar, damit nicht jeder
                  mit dem Link den API-Schlüssel verbraucht.
                </>
              )}
            </p>
            <div className="knopfreihe">
              <input
                className="code-feld"
                type="password"
                autoComplete="off"
                placeholder="Zugangscode"
                aria-label="Zugangscode für die KI"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <button
                className="knopf"
                disabled={!code.trim()}
                onClick={() => {
                  setzeZugangscode(code);
                  setCode('');
                }}
              >
                Speichern
              </button>
              {ki.verfuegbar && (
                <button className="knopf leise" onClick={() => setzeZugangscode('')}>
                  Code entfernen
                </button>
              )}
            </div>
          </div>
        )}
        {ki.verfuegbar && !ki.codeNoetig ? (
          <p>
            <span className="marke grad-3">aktiv</span> Der Schlüssel ist eingerichtet (Modell: <code>{ki.modell}</code>).
          </p>
        ) : ki.eingerichtet ? null : (
          <>
            <p>
              <span className="marke grad-1">nicht eingerichtet</span> Die App funktioniert auch ohne KI: Freitext-Antworten prüfst du dann selbst
              anhand des Erwartungshorizonts.
            </p>
            <p>
              So richtest du die KI ein: Kopiere im Projektordner die Datei <code>.env.example</code> nach <code>.env.local</code>, trage dort deinen
              Schlüssel hinter <code>ANTHROPIC_API_KEY=</code> ein und starte die App neu.
            </p>
          </>
        )}
      </section>
      <section className="karte">
        <h3>Lernstand</h3>
        {speicherOrt === 'datei' ? (
          <p>
            Dein Lernstand liegt in der Datei <code>daten/lernstand.json</code> im Projektordner (mit täglicher Sicherungskopie in <code>daten/backup</code>
            ). Bisher {stand.versuche.length} bearbeitete Aufgaben.
          </p>
        ) : (
          <p>
            Dein Lernstand wird <strong>nur in diesem Browser</strong> gespeichert. Bisher {stand.versuche.length} bearbeitete Aufgaben. Um auf einem
            anderen Gerät weiterzulernen, lade ihn hier herunter und dort wieder hoch.
          </p>
        )}
        <div className="knopfreihe">
          <button className="knopf" onClick={exportiere}>
            Als Datei herunterladen
          </button>
          <label className="knopf leise datei-knopf">
            Aus Datei übernehmen …
            <input type="file" accept="application/json,.json" onChange={(e) => void importiere(e.target.files?.[0])} />
          </label>
          {!sicher ? (
            <button className="knopf leise" onClick={() => setSicher(true)}>
              Lernstand zurücksetzen …
            </button>
          ) : (
            <>
              <button
                className="knopf gefahr"
                onClick={() => {
                  aendere((s) => ({ ...neuerStand(), klausurDatum: s.klausurDatum }));
                  setSicher(false);
                }}
              >
                Wirklich alles löschen
              </button>
              <button className="knopf leise" onClick={() => setSicher(false)}>
                Abbrechen
              </button>
            </>
          )}
        </div>
        {importMeldung && <p className="hilfstext">{importMeldung}</p>}
      </section>
    </div>
  );
}

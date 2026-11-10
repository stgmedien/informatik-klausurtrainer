import { useState } from 'react';
import { LEKTIONEN, OPERATOREN } from '../../inhalte';
import type { Merksatz } from '../../inhalte';
import { neuerStand } from '../../lernen/stand';
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
  const { stand, aendere, ki } = useStand();
  const [sicher, setSicher] = useState(false);

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
        {ki.verfuegbar ? (
          <p>
            <span className="marke grad-3">aktiv</span> Der Schlüssel ist eingerichtet (Modell: <code>{ki.modell}</code>).
          </p>
        ) : (
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
        <p>
          Dein Lernstand liegt in der Datei <code>daten/lernstand.json</code> im Projektordner (mit täglicher Sicherungskopie in <code>daten/backup</code>
          ). Bisher {stand.versuche.length} bearbeitete Aufgaben.
        </p>
        <div className="knopfreihe">
          <button className="knopf" onClick={exportiere}>
            Als Datei herunterladen
          </button>
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
      </section>
    </div>
  );
}

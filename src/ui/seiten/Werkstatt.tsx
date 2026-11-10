import { useMemo, useState } from 'react';
import { type Lauf, type Programm, fuehreAus, oeffentlicheMethoden, pruefeEinrueckung } from '../../engine/java';
import { type Welt, weltZuText } from '../../engine/welt';
import { WELTEN } from '../../inhalte/welten';
import { baueWelt, echteFehler, uebersetze } from '../../lernen/ausfuehren';
import { CodeEingabe } from '../bausteine/CodeEingabe';
import { DiagnoseListe, Stepper } from '../bausteine/Stepper';
import { WeltAnsicht } from '../bausteine/WeltAnsicht';

const START = `public class Tarantel extends Spinne
{
    public void fliegeSuchen()
    {
        while(!fliegeAmPlatz())
        {
            schritt();
        }
        fliegeFressen();
    }
}`;

const SPEICHER = 'spinnen-werkstatt';

function lies(): { code: string; welt: string; karte?: string } {
  try {
    return { code: START, welt: 'schlafplatz', ...JSON.parse(localStorage.getItem(SPEICHER) ?? '{}') };
  } catch {
    return { code: START, welt: 'schlafplatz' };
  }
}

/** Freies Ausprobieren: eigener Quelltext, Welt aus einer Auswahl oder selbst gezeichnet. */
export function Werkstatt() {
  const [anfang] = useState(lies);
  const [code, setCode] = useState(anfang.code);
  const [weltId, setWeltId] = useState(anfang.welt);
  const [karte, setKarte] = useState(anfang.karte ?? WELTEN.find((w) => w.id === anfang.welt)?.welt.karte ?? WELTEN[0].welt.karte);
  const [methode, setMethode] = useState('');
  const [argumente, setArgumente] = useState<Record<string, string>>({});
  const [lauf, setLauf] = useState<{ programm: Programm; lauf: Lauf; start: Welt; id: number } | null>(null);

  const ergebnis = useMemo(() => uebersetze(code), [code]);
  const einrueckung = useMemo(() => (ergebnis.programm ? pruefeEinrueckung(code) : []), [code, ergebnis.programm]);
  const methoden = ergebnis.programm ? oeffentlicheMethoden(ergebnis.programm) : [];
  const gewaehlt = methoden.find((m) => m.name === methode) ?? methoden.find((m) => m.name !== 'act') ?? methoden[0];

  const weltErgebnis = useMemo(() => {
    try {
      return { welt: baueWelt({ karte }), fehler: null };
    } catch (e) {
      return { welt: null, fehler: e instanceof Error ? e.message : 'Die Karte ist ungültig.' };
    }
  }, [karte]);

  const merke = (teil: Partial<{ code: string; welt: string; karte: string }>) => {
    try {
      localStorage.setItem(SPEICHER, JSON.stringify({ code, welt: weltId, karte, ...teil }));
    } catch {
      // Ohne Browser-Speicher geht der Entwurf beim Neuladen verloren – sonst kein Problem.
    }
  };

  const waehleWelt = (id: string) => {
    const neu = WELTEN.find((w) => w.id === id);
    setWeltId(id);
    if (neu) {
      const text = weltZuText(baueWelt(neu.welt));
      setKarte(text);
      merke({ welt: id, karte: text });
    }
    setLauf(null);
  };

  const starte = () => {
    if (!ergebnis.programm || !gewaehlt || !weltErgebnis.welt) return;
    const args = gewaehlt.parameter.map((p) => (p.typ === 'boolean' ? argumente[p.name] === 'true' : Number(argumente[p.name] ?? 0)));
    setLauf({
      programm: ergebnis.programm,
      lauf: fuehreAus(ergebnis.programm, gewaehlt.name, args, weltErgebnis.welt),
      start: weltErgebnis.welt,
      id: Date.now(),
    });
  };

  const fehler = echteFehler(ergebnis.diagnosen);

  return (
    <div className="seite breit">
      <header className="seitenkopf">
        <h1>Werkstatt</h1>
        <p>
          Probiere eigene Methoden aus – wie in Greenfoot, nur mit Schritt-für-Schritt-Ansicht. Du kannst eine ganze Klasse schreiben oder nur
          Methoden; dann denkt sich die App den Rahmen <code>public class Tarantel extends Spinne</code> dazu.
        </p>
      </header>
      <div className="werkstatt">
        <section className="karte">
          <h3>Quelltext</h3>
          <CodeEingabe
            wert={code}
            zeilen={18}
            onAendern={(neu) => {
              setCode(neu);
              merke({ code: neu });
              setLauf(null);
            }}
          />
          {fehler.length === 0 && ergebnis.diagnosen.length === 0 && einrueckung.length === 0 ? (
            <p className="ok-zeile">✓ Der Quelltext ist fehlerfrei.</p>
          ) : (
            <DiagnoseListe diagnosen={[...ergebnis.diagnosen, ...einrueckung]} />
          )}
          <button className="textknopf" onClick={() => (setCode(START), merke({ code: START }), setLauf(null))}>
            Beispiel wiederherstellen
          </button>
        </section>
        <section className="karte">
          <h3>Welt</h3>
          <label className="feldzeile">
            Vorlage{' '}
            <select value={weltId} onChange={(e) => waehleWelt(e.target.value)}>
              {WELTEN.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
              <option value="eigen">eigene Karte</option>
            </select>
          </label>
          {weltErgebnis.welt ? <WeltAnsicht welt={weltErgebnis.welt} zelle={30} /> : <p className="meldung falsch">{weltErgebnis.fehler}</p>}
          <details className="karten-editor">
            <summary>Karte bearbeiten</summary>
            <p className="hilfstext">
              <code>#</code> Hindernis · <code>.</code> leer · <code>K</code> Klatsche · <code>F</code> Fliege (<code>2</code>–<code>9</code> mehrere) ·{' '}
              <code>&gt; v &lt; ^</code> Tarantel mit Blickrichtung. Der Rand muss aus <code>#</code> bestehen.
            </p>
            <textarea
              className="karte-text"
              rows={9}
              spellCheck={false}
              value={karte}
              onChange={(e) => {
                setKarte(e.target.value);
                setWeltId('eigen');
                merke({ karte: e.target.value, welt: 'eigen' });
                setLauf(null);
              }}
            />
          </details>
        </section>
      </div>
      <section className="karte">
        <div className="start-leiste">
          <label className="feldzeile">
            Methode{' '}
            <select value={gewaehlt?.name ?? ''} onChange={(e) => setMethode(e.target.value)} disabled={methoden.length === 0}>
              {methoden.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.rueckgabe} {m.name}({m.parameter.map((p) => `${p.typ} ${p.name}`).join(', ')})
                </option>
              ))}
            </select>
          </label>
          {gewaehlt?.parameter.map((p) => (
            <label key={p.name} className="feldzeile">
              {p.name}{' '}
              {p.typ === 'boolean' ? (
                <select value={argumente[p.name] ?? 'false'} onChange={(e) => setArgumente({ ...argumente, [p.name]: e.target.value })}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input className="zahl" type="number" value={argumente[p.name] ?? '0'} onChange={(e) => setArgumente({ ...argumente, [p.name]: e.target.value })} />
              )}
            </label>
          ))}
          <button className="knopf primaer" disabled={!ergebnis.programm || !gewaehlt || !weltErgebnis.welt} onClick={starte}>
            Ausführen
          </button>
          {!ergebnis.programm && <span className="leise-text">Erst die Fehler beheben, dann kann ausgeführt werden.</span>}
          {ergebnis.programm && methoden.length === 0 && <span className="leise-text">Es gibt keine public-Methode zum Starten.</span>}
        </div>
        {lauf && <Stepper key={lauf.id} programm={lauf.programm} lauf={lauf.lauf} start={lauf.start} autoStart />}
        {lauf && lauf.lauf.rueckgabe !== undefined && (
          <p className="rueckgabe">
            Rückgabewert: <code>{String(lauf.lauf.rueckgabe)}</code>
          </p>
        )}
      </section>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { fehlermuster } from '../../inhalte/fehlermuster';
import type { Aufgabe } from '../../inhalte/typen';
import { baueWelt, richtungsName, uebersetze } from '../../lernen/ausfuehren';
import { type ProgrammBewertung, STRUKTUR_NAMEN, bewerteProgramm, fuehreTestAus, sollLauf } from '../../lernen/programm';
import { CodeEingabe } from '../bausteine/CodeEingabe';
import { CodeAnsicht } from '../bausteine/MaterialAnsicht';
import { DiagnoseListe, Stepper } from '../bausteine/Stepper';
import { StruktogrammAnsicht } from '../bausteine/StruktogrammAnsicht';
import { WeltAnsicht } from '../bausteine/WeltAnsicht';
import { punkteText } from '../hilfen';
import { useStand } from '../kontext';
import { KiDiagnose } from './KiDiagnose';
import { AbgabeKnopf, type TeilProps } from './einfach';

/**
 * Programmieren im Papier-Modus: Vor der Abgabe gibt es kein Ausführen und keine Fehleranzeige.
 * Danach zeigt die Rotstift-Bilanz Schreibfehler, Testwelten und erkannte Fehlermuster.
 */
export function Programmieren({ aufgabe, fertig, onAbgabe, onEntwurf }: TeilProps<'programmieren'>) {
  const { stand, aendere } = useStand();
  const [code, setCode] = useState(stand.antworten[aufgabe.id] ?? aufgabe.vorlage);
  const [bewertung, setBewertung] = useState<ProgrammBewertung | null>(null);
  const [offen, setOffen] = useState<number | null>(null);
  const [musterOffen, setMusterOffen] = useState(false);
  const sichtbar = aufgabe.tests.filter((t, i) => t.sichtbar ?? i === 0);
  const strukto = useMemo(() => {
    if (!aufgabe.struktogrammZeigen) return null;
    const p = uebersetze(aufgabe.musterloesung).programm;
    return p ? { programm: p } : null;
  }, [aufgabe]);

  const aendern = (neu: string) => {
    setCode(neu);
    onEntwurf?.(neu);
  };

  const abgeben = () => {
    aendere((s) => ({ ...s, antworten: { ...s.antworten, [aufgabe.id]: code } }));
    const b = bewerteProgramm(aufgabe, code);
    setBewertung(b);
    const erster = b.tests.findIndex((t) => !t.bestanden);
    setOffen(erster >= 0 ? erster : null);
    onAbgabe({ punkte: b.punkte, max: b.max, quelle: 'automatisch', muster: b.muster });
  };

  return (
    <div className="programmieren">
      {strukto && (
        <figure className="material">
          <figcaption>Struktogramm</figcaption>
          <StruktogrammAnsicht programm={strukto.programm} methode={aufgabe.methode} mitHilfsmethoden />
        </figure>
      )}
      <div className="testwelten">
        {sichtbar.map((t) => (
          <figure key={t.name} className="material">
            <figcaption>{sichtbar.length > 1 ? t.name : 'Ausgangslage'}</figcaption>
            <WeltAnsicht welt={baueWelt(t.welt)} zelle={32} />
          </figure>
        ))}
      </div>
      {!fertig && (
        <>
          <p className="papier-hinweis">
            <strong>Papier-Modus:</strong> Schreibe so, als stünde kein Computer zur Verfügung – kein Ausführen, keine Fehleranzeige. Erst nach der
            Abgabe siehst du, was ein Compiler gemeldet hätte und wie sich dein Programm in mehreren Testwelten verhält.
          </p>
          <CodeEingabe wert={code} onAendern={aendern} zeilen={Math.max(12, code.split('\n').length + 3)} />
          <div className="abgabe-leiste knopfreihe">
            <AbgabeKnopf aktiv={code.trim() !== aufgabe.vorlage.trim()} onClick={abgeben} text="Abgeben und prüfen" />
            {code !== aufgabe.vorlage && (
              <button className="textknopf" onClick={() => aendern(aufgabe.vorlage)}>
                Vorlage wiederherstellen
              </button>
            )}
          </div>
        </>
      )}

      {bewertung && (
        <div className="rotstift">
          <h4>Rotstift-Bilanz</h4>
          <section className={`rs-block ${bewertung.schreibfehler.length ? 'schlecht' : 'gut'}`}>
            <h5>Schreibfehler {bewertung.schreibfehler.length ? `(${bewertung.schreibfehler.length})` : ''}</h5>
            {bewertung.schreibfehler.length === 0 ? (
              <p>Keine – ein Compiler hätte nichts zu beanstanden.</p>
            ) : (
              <>
                <p>
                  Auf Papier wären diese Fehler unbemerkt geblieben.{' '}
                  {bewertung.repariert ? 'Für die Testwelten wurden sie automatisch korrigiert.' : 'Sie verhindern, dass das Programm ausgeführt werden kann.'}
                </p>
                <DiagnoseListe diagnosen={bewertung.diagnosen.filter((d) => d.schwere === 'fehler' || d.schwere === 'nicht-unterstuetzt')} />
              </>
            )}
            {bewertung.diagnosen.some((d) => d.schwere === 'warnung') && <DiagnoseListe diagnosen={bewertung.diagnosen.filter((d) => d.schwere === 'warnung')} />}
            {bewertung.einrueckung.length > 0 && <DiagnoseListe diagnosen={bewertung.einrueckung} />}
          </section>

          {(bewertung.strukturFehlt.length > 0 || bewertung.strukturVerboten.length > 0) && (
            <section className="rs-block schlecht">
              <h5>Verlangte Kontrollstrukturen</h5>
              {bewertung.strukturFehlt.map((m) => (
                <p key={m}>Es fehlt: {STRUKTUR_NAMEN[m]}.</p>
              ))}
              {bewertung.strukturVerboten.map((m) => (
                <p key={m}>Nicht erlaubt war: {STRUKTUR_NAMEN[m]}.</p>
              ))}
            </section>
          )}

          <section className={`rs-block ${bewertung.tests.every((t) => t.bestanden) ? 'gut' : 'schlecht'}`}>
            <h5>
              Testwelten: {bewertung.tests.filter((t) => t.bestanden).length} von {bewertung.tests.length} bestanden
            </h5>
            <ul className="testliste">
              {bewertung.tests.map((t, i) => (
                <li key={t.test.name} className={t.bestanden ? 'richtig' : 'falsch'}>
                  <span className="test-zeichen">{t.bestanden ? '✓' : '✗'}</span>
                  <span className="test-text">
                    <strong>{t.test.name}</strong>
                    {t.test.grenzfall && <span className="leise-text"> – Grenzfall: {t.test.grenzfall}</span>}
                    {t.grund && <span className="test-grund">{t.grund}</span>}
                  </span>
                  {t.istLauf && (
                    <button className="knopf klein leise" onClick={() => setOffen(offen === i ? null : i)}>
                      {offen === i ? 'Ablauf schließen' : 'Ablauf ansehen'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {offen !== null && bewertung.programm && bewertung.tests[offen]?.istLauf && (
              <TestAblauf bewertung={bewertung} index={offen} aufgabe={aufgabe} />
            )}
          </section>

          {bewertung.muster.length > 0 && (
            <section className="rs-block hinweis-block">
              <h5>Erkannte Fehlermuster</h5>
              {bewertung.fehlvariante && <p className="fehlvariante">{bewertung.fehlvariante}</p>}
              <ul className="muster-liste">
                {bewertung.muster.map((id) => {
                  const m = fehlermuster(id);
                  return m ? (
                    <li key={id}>
                      <strong>{m.titel}:</strong> {m.erklaerung} <span className="leise-text">Auf Papier: {m.gegenmittel}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </section>
          )}

          {bewertung.abzuege.length > 0 && (
            <p className="abzuege">
              {punkteText(bewertung.punkte, bewertung.max)}:{' '}
              {bewertung.abzuege.map((a) => `${a.grund} (−${String(Math.round(a.punkte * 2) / 2).replace('.', ',')})`).join(' · ')}
            </p>
          )}

          {bewertung.punkte < bewertung.max && <KiDiagnose aufgabe={aufgabe} quelltext={code} bewertung={bewertung} />}

          <button className="textknopf" onClick={() => setMusterOffen(!musterOffen)} aria-expanded={musterOffen}>
            {musterOffen ? 'Musterlösung ausblenden' : 'Musterlösung zeigen'}
          </button>
          {musterOffen && <CodeAnsicht quelltext={aufgabe.musterloesung} titel="Eine mögliche Lösung" />}
        </div>
      )}
    </div>
  );
}

function TestAblauf({ bewertung, index, aufgabe }: { bewertung: ProgrammBewertung; index: number; aufgabe: Extract<Aufgabe, { typ: 'programmieren' }> }) {
  const t = bewertung.tests[index];
  const [zeigeSoll, setZeigeSoll] = useState(false);
  const soll = useMemo(() => (zeigeSoll ? sollLauf(aufgabe, t.test, true) : null), [zeigeSoll, aufgabe, t.test]);
  const aufgezeichnet = useMemo(
    () => (bewertung.programm ? fuehreTestAus(bewertung.programm, aufgabe.methode, t.test, true) : null),
    [bewertung.programm, aufgabe.methode, t.test],
  );
  if (!aufgezeichnet || !bewertung.programm) return null;
  return (
    <div className="test-ablauf">
      <p className="leise-text">
        Soll am Ende: Feld ({t.soll.x}|{t.soll.y}), Blick nach {richtungsName(t.soll.richtung)}, {t.soll.gefressen} Fliege{t.soll.gefressen === 1 ? '' : 'n'}{' '}
        gefressen.
      </p>
      <Stepper key={`${index}-ist`} programm={bewertung.programm} lauf={aufgezeichnet} start={t.start} titel={`Dein Programm in „${t.test.name}“`} />
      <button className="textknopf" onClick={() => setZeigeSoll(!zeigeSoll)}>
        {zeigeSoll ? 'Musterlösung in dieser Welt ausblenden' : 'Zum Vergleich: Musterlösung in dieser Welt'}
      </button>
      {soll && <Stepper key={`${index}-soll`} programm={soll.programm} lauf={soll.lauf} start={t.start} titel="Musterlösung" />}
    </div>
  );
}

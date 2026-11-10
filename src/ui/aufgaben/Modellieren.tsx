import { useMemo, useState } from 'react';
import { type KAttribut, type KKlasse, type KMethode, type KlassenModell, attributText, methodeText, pruefeModell } from '../../engine/klassen';
import { checkliste, struktogrammeMitHilfsmethoden } from '../../engine/strukto';
import { uebersetze } from '../../lernen/ausfuehren';
import { KlassenDiagramm } from '../bausteine/KlassenDiagramm';
import { CodeAnsicht } from '../bausteine/MaterialAnsicht';
import { EinStruktogramm } from '../bausteine/StruktogrammAnsicht';
import { useStand } from '../kontext';
import { AbgabeLeiste, ErwartungsVergleich } from './Freitext';
import { AbgabeKnopf, type TeilProps } from './einfach';

/**
 * Struktogramm zeichnen: auf Papier, dann mit dem Muster-Struktogramm vergleichen.
 * Die Checkliste zerlegt das Muster in einzelne Bausteine, die man abhakt.
 */
export function StruktogrammZeichnen({ aufgabe, fertig, onAbgabe }: TeilProps<'struktogramm-zeichnen'>) {
  const programm = useMemo(() => uebersetze(aufgabe.musterloesung).programm, [aufgabe]);
  const bilder = useMemo(
    () => (programm ? struktogrammeMitHilfsmethoden(programm, aufgabe.methode).filter((_, i) => i === 0 || aufgabe.mitHilfsmethoden) : []),
    [programm, aufgabe],
  );
  const punkte = useMemo(() => bilder.flatMap(checkliste), [bilder]);
  const [vergleichen, setVergleichen] = useState(false);
  const [haken, setHaken] = useState<Readonly<Record<number, boolean>>>({});
  if (!programm) return <p className="meldung falsch">Die Musterlösung dieser Aufgabe ist fehlerhaft.</p>;

  const speichere = () => {
    const richtig = punkte.filter((_, i) => haken[i]).length;
    onAbgabe({ punkte: Math.round((richtig / punkte.length) * aufgabe.punkte * 2) / 2, max: aufgabe.punkte, quelle: 'selbst' });
  };

  return (
    <div>
      {aufgabe.codeZeigen && <CodeAnsicht quelltext={aufgabe.musterloesung} titel="Quelltext" />}
      {!vergleichen ? (
        <>
          <p className="papier-hinweis">
            <strong>Auf Papier:</strong> Zeichne das Struktogramm auf ein Blatt – mit Lineal, wie in der Klausur. Formuliere Bedingungen als Fragen
            („Ist ein Hindernis vor mir?“) und Anweisungen in ganzen Sätzen oder als Methodenaufruf. Wenn du fertig bist, vergleiche mit dem Muster.
          </p>
          <AbgabeKnopf aktiv onClick={() => setVergleichen(true)} text="Fertig gezeichnet – vergleichen" />
        </>
      ) : (
        <div className="strukto-vergleich">
          <div className="spalten">
            <section>
              <h4>Muster-Struktogramm</h4>
              <div className="sg-gruppe">
                {bilder.map((s) => (
                  <EinStruktogramm key={s.methode} s={s} />
                ))}
              </div>
            </section>
            <section>
              <h4>Hake ab, was in deinem Struktogramm genauso steht</h4>
              <p className="hilfstext">Andere Formulierungen sind in Ordnung, solange sie dasselbe bedeuten. Eine Lösung mit anderem Aufbau kann richtig sein, wenn sie in jeder Lage dasselbe bewirkt – dann hake die gleichwertigen Bausteine ab.</p>
              <ul className="checkliste">
                {punkte.map((p, i) => (
                  <li key={i}>
                    <label>
                      <input type="checkbox" checked={Boolean(haken[i])} disabled={fertig} onChange={(e) => setHaken((alt) => ({ ...alt, [i]: e.target.checked }))} />
                      {p}
                    </label>
                  </li>
                ))}
              </ul>
              {!fertig && <AbgabeKnopf aktiv onClick={speichere} text="Einschätzung speichern" />}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

const LEERE_KLASSE: KKlasse = { name: '', attribute: [], methoden: [] };

export function modellAlsText(m: KlassenModell): string {
  return m.klassen
    .map(
      (k) =>
        `Klasse ${k.name}${k.ober ? ` (Unterklasse von ${k.ober})` : ''}\n  Attribute: ${k.attribute.map(attributText).join('; ') || '–'}\n  Methoden: ${k.methoden.map(methodeText).join('; ') || '–'}`,
    )
    .join('\n');
}

function bereinigt(m: KlassenModell): KlassenModell {
  return {
    klassen: m.klassen
      .filter((k) => k.name.trim())
      .map((k) => ({
        ...k,
        name: k.name.trim(),
        ober: k.ober?.trim() || undefined,
        attribute: k.attribute.filter((a) => a.name.trim()).map((a) => ({ ...a, name: a.name.trim(), typ: a.typ?.trim() || undefined })),
        methoden: k.methoden.filter((x) => x.name.trim()).map((x) => ({ ...x, name: x.name.trim().replace(/\(\)$/, ''), rueckgabe: x.rueckgabe?.trim() || undefined })),
      })),
  };
}

/** Klassendiagramm modellieren: Formular-Editor mit Live-Vorschau, bewertet nach Erwartungshorizont. */
export function KlassenModellieren({ aufgabe, fertig, onAbgabe }: TeilProps<'klassen-modellieren'>) {
  const { stand, aendere, ki } = useStand();
  const [modell, setModell] = useState<KlassenModell>(() => {
    try {
      const gespeichert = stand.antworten[aufgabe.id];
      if (gespeichert) return JSON.parse(gespeichert) as KlassenModell;
    } catch {
      // Ein beschädigter Entwurf wird verworfen.
    }
    return { klassen: [{ ...LEERE_KLASSE }] };
  });
  const [abgegeben, setAbgegeben] = useState<null | { mitKi: boolean }>(null);
  const sauber = bereinigt(modell);
  const fehler = pruefeModell(sauber);
  const fehlend = aufgabe.pflichtklassen.filter((n) => !sauber.klassen.some((k) => k.name.toLowerCase() === n.toLowerCase()));

  const setze = (i: number, k: KKlasse) => setModell((alt) => ({ klassen: alt.klassen.map((x, n) => (n === i ? k : x)) }));
  const abgeben = (mitKi: boolean) => {
    aendere((s) => ({ ...s, antworten: { ...s.antworten, [aufgabe.id]: JSON.stringify(modell) } }));
    setAbgegeben({ mitKi });
  };

  if (abgegeben) {
    return (
      <ErwartungsVergleich
        aufgabe={aufgabe}
        erwartung={aufgabe.erwartung}
        antwort={modellAlsText(sauber)}
        antwortAnsicht={<KlassenDiagramm modell={sauber} />}
        mitKi={abgegeben.mitKi}
        fertig={fertig}
        onAbgabe={onAbgabe}
      />
    );
  }

  return (
    <div className="modellieren">
      <div className="klassen-editor">
        {modell.klassen.map((k, i) => (
          <KlassenKarte
            key={i}
            klasse={k}
            andere={modell.klassen.filter((_, n) => n !== i).map((x) => x.name.trim()).filter(Boolean)}
            onAendern={(neu) => setze(i, neu)}
            onEntfernen={modell.klassen.length > 1 ? () => setModell((alt) => ({ klassen: alt.klassen.filter((_, n) => n !== i) })) : undefined}
          />
        ))}
        <button className="knopf leise" onClick={() => setModell((alt) => ({ klassen: [...alt.klassen, { ...LEERE_KLASSE }] }))}>
          + Klasse hinzufügen
        </button>
      </div>
      {sauber.klassen.length > 0 && (
        <figure className="material">
          <figcaption>Vorschau</figcaption>
          <KlassenDiagramm modell={sauber} />
        </figure>
      )}
      {(fehler.length > 0 || fehlend.length > 0) && (
        <ul className="vorpruefung">
          {fehler.map((f) => (
            <li key={f}>{f}</li>
          ))}
          {fehlend.length > 0 && <li>Laut Aufgabe fehlt noch: {fehlend.join(', ')}.</li>}
        </ul>
      )}
      <AbgabeLeiste aktiv={sauber.klassen.length >= 2} mitKi={ki.verfuegbar} onAbgabe={abgeben} />
    </div>
  );
}

function KlassenKarte({
  klasse: k,
  andere,
  onAendern,
  onEntfernen,
}: {
  klasse: KKlasse;
  andere: string[];
  onAendern: (k: KKlasse) => void;
  onEntfernen?: () => void;
}) {
  const attr = (i: number, a: Partial<KAttribut>) => onAendern({ ...k, attribute: k.attribute.map((x, n) => (n === i ? { ...x, ...a } : x)) });
  const meth = (i: number, m: Partial<KMethode>) => onAendern({ ...k, methoden: k.methoden.map((x, n) => (n === i ? { ...x, ...m } : x)) });
  return (
    <fieldset className="klassen-karte">
      <legend>
        <input className="kk-name" value={k.name} placeholder="Klassenname" aria-label="Klassenname" onChange={(e) => onAendern({ ...k, name: e.target.value })} />
      </legend>
      <label className="feldzeile">
        erbt von{' '}
        <select value={k.ober ?? ''} onChange={(e) => onAendern({ ...k, ober: e.target.value || undefined })}>
          <option value="">– keine Oberklasse –</option>
          {andere.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <div className="kk-abschnitt">
        <strong>Attribute</strong>
        {k.attribute.map((a, i) => (
          <div key={i} className="kk-zeile">
            <select value={a.sicht ?? '-'} onChange={(e) => attr(i, { sicht: e.target.value as '+' | '-' })} aria-label="Sichtbarkeit">
              <option value="-">−</option>
              <option value="+">+</option>
            </select>
            <input value={a.name} placeholder="name" aria-label="Attributname" onChange={(e) => attr(i, { name: e.target.value })} />
            <span>:</span>
            <input value={a.typ ?? ''} placeholder="Typ" aria-label="Datentyp" className="kurz" onChange={(e) => attr(i, { typ: e.target.value })} />
            <button className="mini" aria-label="Attribut entfernen" onClick={() => onAendern({ ...k, attribute: k.attribute.filter((_, n) => n !== i) })}>
              ✕
            </button>
          </div>
        ))}
        <button className="textknopf" onClick={() => onAendern({ ...k, attribute: [...k.attribute, { name: '', typ: '', sicht: '-' }] })}>
          + Attribut
        </button>
      </div>
      <div className="kk-abschnitt">
        <strong>Methoden</strong>
        {k.methoden.map((m, i) => (
          <div key={i} className="kk-zeile">
            <select value={m.sicht ?? '+'} onChange={(e) => meth(i, { sicht: e.target.value as '+' | '-' })} aria-label="Sichtbarkeit">
              <option value="+">+</option>
              <option value="-">−</option>
            </select>
            <input value={m.name} placeholder="name" aria-label="Methodenname" onChange={(e) => meth(i, { name: e.target.value })} />
            <span>()</span>
            <span>:</span>
            <input value={m.rueckgabe ?? ''} placeholder="void" aria-label="Rückgabetyp" className="kurz" onChange={(e) => meth(i, { rueckgabe: e.target.value })} />
            <button className="mini" aria-label="Methode entfernen" onClick={() => onAendern({ ...k, methoden: k.methoden.filter((_, n) => n !== i) })}>
              ✕
            </button>
          </div>
        ))}
        <button className="textknopf" onClick={() => onAendern({ ...k, methoden: [...k.methoden, { name: '', sicht: '+' }] })}>
          + Methode
        </button>
      </div>
      {onEntfernen && (
        <button className="textknopf gefahr-text" onClick={onEntfernen}>
          Klasse entfernen
        </button>
      )}
    </fieldset>
  );
}

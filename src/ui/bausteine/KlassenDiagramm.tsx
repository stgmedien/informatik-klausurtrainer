import { type KKlasse, type KlassenModell, attributText, findeKlasse, methodeText } from '../../engine/klassen';

// Zeichnet ein Klassendiagramm als Baum: Oberklassen oben, Vererbungspfeile mit leerer Dreiecksspitze.

const ZEILE = 19;
const KOPF = 30;
const RAND = 9;
const ZEICHEN = 7.7;
const ABSTAND_X = 26;
const ABSTAND_Y = 46;

interface Kasten {
  klasse: KKlasse;
  attribute: string[];
  methoden: string[];
  b: number;
  h: number;
  hAttr: number;
  x: number;
  y: number;
}

function vermesse(klasse: KKlasse): Kasten {
  const attribute = klasse.attribute.map(attributText);
  const methoden = klasse.methoden.map(methodeText);
  const laengste = Math.max(klasse.name.length + 2, ...attribute.map((t) => t.length), ...methoden.map((t) => t.length));
  const hAttr = Math.max(1, attribute.length) * ZEILE + RAND;
  const hMeth = Math.max(1, methoden.length) * ZEILE + RAND;
  return { klasse, attribute, methoden, b: Math.max(124, laengste * ZEICHEN + 2 * RAND), h: KOPF + hAttr + hMeth, hAttr, x: 0, y: 0 };
}

function ordneAn(modell: KlassenModell): { kaesten: Kasten[]; breite: number; hoehe: number } {
  const kaesten = new Map(modell.klassen.map((k) => [k.name, vermesse(k)]));
  const kinder = (name: string) => modell.klassen.filter((k) => k.ober === name);
  const wurzeln = modell.klassen.filter((k) => !k.ober || !findeKlasse(modell, k.ober));

  const tiefe = new Map<string, number>();
  const setzeTiefe = (k: KKlasse, t: number) => {
    tiefe.set(k.name, t);
    kinder(k.name).forEach((kind) => setzeTiefe(kind, t + 1));
  };
  wurzeln.forEach((w) => setzeTiefe(w, 0));

  const ebenenHoehe: number[] = [];
  for (const [name, t] of tiefe) ebenenHoehe[t] = Math.max(ebenenHoehe[t] ?? 0, kaesten.get(name)!.h);
  const ebenenY = ebenenHoehe.map((_, t) => ebenenHoehe.slice(0, t).reduce((s, h) => s + h + ABSTAND_Y, 0));

  const teilbaumBreite = (k: KKlasse): number => {
    const ks = kinder(k.name);
    const unten = ks.reduce((s, kind) => s + teilbaumBreite(kind), 0) + ABSTAND_X * Math.max(0, ks.length - 1);
    return Math.max(kaesten.get(k.name)!.b, unten);
  };
  const platziere = (k: KKlasse, links: number) => {
    const kasten = kaesten.get(k.name)!;
    const breite = teilbaumBreite(k);
    kasten.x = links + (breite - kasten.b) / 2;
    kasten.y = ebenenY[tiefe.get(k.name)!];
    const ks = kinder(k.name);
    const unten = ks.reduce((s, kind) => s + teilbaumBreite(kind), 0) + ABSTAND_X * Math.max(0, ks.length - 1);
    let x = links + (breite - unten) / 2;
    for (const kind of ks) {
      platziere(kind, x);
      x += teilbaumBreite(kind) + ABSTAND_X;
    }
  };
  let x = 0;
  for (const w of wurzeln) {
    platziere(w, x);
    x += teilbaumBreite(w) + ABSTAND_X;
  }
  const liste = [...kaesten.values()];
  return {
    kaesten: liste,
    breite: Math.max(...liste.map((k) => k.x + k.b)),
    hoehe: Math.max(...liste.map((k) => k.y + k.h)),
  };
}

export function KlassenDiagramm({ modell, markiert }: { modell: KlassenModell; markiert?: string }) {
  const { kaesten, breite, hoehe } = ordneAn(modell);
  const nachName = new Map(kaesten.map((k) => [k.klasse.name, k]));
  const P = 6;

  return (
    <div className="diagramm-rahmen">
      <svg
        className="klassendiagramm"
        viewBox={`${-P} ${-P} ${breite + 2 * P} ${hoehe + 2 * P}`}
        width={breite + 2 * P}
        height={hoehe + 2 * P}
        role="img"
        aria-label={`Klassendiagramm mit den Klassen ${modell.klassen.map((k) => k.name).join(', ')}`}
      >
        {kaesten.map((k) => {
          const ober = k.klasse.ober ? nachName.get(k.klasse.ober) : undefined;
          if (!ober) return null;
          const von = { x: k.x + k.b / 2, y: k.y };
          const zu = { x: ober.x + ober.b / 2, y: ober.y + ober.h };
          const mitte = zu.y + ABSTAND_Y / 2 + 4;
          return (
            <g key={`pfeil-${k.klasse.name}`} className="kd-pfeil">
              <path d={`M ${von.x} ${von.y} V ${mitte} H ${zu.x} V ${zu.y + 12}`} />
              <polygon points={`${zu.x},${zu.y} ${zu.x - 7},${zu.y + 12} ${zu.x + 7},${zu.y + 12}`} />
            </g>
          );
        })}
        {kaesten.map((k) => (
          <g key={k.klasse.name} transform={`translate(${k.x} ${k.y})`} className={`kd-kasten${markiert === k.klasse.name ? ' kd-markiert' : ''}`}>
            <rect width={k.b} height={k.h} rx={3} />
            <text className="kd-name" x={k.b / 2} y={20} textAnchor="middle">
              {k.klasse.name}
            </text>
            <line x1={0} x2={k.b} y1={KOPF} y2={KOPF} />
            {k.attribute.map((t, i) => (
              <text key={`a${i}`} x={RAND} y={KOPF + 17 + i * ZEILE}>
                {t}
              </text>
            ))}
            <line x1={0} x2={k.b} y1={KOPF + k.hAttr} y2={KOPF + k.hAttr} />
            {k.methoden.map((t, i) => (
              <text key={`m${i}`} x={RAND} y={KOPF + k.hAttr + 17 + i * ZEILE}>
                {t}
              </text>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

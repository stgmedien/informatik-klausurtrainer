import { type Welt, feld } from '../../engine/welt';

interface Props {
  welt: Welt;
  /** Kantenlänge eines Feldes in Pixeln (Original: 40). */
  zelle?: number;
  /** Hervorgehobenes Feld, z.B. die eigene Vorhersage. */
  markiert?: { x: number; y: number } | null;
  /** Zweite Hervorhebung, z.B. das tatsächliche Zielfeld. */
  ziel?: { x: number; y: number } | null;
  onFeld?: (x: number, y: number) => void;
  beschriftung?: string;
}

/** Zeichnet die Spinnenwelt mit den Originalgrafiken des Greenfoot-Szenarios. */
export function WeltAnsicht({ welt, zelle = 40, markiert, ziel, onFeld, beschriftung }: Props) {
  const { spinne } = welt;
  const felder = [];
  for (let y = 0; y < welt.hoehe; y++) {
    for (let x = 0; x < welt.breite; x++) {
      const f = feld(welt, x, y);
      const hier = spinne.x === x && spinne.y === y;
      const klassen = ['feld'];
      if (markiert?.x === x && markiert.y === y) klassen.push('markiert');
      if (ziel?.x === x && ziel.y === y) klassen.push('ziel');
      const inhalt = (
        <>
          {f.hindernis && <img src="/bilder/hindernis.png" alt="" />}
          {f.klatsche && <img src="/bilder/klatsche.png" alt="" />}
          {f.fliegen > 0 && <img src="/bilder/netz_mit_fliege.png" alt="" />}
          {f.fliegen > 1 && <span className="fliegen-zahl">{f.fliegen}</span>}
          {hier && (
            <img
              className="spinne"
              src={spinne.geklatscht ? '/bilder/thekla_geklatscht.png' : '/bilder/thekla.png'}
              alt=""
              style={{ transform: `rotate(${spinne.richtung}deg)` }}
            />
          )}
        </>
      );
      const name = `Feld ${x}|${y}${f.hindernis ? ', Hindernis' : ''}${f.klatsche ? ', Klatsche' : ''}${f.fliegen ? `, ${f.fliegen} Fliege${f.fliegen > 1 ? 'n' : ''}` : ''}${hier ? ', Tarantel' : ''}`;
      felder.push(
        onFeld && !f.hindernis ? (
          <button key={`${x},${y}`} className={`${klassen.join(' ')} waehlbar`} onClick={() => onFeld(x, y)} aria-label={name} title={`(${x}|${y})`}>
            {inhalt}
          </button>
        ) : (
          <div key={`${x},${y}`} className={klassen.join(' ')} title={`(${x}|${y})`}>
            {inhalt}
          </div>
        ),
      );
    }
  }

  const richtung = { 0: 'rechts', 90: 'unten', 180: 'links', 270: 'oben' }[spinne.richtung];
  return (
    <div className="welt-rahmen">
      <div
        className="welt"
        role={onFeld ? 'group' : 'img'}
        aria-label={beschriftung ?? `Spinnenwelt, ${welt.breite} mal ${welt.hoehe} Felder. Tarantel auf Feld ${spinne.x}|${spinne.y}, Blick nach ${richtung}.`}
        style={{ gridTemplateColumns: `repeat(${welt.breite}, 1fr)`, width: welt.breite * zelle, maxWidth: '100%' }}
      >
        {felder}
      </div>
    </div>
  );
}

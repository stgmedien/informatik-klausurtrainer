import type { Material, ObjektKarte } from '../../inhalte/typen';
import { Markdown } from '../Markdown';
import { KlassenDiagramm } from './KlassenDiagramm';

export function CodeAnsicht({ quelltext, titel, markierteZeile }: { quelltext: string; titel?: string; markierteZeile?: number }) {
  const zeilen = quelltext.split('\n');
  return (
    <figure className="code-figur">
      {titel && <figcaption>{titel}</figcaption>}
      <div className="code-ansicht" role="group" aria-label={titel ?? 'Quelltext'}>
        {zeilen.map((zeile, i) => (
          <div key={i} className={`code-zeile${markierteZeile === i + 1 ? ' aktiv' : ''}`}>
            <span className="code-nr">{i + 1}</span>
            <span className="code-text">{zeile || ' '}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function ObjektKarten({ objekte }: { objekte: ObjektKarte[] }) {
  return (
    <div className="objektkarten">
      {objekte.map((o) => (
        <table key={o.name} className="objektkarte">
          <caption>
            <span className="unterstrichen">
              {o.name} : {o.klasse}
            </span>
          </caption>
          <tbody>
            {o.attribute.map(([name, wert]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{wert}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}

export function MaterialAnsicht({ material }: { material: Material }) {
  switch (material.art) {
    case 'klassendiagramm':
      return (
        <figure className="material">
          {material.titel && <figcaption>{material.titel}</figcaption>}
          <KlassenDiagramm modell={material.modell} />
        </figure>
      );
    case 'objekte':
      return (
        <figure className="material">
          {material.titel && <figcaption>{material.titel}</figcaption>}
          <ObjektKarten objekte={material.objekte} />
        </figure>
      );
    case 'code':
      return <CodeAnsicht quelltext={material.quelltext} titel={material.titel} />;
    case 'text':
      return <Markdown text={material.markdown} />;
  }
}

// Notenschätzung aus dem Punkteanteil. Grundlage ist die in NRW in der Oberstufe übliche Zuordnung
// (ab 95 % 15 Punkte, ab 45 % 5 Punkte = ausreichend); die Lehrkraft kann davon abweichen.

const STUFEN: [prozent: number, notenpunkte: number][] = [
  [95, 15],
  [90, 14],
  [85, 13],
  [80, 12],
  [75, 11],
  [70, 10],
  [65, 9],
  [60, 8],
  [55, 7],
  [50, 6],
  [45, 5],
  [40, 4],
  [33, 3],
  [27, 2],
  [20, 1],
  [0, 0],
];

const NOTEN = ['6', '5−', '5', '5+', '4−', '4', '4+', '3−', '3', '3+', '2−', '2', '2+', '1−', '1', '1+'];

export function notenpunkte(punkte: number, max: number): number {
  const prozent = max > 0 ? (punkte / max) * 100 : 0;
  return STUFEN.find(([grenze]) => prozent >= grenze - 1e-9)![1];
}

export function noteAusPunkten(np: number): string {
  return NOTEN[np];
}

export function noteText(punkte: number, max: number): string {
  const np = notenpunkte(punkte, max);
  return `${noteAusPunkten(np)} (${np} ${np === 1 ? 'Notenpunkt' : 'Notenpunkte'})`;
}

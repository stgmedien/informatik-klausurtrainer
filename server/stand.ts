import { promises as fs } from 'node:fs';
import path from 'node:path';

// Der Lernstand liegt als Datei im Projektordner, damit er nicht vom Browser-Speicher abhängt.
// SPINNEN_DATEN lenkt ihn um, z.B. für eine zweite Instanz zum Ausprobieren, die den echten Stand nicht berührt.
const ORDNER = path.resolve(process.cwd(), process.env.SPINNEN_DATEN || 'daten');
const DATEI = path.join(ORDNER, 'lernstand.json');
const BACKUPS = path.join(ORDNER, 'backup');

export async function leseStand(): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(DATEI, 'utf8'));
  } catch (fehler) {
    if ((fehler as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw fehler;
  }
}

export async function schreibeStand(stand: unknown): Promise<void> {
  await fs.mkdir(BACKUPS, { recursive: true });
  const text = JSON.stringify(stand, null, 2);
  // Erst in eine temporäre Datei schreiben, dann umbenennen: so entsteht nie eine halbe Datei.
  const temp = `${DATEI}.tmp`;
  await fs.writeFile(temp, text, 'utf8');
  await fs.rename(temp, DATEI);
  const tag = new Date().toISOString().slice(0, 10);
  await fs.writeFile(path.join(BACKUPS, `lernstand-${tag}.json`), text, 'utf8');
}

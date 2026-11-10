import type { KlassenModell } from '../engine/klassen';

// Klassendiagramme, die in Lektionen und Aufgaben vorkommen.

export const SPINNENWELT: KlassenModell = {
  klassen: [
    {
      name: 'Actor',
      attribute: [
        { name: 'x', typ: 'int' },
        { name: 'y', typ: 'int' },
        { name: 'rotation', typ: 'int' },
      ],
      methoden: [{ name: 'act' }, { name: 'getX', rueckgabe: 'int' }, { name: 'setRotation', parameter: 'rotation : int' }],
    },
    {
      name: 'Spinne',
      ober: 'Actor',
      attribute: [
        { name: 'fliegen', typ: 'int' },
        { name: 'geklatscht', typ: 'boolean' },
      ],
      methoden: [{ name: 'schritt' }, { name: 'linksDrehen' }, { name: 'fliegeFressen' }, { name: 'hindernisVorn', rueckgabe: 'boolean' }],
    },
    { name: 'Tarantel', ober: 'Spinne', attribute: [], methoden: [{ name: 'wenden' }, { name: 'fliegeSuchen' }] },
    { name: 'Fliege', ober: 'Actor', attribute: [], methoden: [] },
  ],
};

export const FAHRZEUGE: KlassenModell = {
  klassen: [
    {
      name: 'Fahrzeug',
      attribute: [
        { name: 'marke', typ: 'String' },
        { name: 'geschwindigkeit', typ: 'int' },
      ],
      methoden: [{ name: 'beschleunigen' }, { name: 'bremsen' }],
    },
    { name: 'Auto', ober: 'Fahrzeug', attribute: [{ name: 'anzahlTueren', typ: 'int' }], methoden: [{ name: 'hupen' }] },
    { name: 'Motorrad', ober: 'Fahrzeug', attribute: [{ name: 'hatBeiwagen', typ: 'boolean' }], methoden: [{ name: 'aufbocken' }] },
    { name: 'Cabrio', ober: 'Auto', attribute: [{ name: 'verdeckOffen', typ: 'boolean' }], methoden: [{ name: 'verdeckOeffnen' }] },
  ],
};

export const TIERE: KlassenModell = {
  klassen: [
    {
      name: 'Tier',
      attribute: [
        { name: 'name', typ: 'String' },
        { name: 'alter', typ: 'int' },
      ],
      methoden: [{ name: 'fressen' }, { name: 'schlafen' }],
    },
    { name: 'Hund', ober: 'Tier', attribute: [{ name: 'rasse', typ: 'String' }], methoden: [{ name: 'bellen' }] },
    { name: 'Vogel', ober: 'Tier', attribute: [{ name: 'spannweite', typ: 'int' }], methoden: [{ name: 'fliegen' }] },
    { name: 'Papagei', ober: 'Vogel', attribute: [{ name: 'wortschatz', typ: 'int' }], methoden: [{ name: 'sprechen' }] },
  ],
};

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Besitzer {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    bemerkungen?: string;
  };
}

export interface Medien {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    menu_name?: string;
    beschreibung?: string;
    kategorie?: LookupValue;
    preis?: number;
    verfuegbar?: boolean;
    besitzer?: string; // applookup -> URL zu 'Besitzer' Record
  };
}

export const APP_IDS = {
  BESITZER: '6a55faba74fae90806c528d5',
  MEDIEN: '6a55fabdd52caf89d0047840',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'medien': {
    kategorie: [{ key: "buch", label: "Buch" }, { key: "zeitschrift", label: "Zeitschrift" }, { key: "film", label: "Film" }, { key: "musik", label: "Musik" }, { key: "sonstiges", label: "Sonstiges" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'besitzer': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'bemerkungen': 'string/textarea',
  },
  'medien': {
    'menu_name': 'string/text',
    'beschreibung': 'string/textarea',
    'kategorie': 'lookup/select',
    'preis': 'number',
    'verfuegbar': 'bool',
    'besitzer': 'applookup/select',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateBesitzer = StripLookup<Besitzer['fields']>;
export type CreateMedien = StripLookup<Medien['fields']>;
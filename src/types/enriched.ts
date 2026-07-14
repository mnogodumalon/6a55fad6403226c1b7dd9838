import type { Medien } from './app';

export type EnrichedMedien = Medien & {
  besitzerName: string;
};

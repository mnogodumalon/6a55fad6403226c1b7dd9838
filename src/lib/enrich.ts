import type { EnrichedMedien } from '@/types/enriched';
import type { Besitzer, Medien } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface MedienMaps {
  besitzerMap: Map<string, Besitzer>;
}

export function enrichMedien(
  medien: Medien[],
  maps: MedienMaps
): EnrichedMedien[] {
  return medien.map(r => ({
    ...r,
    besitzerName: resolveDisplay(r.fields.besitzer, maps.besitzerMap, 'vorname', 'nachname'),
  }));
}

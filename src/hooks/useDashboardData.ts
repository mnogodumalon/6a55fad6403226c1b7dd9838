import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Besitzer, Medien } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [besitzer, setBesitzer] = useState<Besitzer[]>([]);
  const [medien, setMedien] = useState<Medien[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [besitzerData, medienData] = await Promise.all([
        LivingAppsService.getBesitzer(),
        LivingAppsService.getMedien(),
      ]);
      setBesitzer(besitzerData);
      setMedien(medienData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [besitzerData, medienData] = await Promise.all([
          LivingAppsService.getBesitzer(),
          LivingAppsService.getMedien(),
        ]);
        setBesitzer(besitzerData);
        setMedien(medienData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const besitzerMap = useMemo(() => {
    const m = new Map<string, Besitzer>();
    besitzer.forEach(r => m.set(r.record_id, r));
    return m;
  }, [besitzer]);

  return { besitzer, setBesitzer, medien, setMedien, loading, error, fetchAll, besitzerMap };
}
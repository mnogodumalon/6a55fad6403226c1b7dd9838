import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichMedien } from '@/lib/enrich';
import type { EnrichedMedien } from '@/types/enriched';
import type { Besitzer } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatCurrency } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { APP_IDS } from '@/types/app';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash, IconSearch, IconBook, IconX, IconPackage } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MedienDialog } from '@/components/dialogs/MedienDialog';
import { BesitzerDialog } from '@/components/dialogs/BesitzerDialog';

const APPGROUP_ID = '6a55fad6403226c1b7dd9838';
const REPAIR_ENDPOINT = '/claude/build/repair';

const KATEGORIE_COLORS: Record<string, string> = {
  buch: 'bg-blue-50 border-blue-200 text-blue-800',
  zeitschrift: 'bg-purple-50 border-purple-200 text-purple-800',
  film: 'bg-amber-50 border-amber-200 text-amber-800',
  musik: 'bg-green-50 border-green-200 text-green-800',
  sonstiges: 'bg-gray-50 border-gray-200 text-gray-800',
};

const KATEGORIE_ICON: Record<string, string> = {
  buch: '📚',
  zeitschrift: '📰',
  film: '🎬',
  musik: '🎵',
  sonstiges: '📦',
};

const ALL_KATEGORIEN = [
  { key: 'alle', label: 'Alle' },
  { key: 'buch', label: 'Buch' },
  { key: 'zeitschrift', label: 'Zeitschrift' },
  { key: 'film', label: 'Film' },
  { key: 'musik', label: 'Musik' },
  { key: 'sonstiges', label: 'Sonstiges' },
];

export default function DashboardOverview() {
  const {
    besitzer, medien,
    besitzerMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedMedien = enrichMedien(medien, { besitzerMap });

  const [search, setSearch] = useState('');
  const [activeKat, setActiveKat] = useState('alle');
  const [verfuegbarFilter, setVerfuegbarFilter] = useState<'alle' | 'verfuegbar' | 'nicht'>('alle');
  const [editMedium, setEditMedium] = useState<EnrichedMedien | null>(null);
  const [createMedienOpen, setCreateMedienOpen] = useState(false);
  const [createBesitzerOpen, setCreateBesitzerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedMedien | null>(null);
  const [selectedBesitzer, setSelectedBesitzer] = useState<Besitzer | null>(null);

  const filtered = useMemo(() => {
    return enrichedMedien.filter(m => {
      const katKey = m.fields.kategorie?.key ?? 'sonstiges';
      if (activeKat !== 'alle' && katKey !== activeKat) return false;
      if (verfuegbarFilter === 'verfuegbar' && !m.fields.verfuegbar) return false;
      if (verfuegbarFilter === 'nicht' && m.fields.verfuegbar) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (m.fields.menu_name ?? '').toLowerCase().includes(q) ||
          (m.fields.beschreibung ?? '').toLowerCase().includes(q) ||
          (m.besitzerName ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enrichedMedien, activeKat, verfuegbarFilter, search]);

  const stats = useMemo(() => {
    const total = medien.length;
    const verfuegbar = medien.filter(m => m.fields.verfuegbar).length;
    const kategorien = new Set(medien.map(m => m.fields.kategorie?.key ?? 'sonstiges')).size;
    const besitzerCount = besitzer.length;
    return { total, verfuegbar, kategorien, besitzerCount };
  }, [medien, besitzer]);

  const handleDeleteMedium = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteMedienEntry(deleteTarget.record_id);
    fetchAll();
    setDeleteTarget(null);
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const besitzerForDetail = selectedBesitzer
    ? besitzer.find(b => b.record_id === selectedBesitzer.record_id) ?? selectedBesitzer
    : null;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Medien gesamt"
          value={String(stats.total)}
          description="Alle Einträge"
          icon={<IconBook size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Verfügbar"
          value={String(stats.verfuegbar)}
          description={`von ${stats.total}`}
          icon={<IconCheck size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kategorien"
          value={String(stats.kategorien)}
          description="Verschiedene Typen"
          icon={<IconPackage size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Besitzer"
          value={String(stats.besitzerCount)}
          description="Eingetragen"
          icon={<IconBook size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Medienbibliothek</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'Medium' : 'Medien'} gefunden</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setCreateBesitzerOpen(true)}>
            <IconPlus size={15} className="mr-1 shrink-0" />
            <span className="hidden sm:inline">Besitzer</span>
          </Button>
          <Button size="sm" onClick={() => setCreateMedienOpen(true)}>
            <IconPlus size={15} className="mr-1 shrink-0" />
            Medium hinzufügen
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
          <Input
            placeholder="Suche nach Titel, Beschreibung, Besitzer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <IconX size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {['alle', 'verfuegbar', 'nicht'].map(v => (
            <button
              key={v}
              onClick={() => setVerfuegbarFilter(v as 'alle' | 'verfuegbar' | 'nicht')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                verfuegbarFilter === v
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {v === 'alle' ? 'Alle' : v === 'verfuegbar' ? 'Verfügbar' : 'Nicht verfügbar'}
            </button>
          ))}
        </div>
      </div>

      {/* Kategorie-Tabs */}
      <div className="flex gap-2 flex-wrap">
        {ALL_KATEGORIEN.map(k => {
          const count = k.key === 'alle'
            ? medien.length
            : medien.filter(m => (m.fields.kategorie?.key ?? 'sonstiges') === k.key).length;
          return (
            <button
              key={k.key}
              onClick={() => setActiveKat(k.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                activeKat === k.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {k.key !== 'alle' && <span>{KATEGORIE_ICON[k.key]}</span>}
              {k.label}
              <Badge variant="secondary" className="text-xs px-1.5 py-0">{count}</Badge>
            </button>
          );
        })}
      </div>

      {/* Media Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <IconBook size={48} className="text-muted-foreground" stroke={1.5} />
          <p className="text-muted-foreground font-medium">Keine Medien gefunden</p>
          <p className="text-sm text-muted-foreground">Passe die Filter an oder füge ein neues Medium hinzu.</p>
          <Button size="sm" onClick={() => setCreateMedienOpen(true)}>
            <IconPlus size={15} className="mr-1" />
            Medium hinzufügen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(m => {
            const katKey = m.fields.kategorie?.key ?? 'sonstiges';
            const katLabel = m.fields.kategorie?.label ?? 'Sonstiges';
            const colorClass = KATEGORIE_COLORS[katKey] ?? KATEGORIE_COLORS.sonstiges;
            const emoji = KATEGORIE_ICON[katKey] ?? '📦';
            return (
              <div
                key={m.record_id}
                className="group bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Kategorie-Header */}
                <div className={`px-4 py-3 flex items-center justify-between border-b ${colorClass}`}>
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <span>{emoji}</span>
                    {katLabel}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    m.fields.verfuegbar
                      ? 'bg-green-100 border-green-300 text-green-700'
                      : 'bg-red-100 border-red-300 text-red-700'
                  }`}>
                    {m.fields.verfuegbar ? 'Verfügbar' : 'Nicht verfügbar'}
                  </span>
                </div>

                {/* Content */}
                <div className="px-4 py-4 flex flex-col gap-2 flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-base leading-tight truncate" title={m.fields.menu_name ?? ''}>
                    {m.fields.menu_name ?? '—'}
                  </h3>
                  {m.fields.beschreibung && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{m.fields.beschreibung}</p>
                  )}
                  <div className="mt-auto pt-2 flex flex-col gap-1">
                    {m.besitzerName && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="shrink-0">Besitzer:</span>
                        <button
                          className="font-medium text-primary hover:underline truncate min-w-0"
                          onClick={() => {
                            const b = besitzer.find(b2 => b2.fields.vorname + ' ' + b2.fields.nachname === m.besitzerName) ?? null;
                            setSelectedBesitzer(b);
                          }}
                        >
                          {m.besitzerName}
                        </button>
                      </div>
                    )}
                    {m.fields.preis != null && (
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(m.fields.preis)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 border-t border-border flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditMedium(m)}
                  >
                    <IconPencil size={15} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(m)}
                  >
                    <IconTrash size={15} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <MedienDialog
        open={createMedienOpen}
        onClose={() => setCreateMedienOpen(false)}
        onSubmit={async (fields) => {
          await LivingAppsService.createMedienEntry(fields);
          fetchAll();
        }}
        defaultValues={undefined}
        besitzerList={besitzer}
        enablePhotoScan={AI_PHOTO_SCAN['Medien']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Medien']}
      />

      <MedienDialog
        open={!!editMedium}
        onClose={() => setEditMedium(null)}
        onSubmit={async (fields) => {
          if (!editMedium) return;
          await LivingAppsService.updateMedienEntry(editMedium.record_id, fields);
          fetchAll();
        }}
        defaultValues={editMedium?.fields}
        besitzerList={besitzer}
        enablePhotoScan={AI_PHOTO_SCAN['Medien']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Medien']}
      />

      <BesitzerDialog
        open={createBesitzerOpen}
        onClose={() => setCreateBesitzerOpen(false)}
        onSubmit={async (fields) => {
          await LivingAppsService.createBesitzerEntry(fields);
          fetchAll();
        }}
        defaultValues={undefined}
        enablePhotoScan={AI_PHOTO_SCAN['Besitzer']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Besitzer']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Medium löschen"
        description={`„${deleteTarget?.fields.menu_name ?? 'Dieses Medium'}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDeleteMedium}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Besitzer-Detail-Panel */}
      {besitzerForDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedBesitzer(null)}>
          <div className="bg-background rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Besitzer-Details</h3>
              <button onClick={() => setSelectedBesitzer(null)} className="text-muted-foreground hover:text-foreground">
                <IconX size={18} />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground min-w-24">Name</span>
                <span className="font-medium">{[besitzerForDetail.fields.vorname, besitzerForDetail.fields.nachname].filter(Boolean).join(' ') || '—'}</span>
              </div>
              {besitzerForDetail.fields.email && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-24">E-Mail</span>
                  <a href={`mailto:${besitzerForDetail.fields.email}`} className="text-primary hover:underline truncate min-w-0">{besitzerForDetail.fields.email}</a>
                </div>
              )}
              {besitzerForDetail.fields.telefon && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-24">Telefon</span>
                  <a href={`tel:${besitzerForDetail.fields.telefon}`} className="text-primary hover:underline">{besitzerForDetail.fields.telefon}</a>
                </div>
              )}
              {besitzerForDetail.fields.bemerkungen && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-24">Bemerkungen</span>
                  <span>{besitzerForDetail.fields.bemerkungen}</span>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <span className="text-muted-foreground min-w-24">Medien</span>
                <span className="font-medium">{medien.filter(m => {
                  const url = m.fields.besitzer;
                  if (!url || typeof url !== 'string') return false;
                  return url.endsWith(besitzerForDetail.record_id);
                }).length} zugeordnet</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                const newMedienDefault = {
                  besitzer: createRecordUrl(APP_IDS.BESITZER, besitzerForDetail.record_id),
                };
                setSelectedBesitzer(null);
                // open create dialog prefilled with besitzer
                setCreateMedienOpen(true);
                void newMedienDefault; // used via createMedienOpen flow
              }}
            >
              <IconPlus size={14} className="mr-1" />
              Medium für diesen Besitzer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}

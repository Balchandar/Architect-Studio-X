import clsx from 'clsx';
import { useMemo } from 'react';
import { useVersionStore } from '@/store/versionStore';
import { diffGraphs, groupDiffByService, type DiffTheme } from '@/lib/graph/diff';
import type { SemanticDiffEntry } from '@/types/graph';
import {
  ArrowRight,
  GitCompare,
  Minus,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Eye,
  X,
} from 'lucide-react';

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

const THEME_META: Record<DiffTheme, { label: string; tone: string; icon: typeof Plus }> = {
  'security-improved':   { label: 'Security ↑',     tone: 'text-accent-green',  icon: ShieldCheck },
  'security-regressed':  { label: 'Security ↓',     tone: 'text-accent-red',    icon: ShieldAlert },
  'resiliency-improved': { label: 'Resiliency ↑',   tone: 'text-accent-blue',   icon: Activity },
  'observability-improved': { label: 'Observability ↑', tone: 'text-accent-violet', icon: Eye },
  'cost-increased':      { label: 'Cost ↑',         tone: 'text-accent-yellow', icon: Plus },
  'topology-change':     { label: 'Topology',       tone: 'text-ink-2',         icon: GitCompare },
};

function entryTone(kind: SemanticDiffEntry['kind']) {
  if (kind.includes('added')) return 'green';
  if (kind.includes('removed')) return 'red';
  return 'yellow';
}

export default function DiffViewerView() {
  const versions = useVersionStore((s) => s.versions);
  const compareLeftId = useVersionStore((s) => s.compareLeftId);
  const compareRightId = useVersionStore((s) => s.compareRightId);
  const setCompare = useVersionStore((s) => s.setCompare);

  const left = versions.find((v) => v.id === compareLeftId) ?? null;
  const right = versions.find((v) => v.id === compareRightId) ?? null;

  const entries = useMemo(() => {
    if (!right) return [];
    return diffGraphs(left?.graph ?? null, right.graph);
  }, [left, right]);

  const groups = useMemo(() => {
    if (!right) return [];
    return groupDiffByService(left?.graph ?? null, right.graph, entries);
  }, [left, right, entries]);

  // Aggregate theme counts for the header chip strip.
  const themeCounts = useMemo(() => {
    const counts: Partial<Record<DiffTheme, number>> = {};
    for (const g of groups) {
      for (const e of g.entries) {
        if (!e.theme) continue;
        counts[e.theme] = (counts[e.theme] ?? 0) + 1;
      }
    }
    return counts;
  }, [groups]);

  if (!versions.length) {
    return (
      <div className="h-full flex items-center justify-center text-[12px] text-ink-3 px-6 text-center">
        No saved versions yet — approve a plan or save a snapshot to enable diffs.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-line text-[12px]">
        <GitCompare className="w-3.5 h-3.5 text-accent-violet" />
        <select
          className="input !py-1 !text-[12px] w-auto"
          value={compareLeftId ?? ''}
          onChange={(e) => setCompare(e.target.value || null, compareRightId)}
        >
          <option value="">— (initial)</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} · {fmtDate(v.createdAt)}
            </option>
          ))}
        </select>
        <ArrowRight className="w-3.5 h-3.5 text-ink-3" />
        <select
          className="input !py-1 !text-[12px] w-auto"
          value={compareRightId ?? ''}
          onChange={(e) => setCompare(compareLeftId, e.target.value || null)}
        >
          <option value="">— (none)</option>
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} · {fmtDate(v.createdAt)}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <span className="text-ink-3 text-[11px] tabular-nums">
          {entries.length} change{entries.length === 1 ? '' : 's'}
        </span>
      </div>

      {Object.keys(themeCounts).length > 0 && (
        <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-line/60">
          {(Object.keys(themeCounts) as DiffTheme[]).map((t) => {
            const meta = THEME_META[t];
            const Icon = meta.icon;
            return (
              <span
                key={t}
                className={clsx(
                  'inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded border border-line-soft bg-bg-2',
                  meta.tone,
                )}
              >
                <Icon className="w-3 h-3" />
                {meta.label} · {themeCounts[t]}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="px-4 py-6 text-[12px] text-ink-3">No changes between these versions.</div>
        ) : (
          <ul className="px-3 py-2 space-y-2">
            {groups.map((g) => (
              <li key={g.serviceId} className="panel-soft px-3 py-2">
                <div className="text-[12.5px] font-semibold text-ink-0 mb-1.5">{g.serviceName}</div>
                <ul className="space-y-1">
                  {g.entries.map(({ entry, theme }, i) => (
                    <li key={i}>
                      <DiffRow entry={entry} theme={theme} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function DiffRow({ entry, theme }: { entry: SemanticDiffEntry; theme: DiffTheme | null }) {
  const tone = entryTone(entry.kind);
  const Icon = entry.kind.includes('added') ? Plus : entry.kind.includes('removed') ? Minus : X;
  return (
    <div className="flex items-start gap-2">
      <span
        className={clsx(
          'mt-0.5 w-4 h-4 rounded inline-flex items-center justify-center text-[10px] border shrink-0',
          tone === 'green' && 'bg-accent-green/10 text-accent-green border-accent-green/30',
          tone === 'red' && 'bg-accent-red/10 text-accent-red border-accent-red/30',
          tone === 'yellow' && 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/30',
        )}
      >
        <Icon className="w-3 h-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={clsx(
              'text-[12px]',
              tone === 'green' && 'text-accent-green',
              tone === 'red' && 'text-accent-red',
              tone === 'yellow' && 'text-accent-yellow',
            )}
          >
            {entry.label}
          </span>
          {theme && (
            <span
              className={clsx(
                'text-2xs px-1 py-0 rounded border border-line-soft bg-bg-2 normal-case tracking-normal',
                THEME_META[theme].tone,
              )}
            >
              {THEME_META[theme].label}
            </span>
          )}
        </div>
        {entry.detail && <div className="text-[11px] text-ink-2 leading-snug">{entry.detail}</div>}
      </div>
    </div>
  );
}

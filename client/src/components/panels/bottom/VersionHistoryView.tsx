import clsx from 'clsx';
import { Plus, GitCommit } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import { useVersionStore } from '@/store/versionStore';
import { useUIStore } from '@/store/uiStore';
import JsonStatePreview from './JsonStatePreview';

function fmt(date: string) {
  const d = new Date(date);
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function VersionHistoryView() {
  const versions = useVersionStore((s) => s.versions);
  const compareRightId = useVersionStore((s) => s.compareRightId);
  const setCompare = useVersionStore((s) => s.setCompare);
  const restoreVersion = useVersionStore((s) => s.restoreVersion);
  const setGraph = useGraphStore((s) => s.setGraph);
  const showToast = useUIStore((s) => s.showToast);
  const saveVersion = useVersionStore((s) => s.saveVersion);
  const graph = useGraphStore((s) => s.graph);

  const sorted = [...versions].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="h-full flex">
      <div className="w-[400px] border-r border-line h-full flex flex-col">
        <div className="flex items-center justify-end px-3 py-2 border-b border-line">
          <button
            className="text-[11px] inline-flex items-center gap-1.5 text-accent-violet hover:text-accent-blue"
            onClick={() => {
              const v = saveVersion(graph, 'Manual snapshot');
              showToast(`Saved ${v.label}`, 'success');
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            New Version
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {sorted.map((v, i) => {
            const t = fmt(v.createdAt);
            const isLatest = i === 0;
            const selected = v.id === compareRightId;
            return (
              <li key={v.id}>
                <button
                  onDoubleClick={() => {
                    const restored = restoreVersion(v.id);
                    if (restored) {
                      setGraph(restored);
                      showToast(`Restored ${v.label}`, 'success');
                    }
                  }}
                  onClick={() => {
                    const otherIdx = sorted.findIndex((x) => x.id !== v.id);
                    setCompare(sorted[otherIdx]?.id ?? null, v.id);
                  }}
                  className={clsx(
                    'w-full flex items-start gap-2 px-3 py-2 hover:bg-bg-3/40 text-left',
                    selected && 'bg-bg-3/60',
                  )}
                >
                  <div className="mt-0.5">
                    <GitCommit className={clsx('w-3.5 h-3.5', isLatest ? 'text-accent-violet' : 'text-ink-3')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-semibold text-ink-0">{v.label}</span>
                      <span className="text-[12.5px] text-ink-1 truncate">{v.message}</span>
                    </div>
                    <div className="text-[11px] text-ink-3 mt-0.5">
                      {t.date} {t.time}
                      {isLatest && <span className="ml-2 text-accent-violet">You (local)</span>}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex-1 overflow-hidden">
        <JsonStatePreview />
      </div>
    </div>
  );
}

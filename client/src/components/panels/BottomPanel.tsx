import { useUIStore } from '@/store/uiStore';
import clsx from 'clsx';
import VersionHistoryView from './bottom/VersionHistoryView';
import JsonStateView from './bottom/JsonStateView';
import DiffViewerView from './bottom/DiffViewerView';
import EventLogView from './bottom/EventLogView';
import { Minus, Plus } from 'lucide-react';

const TABS = [
  { value: 'history', label: 'Version History' },
  { value: 'json', label: 'JSON State' },
  { value: 'diff', label: 'Diff Viewer' },
  { value: 'events', label: 'Event Log' },
] as const;

export default function BottomPanel() {
  const tab = useUIStore((s) => s.bottomTab);
  const setTab = useUIStore((s) => s.setBottomTab);
  const open = useUIStore((s) => s.bottomPanelOpen);
  const toggle = useUIStore((s) => s.toggleBottomPanel);

  return (
    <div className="flex flex-col">
      <div className="flex items-center px-3 border-t border-line bg-bg-1 h-9 shrink-0">
        <div className="flex items-center gap-4">
          {TABS.map((t) => {
            const active = tab === t.value && open;
            return (
              <button
                key={t.value}
                onClick={() => {
                  if (tab === t.value && open) {
                    toggle();
                  } else {
                    setTab(t.value);
                  }
                }}
                className={clsx(
                  'relative h-9 text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors',
                  active ? 'text-accent-violet' : 'text-ink-2 hover:text-ink-0',
                )}
              >
                {t.label}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent-violet" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <button
          onClick={toggle}
          className="text-ink-2 hover:text-ink-0 inline-flex items-center justify-center w-7 h-7 rounded hover:bg-bg-3"
          title={open ? 'Collapse' : 'Expand'}
        >
          {open ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>
      {open && (
        <div className="h-[260px] bg-bg-1 border-t border-line overflow-hidden">
          {tab === 'history' && <VersionHistoryView />}
          {tab === 'json' && <JsonStateView />}
          {tab === 'diff' && <DiffViewerView />}
          {tab === 'events' && <EventLogView />}
        </div>
      )}
    </div>
  );
}

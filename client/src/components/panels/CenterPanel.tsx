import clsx from 'clsx';
import ArchitectureCanvas from '@/components/canvas/ArchitectureCanvas';
import DataFlowView from './DataFlowView';
import { useUIStore } from '@/store/uiStore';
import { Building2, Workflow } from 'lucide-react';

const TABS = [
  { value: 'canvas' as const, label: 'Architecture Canvas', icon: Building2 },
  { value: 'dataflow' as const, label: 'Data Flow', icon: Workflow },
];

export default function CenterPanel() {
  const tab = useUIStore((s) => s.centerTab);
  const setTab = useUIStore((s) => s.setCenterTab);
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="h-9 shrink-0 flex items-center px-3 gap-1 border-b border-line bg-bg-1">
        {TABS.map((t) => {
          const active = tab === t.value;
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={clsx(
                'relative h-9 px-3 text-[12px] inline-flex items-center gap-1.5 transition-colors',
                active
                  ? 'text-accent-violet'
                  : 'text-ink-2 hover:text-ink-0',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {active && (
                <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-accent-violet rounded" />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex-1 relative bg-bg-0">
        {tab === 'canvas' ? <ArchitectureCanvas /> : <DataFlowView />}
      </div>
    </div>
  );
}

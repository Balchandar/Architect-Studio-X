// Center-canvas toolbar. Pared down to actions that actually mutate the
// graph or affect the viewport — no decorative tool buttons.

import { LayoutGrid, Maximize2, Plus, RotateCcw, RotateCw, type LucideIcon } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useState } from 'react';
import clsx from 'clsx';
import { useGraphStore } from '@/store/graphStore';
import { useUIStore } from '@/store/uiStore';
import type { Runtime, ServiceCategory } from '@/types/graph';

const ADD_TYPES: { type: ServiceCategory; label: string; runtime: Runtime }[] = [
  { type: 'compute', label: 'Compute service', runtime: 'kubernetes' },
  { type: 'data', label: 'Database', runtime: 'managed' },
  { type: 'cache', label: 'Cache', runtime: 'managed' },
  { type: 'queue', label: 'Queue / Event bus', runtime: 'managed' },
  { type: 'gateway', label: 'API Gateway', runtime: 'managed' },
  { type: 'security', label: 'Security service', runtime: 'managed' },
  { type: 'observability', label: 'Observability', runtime: 'kubernetes' },
  { type: 'storage', label: 'Storage', runtime: 'managed' },
  { type: 'external', label: 'External service', runtime: 'managed' },
  { type: 'client', label: 'Client', runtime: 'browser' },
];

interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  iconOnly,
  disabled,
}: ToolButtonProps & { iconOnly?: boolean; disabled?: boolean }) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'h-8 inline-flex items-center gap-1.5 rounded-md text-[12px] text-ink-2 hover:text-ink-0 hover:bg-bg-3 transition-colors',
        iconOnly ? 'w-8 justify-center' : 'px-2',
        disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-ink-2',
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {!iconOnly && <span>{label}</span>}
    </button>
  );
}

export default function CanvasToolbar() {
  const autoLayout = useGraphStore((s) => s.autoLayout);
  const addService = useGraphStore((s) => s.addService);
  const selectNode = useGraphStore((s) => s.selectNode);
  const undo = useGraphStore((s) => s.undo);
  const redo = useGraphStore((s) => s.redo);
  const past = useGraphStore((s) => s.past);
  const future = useGraphStore((s) => s.future);
  const showToast = useUIStore((s) => s.showToast);
  const flow = useReactFlow();
  const [addOpen, setAddOpen] = useState(false);

  const onAdd = (type: ServiceCategory, runtime: Runtime | undefined, label: string) => {
    const id = addService({
      type,
      name: `New ${label}`,
      runtime: runtime ?? 'managed',
      criticality: 'medium',
      tags: [],
    });
    selectNode(id);
    autoLayout();
    setTimeout(() => flow.fitView({ padding: 0.12, duration: 250 }), 50);
    showToast(`Added ${label.toLowerCase()}`, 'success');
    setAddOpen(false);
  };

  return (
    <div className="absolute z-10 left-4 top-4 panel-soft flex items-center gap-0.5 p-1 backdrop-blur bg-bg-1/85">
      <div className="relative">
        <ToolButton icon={Plus} label="Add" onClick={() => setAddOpen((v) => !v)} />
        {addOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setAddOpen(false)} />
            <div className="absolute left-0 top-9 w-56 panel rounded-md shadow-xl z-30 overflow-hidden">
              <div className="px-3 py-1.5 text-2xs uppercase tracking-[0.14em] text-ink-3 border-b border-line-soft">
                Add service
              </div>
              <ul className="py-1">
                {ADD_TYPES.map((t) => (
                  <li key={t.type}>
                    <button
                      className="w-full text-left px-3 py-1.5 text-[12px] text-ink-1 hover:bg-bg-3/50 hover:text-ink-0"
                      onClick={() => onAdd(t.type, t.runtime, t.label)}
                    >
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
      <div className="w-px h-5 bg-line mx-0.5" />
      <ToolButton
        icon={RotateCcw}
        label="Undo"
        iconOnly
        disabled={past.length === 0}
        onClick={() => {
          if (undo()) showToast('Undone', 'info');
        }}
      />
      <ToolButton
        icon={RotateCw}
        label="Redo"
        iconOnly
        disabled={future.length === 0}
        onClick={() => {
          if (redo()) showToast('Redone', 'info');
        }}
      />
      <div className="w-px h-5 bg-line mx-0.5" />
      <ToolButton icon={LayoutGrid} label="Auto layout" onClick={() => autoLayout()} />
      <ToolButton
        icon={Maximize2}
        label="Fit view"
        onClick={() => flow.fitView({ padding: 0.12, duration: 350 })}
      />
    </div>
  );
}

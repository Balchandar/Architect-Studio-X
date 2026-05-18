import {
  Box,
  FileText,
  Layers,
  Settings,
  ShieldCheck,
  TrendingUp,
  Workflow,
} from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { useUIStore } from '@/store/uiStore';

const items = [
  { icon: Layers, label: 'Architecture' },
  { icon: FileText, label: 'Documents' },
  { icon: Workflow, label: 'Flows' },
  { icon: ShieldCheck, label: 'Security' },
  { icon: Box, label: 'Components' },
  { icon: TrendingUp, label: 'Insights' },
];

export default function SideRail() {
  const [active, setActive] = useState(0);
  const openSettings = useUIStore((s) => s.openSettings);

  return (
    <aside className="w-12 shrink-0 bg-bg-1 border-r border-line flex flex-col items-center py-3 gap-1">
      {items.map((it, i) => {
        const Icon = it.icon;
        const isActive = i === active;
        return (
          <button
            key={it.label}
            title={it.label}
            onClick={() => setActive(i)}
            className={clsx(
              'relative w-9 h-9 inline-flex items-center justify-center rounded-md text-ink-2 hover:text-ink-0 hover:bg-bg-3 transition-colors',
              isActive && 'text-ink-0 bg-bg-3',
            )}
          >
            {isActive && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-accent-violet" />
            )}
            <Icon className="w-[18px] h-[18px]" />
          </button>
        );
      })}
      <div className="flex-1" />
      <button
        className="w-9 h-9 inline-flex items-center justify-center rounded-md text-ink-2 hover:text-ink-0 hover:bg-bg-3 transition-colors"
        title="Settings"
        onClick={openSettings}
      >
        <Settings className="w-[18px] h-[18px]" />
      </button>
    </aside>
  );
}

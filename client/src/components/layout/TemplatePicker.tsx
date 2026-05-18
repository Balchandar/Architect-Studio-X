// Architecture template picker. Loads a starter graph through the standard
// pipeline so the load shows up in the event log and can be saved as a
// version.

import { useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { architectureTemplates } from '@/lib/graph/templates';
import { useGraphStore } from '@/store/graphStore';
import { useVersionStore } from '@/store/versionStore';
import { useUIStore } from '@/store/uiStore';
import { useInsightsStore } from '@/store/insightsStore';
import { applyLayout } from '@/lib/graph/layout';

export default function TemplatePicker() {
  const [open, setOpen] = useState(false);
  const setGraph = useGraphStore((s) => s.setGraph);
  const pushEvent = useVersionStore((s) => s.pushEvent);
  const markIdle = useInsightsStore((s) => s.markIdle);
  const showToast = useUIStore((s) => s.showToast);
  const graph = useGraphStore((s) => s.graph);

  const onPick = (id: string) => {
    const tpl = architectureTemplates.find((t) => t.id === id);
    if (!tpl) return;
    const next = applyLayout(tpl.build());
    setGraph(next);
    // Templates land idle; user runs Validate explicitly to review them.
    markIdle();
    pushEvent('graph.template_loaded', `Loaded template: ${tpl.name}`, 'user', {
      templateId: tpl.id,
      previousName: graph.metadata.name,
    });
    showToast(`Loaded "${tpl.name}"`, 'success');
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        className="btn"
        onClick={() => setOpen((v) => !v)}
        title="Load architecture template"
      >
        <Layers className="w-3.5 h-3.5 text-accent-violet" />
        Templates
        <ChevronDown className="w-3 h-3 text-ink-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-72 rounded-md border border-line bg-bg-1 shadow-xl z-40 overflow-hidden">
            <div className="px-3 py-2 text-2xs uppercase tracking-[0.14em] text-ink-3 border-b border-line">
              Starter architectures
            </div>
            <ul>
              {architectureTemplates.map((t) => (
                <li key={t.id}>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-bg-3/40 group"
                    onClick={() => onPick(t.id)}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-[12.5px] font-medium text-ink-0">{t.name}</span>
                      <span className="text-2xs text-ink-3">{t.domain}</span>
                    </div>
                    <div className="text-[11px] text-ink-2 leading-snug mt-0.5">
                      {t.description}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

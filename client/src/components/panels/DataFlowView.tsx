import { useGraphStore } from '@/store/graphStore';
import { ArrowRight } from 'lucide-react';

export default function DataFlowView() {
  const graph = useGraphStore((s) => s.graph);
  return (
    <div className="absolute inset-0 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="section-title mb-3">Data Flow</div>
        <div className="text-[12px] text-ink-2 mb-4 leading-relaxed">
          Derived from the architecture graph. Each row is a directional connection between two
          services with its semantic protocol and encryption metadata.
        </div>
        <div className="panel-soft">
          <div className="grid grid-cols-[1fr_auto_1fr_120px_120px] gap-3 px-4 py-2 border-b border-line text-2xs uppercase tracking-wider text-ink-3">
            <div>Source</div>
            <div />
            <div>Target</div>
            <div>Protocol</div>
            <div>Encryption</div>
          </div>
          <ul>
            {graph.connections.map((c) => {
              const src = graph.services.find((s) => s.id === c.source);
              const dst = graph.services.find((s) => s.id === c.target);
              return (
                <li
                  key={c.id}
                  className="grid grid-cols-[1fr_auto_1fr_120px_120px] gap-3 px-4 py-2 border-b border-line/60 hover:bg-bg-3/30 items-center"
                >
                  <div className="text-[12.5px] text-ink-1 truncate">{src?.name ?? c.source}</div>
                  <ArrowRight className="w-3.5 h-3.5 text-ink-3" />
                  <div className="text-[12.5px] text-ink-1 truncate">{dst?.name ?? c.target}</div>
                  <div className="text-[11px] font-mono text-accent-violet uppercase">{c.protocol}</div>
                  <div className="text-[11px] font-mono text-accent-green uppercase">{c.encryption}</div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

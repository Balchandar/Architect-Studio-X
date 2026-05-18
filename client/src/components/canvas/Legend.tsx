import { palette } from './nodeStyle';

const LEGEND_ITEMS: { label: string; tone: string }[] = [
  { label: 'Edge / Network', tone: palette.gateway.legend },
  { label: 'Compute', tone: palette.compute.legend },
  { label: 'Data Store', tone: palette.data.legend },
  { label: 'Messaging', tone: palette.queue.legend },
  { label: 'External', tone: palette.external.legend },
];

export default function Legend() {
  return (
    <div className="absolute right-4 top-4 z-10 panel-soft px-3 py-2 text-[11px] space-y-1.5 backdrop-blur bg-bg-1/85">
      <div className="text-2xs uppercase tracking-wider text-ink-3 mb-1">Legend</div>
      {LEGEND_ITEMS.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-2 rounded-sm border border-line"
            style={{ background: it.tone, opacity: 0.6 }}
          />
          <span className="text-ink-1">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

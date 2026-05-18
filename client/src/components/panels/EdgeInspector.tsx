// Semantic edge inspector. Shows when a connection is selected; lets the
// user change protocol, encryption, direction, async flag, and label —
// all routed through the mutation executor so undo/redo works.

import { useMemo } from 'react';
import { ArrowLeftRight, Network, Trash2 } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import type { Connection, Protocol } from '@/types/graph';

const PROTOCOLS: Protocol[] = [
  'http',
  'https',
  'grpc',
  'tcp',
  'udp',
  'amqp',
  'kafka',
  'sql',
  'mqtt',
  'graphql',
  'mtls',
];

const ENCRYPTIONS: Connection['encryption'][] = ['none', 'tls', 'mtls'];
const DIRECTIONS: Connection['direction'][] = ['unidirectional', 'bidirectional'];

export default function EdgeInspector() {
  const selectedId = useGraphStore((s) => s.selectedConnectionId);
  const graph = useGraphStore((s) => s.graph);
  const updateConnection = useGraphStore((s) => s.updateConnection);
  const removeConnection = useGraphStore((s) => s.removeConnection);

  const conn = useMemo(
    () => graph.connections.find((c) => c.id === selectedId) ?? null,
    [graph.connections, selectedId],
  );
  if (!conn) return null;

  const sourceName =
    graph.services.find((s) => s.id === conn.source)?.name ?? conn.source;
  const targetName =
    graph.services.find((s) => s.id === conn.target)?.name ?? conn.target;

  const flipDirection = () => {
    updateConnection(conn.id, {
      source: conn.target,
      target: conn.source,
    });
  };

  return (
    <div className="panel-soft mx-3 mb-2.5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line-soft">
        <Network className="w-4 h-4 text-accent-violet" />
        <div className="text-[12.5px] font-semibold text-ink-0 flex-1">Edge</div>
        <button
          className="text-ink-3 hover:text-accent-red"
          title="Delete connection"
          onClick={() => removeConnection(conn.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-2.5 space-y-2.5">
        <div>
          <div className="text-2xs uppercase tracking-[0.14em] text-ink-3 mb-1">Path</div>
          <div className="flex items-center gap-2 text-[12px] text-ink-1">
            <span className="font-medium text-ink-0">{sourceName}</span>
            <span className="text-ink-3">→</span>
            <span className="font-medium text-ink-0">{targetName}</span>
            <button
              type="button"
              className="ml-auto text-ink-3 hover:text-ink-0 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-bg-3/40 transition-colors"
              title="Flip direction (swap source/target)"
              onClick={flipDirection}
            >
              <ArrowLeftRight className="w-3 h-3" />
              Flip
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Protocol">
            <Select
              value={conn.protocol}
              options={PROTOCOLS}
              onChange={(v) => updateConnection(conn.id, { protocol: v as Protocol })}
            />
          </Field>
          <Field label="Encryption">
            <Select
              value={conn.encryption}
              options={ENCRYPTIONS as string[]}
              onChange={(v) =>
                updateConnection(conn.id, { encryption: v as Connection['encryption'] })
              }
            />
          </Field>
          <Field label="Direction">
            <Select
              value={conn.direction}
              options={DIRECTIONS as string[]}
              onChange={(v) =>
                updateConnection(conn.id, { direction: v as Connection['direction'] })
              }
            />
          </Field>
          <Field label="Style">
            <button
              type="button"
              className={`h-6 px-2 rounded-md border text-[11px] w-full ${
                conn.async
                  ? 'bg-accent-violet/15 border-accent-violet/40 text-accent-violet'
                  : 'bg-bg-2 border-line-soft text-ink-3'
              }`}
              onClick={() => updateConnection(conn.id, { async: !conn.async })}
            >
              {conn.async ? 'async (dashed)' : 'sync (solid)'}
            </button>
          </Field>
        </div>

        <Field label="Label">
          <input
            className="input !py-1 text-[12px]"
            value={conn.label ?? ''}
            placeholder="e.g. order events"
            onChange={(e) =>
              updateConnection(conn.id, { label: e.target.value || undefined })
            }
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-[0.14em] text-ink-3 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      className="input !py-1 text-[12px] appearance-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

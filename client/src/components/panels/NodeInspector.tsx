// Semantic node inspector. Surfaces the FULL semantic richness of a service:
// runtime, region, criticality, exposure, encryption, observability, tags,
// upstream/downstream dependencies, and a one-click blast-radius preview.

import { useMemo } from 'react';
import { Boxes, Network, ShieldCheck, Trash2 } from 'lucide-react';
import { useGraphStore } from '@/store/graphStore';
import {
  blastRadius,
  buildAdjacency,
  dependencyTree,
} from '@/lib/graph/queries';
import type { Criticality, Region, Runtime, ServiceCategory, ServiceNode } from '@/types/graph';

const RUNTIMES: Runtime[] = [
  'kubernetes',
  'lambda',
  'ec2',
  'fargate',
  'managed',
  'browser',
  'mobile',
  'on-prem',
  'unknown',
];
const REGIONS: Region[] = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-1',
  'global',
  'multi-region',
];
const CRITICALITY: Criticality[] = ['low', 'medium', 'high', 'critical'];
const CATEGORIES: ServiceCategory[] = [
  'compute',
  'data',
  'gateway',
  'cache',
  'queue',
  'cdn',
  'security',
  'observability',
  'external',
  'client',
  'storage',
];
const EXPOSURES: NonNullable<ServiceNode['exposure']>[] = ['internal', 'public', 'partner'];

export default function NodeInspector() {
  const selectedId = useGraphStore((s) => s.selectedNodeId);
  const graph = useGraphStore((s) => s.graph);
  const updateService = useGraphStore((s) => s.updateService);
  const removeService = useGraphStore((s) => s.removeService);
  const highlight = useGraphStore((s) => s.highlight);
  const selectNode = useGraphStore((s) => s.selectNode);

  const service = useMemo(
    () => graph.services.find((s) => s.id === selectedId) ?? null,
    [graph.services, selectedId],
  );

  const radius = useMemo(
    () => (service ? blastRadius(graph, service.id) : null),
    [graph, service],
  );
  const tree = useMemo(
    () => (service ? dependencyTree(graph, service.id) : null),
    [graph, service],
  );
  const adjacency = useMemo(() => buildAdjacency(graph), [graph]);

  if (!service) return null;

  const upstream = adjacency.incoming.get(service.id) ?? [];
  const downstream = adjacency.outgoing.get(service.id) ?? [];

  return (
    <div className="panel-soft mx-3 mb-2.5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line-soft">
        <Boxes className="w-4 h-4 text-accent-violet" />
        <div className="text-[12.5px] font-semibold text-ink-0 flex-1">Inspector</div>
        <button
          className="text-ink-3 hover:text-accent-red"
          title="Remove service"
          onClick={() => removeService(service.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-2.5 space-y-2.5">
        <Field label="Name">
          <input
            className="input !py-1 text-[12px]"
            value={service.name}
            onChange={(e) => updateService(service.id, { name: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Type">
            <Select
              value={service.type}
              options={CATEGORIES}
              onChange={(v) => updateService(service.id, { type: v as ServiceCategory })}
            />
          </Field>
          <Field label="Criticality">
            <Select
              value={service.criticality}
              options={CRITICALITY}
              onChange={(v) => updateService(service.id, { criticality: v as Criticality })}
            />
          </Field>
          <Field label="Runtime">
            <Select
              value={service.runtime}
              options={RUNTIMES}
              onChange={(v) => updateService(service.id, { runtime: v as Runtime })}
            />
          </Field>
          <Field label="Region">
            <Select
              value={service.region}
              options={REGIONS}
              onChange={(v) => updateService(service.id, { region: v as Region })}
            />
          </Field>
          <Field label="Exposure">
            <Select
              value={service.exposure ?? 'internal'}
              options={EXPOSURES as string[]}
              onChange={(v) =>
                updateService(service.id, { exposure: v as ServiceNode['exposure'] })
              }
            />
          </Field>
          <Field label="Observability">
            <Toggle
              checked={!!service.observability}
              onChange={(v) => updateService(service.id, { observability: v })}
            />
          </Field>
        </div>

        <Field label="Encryption">
          <div className="flex items-center gap-3 text-[11px] text-ink-2">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={!!service.encryption?.atRest}
                onChange={(e) =>
                  updateService(service.id, {
                    encryption: {
                      atRest: e.target.checked,
                      inTransit: service.encryption?.inTransit ?? true,
                    },
                  })
                }
              />
              at-rest
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={!!service.encryption?.inTransit}
                onChange={(e) =>
                  updateService(service.id, {
                    encryption: {
                      atRest: service.encryption?.atRest ?? true,
                      inTransit: e.target.checked,
                    },
                  })
                }
              />
              in-transit
            </label>
            <ShieldCheck className="w-3.5 h-3.5 text-accent-green ml-auto" />
          </div>
        </Field>

        <Field label="Tags">
          <div className="flex flex-wrap gap-1">
            {(service.tags ?? []).map((t) => (
              <span
                key={t}
                className="text-2xs px-1.5 py-0.5 rounded border border-line-soft bg-bg-2 text-ink-2"
              >
                {t}
              </span>
            ))}
            {(service.tags ?? []).length === 0 && (
              <span className="text-2xs text-ink-3">no tags</span>
            )}
          </div>
        </Field>

        <div className="border-t border-line-soft pt-2.5 space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-ink-1">
            <Network className="w-3.5 h-3.5 text-accent-blue" />
            <span className="font-medium">Dependencies</span>
          </div>

          <DependencyList
            label={`Upstream (${upstream.length})`}
            entries={(tree?.upstream ?? []).map((e) => ({
              id: e.service?.id ?? '',
              name: e.service?.name ?? e.connection.source,
              protocol: e.connection.protocol,
            }))}
            onHover={(ids) => highlight(ids)}
            onSelect={(id) => selectNode(id)}
          />
          <DependencyList
            label={`Downstream (${downstream.length})`}
            entries={(tree?.downstream ?? []).map((e) => ({
              id: e.service?.id ?? '',
              name: e.service?.name ?? e.connection.target,
              protocol: e.connection.protocol,
            }))}
            onHover={(ids) => highlight(ids)}
            onSelect={(id) => selectNode(id)}
          />
        </div>

        {radius && (
          <button
            className="text-[11px] text-accent-violet hover:text-accent-blue"
            onMouseEnter={() => highlight(radius.affectedIds)}
            onMouseLeave={() => highlight([])}
          >
            Blast radius: {radius.affectedIds.length} affected
            {radius.criticalAffectedIds.length
              ? ` (${radius.criticalAffectedIds.length} critical)`
              : ''}
            {' →'}
          </button>
        )}
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

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`h-6 px-2 rounded-md border text-[11px] ${
        checked
          ? 'bg-accent-green/15 border-accent-green/40 text-accent-green'
          : 'bg-bg-2 border-line-soft text-ink-3'
      }`}
      onClick={() => onChange(!checked)}
    >
      {checked ? 'on' : 'off'}
    </button>
  );
}

function DependencyList({
  label,
  entries,
  onHover,
  onSelect,
}: {
  label: string;
  entries: { id: string; name: string; protocol: string }[];
  onHover: (ids: string[]) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-[0.14em] text-ink-3 mb-1">{label}</div>
      {entries.length === 0 ? (
        <div className="text-[11px] text-ink-3">none</div>
      ) : (
        <ul className="space-y-1">
          {entries.map((e) => (
            <li key={e.id + e.protocol} className="flex items-center gap-2">
              <button
                className="text-[12px] text-ink-1 hover:text-accent-violet truncate flex-1 text-left"
                onMouseEnter={() => onHover([e.id])}
                onMouseLeave={() => onHover([])}
                onClick={() => onSelect(e.id)}
              >
                {e.name}
              </button>
              <span className="text-2xs px-1.5 py-0.5 rounded bg-bg-2 border border-line-soft text-ink-3 font-mono">
                {e.protocol}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

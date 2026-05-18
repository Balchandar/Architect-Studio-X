import { Handle, Position, type NodeProps } from '@xyflow/react';
import clsx from 'clsx';
import type { ServiceNode } from '@/types/graph';
import { getServiceIcon } from './nodeIcons';
import { palette } from './nodeStyle';

export interface ServiceNodeData {
  service: ServiceNode;
  highlighted?: boolean;
  selected?: boolean;
}

export default function ServiceNodeView(props: NodeProps) {
  const { service, highlighted } = (props.data as unknown) as ServiceNodeData;
  const selected = props.selected;
  const Icon = getServiceIcon(service);
  const p = palette[service.type];

  const isCompact =
    service.type === 'client' || service.type === 'external' || service.type === 'observability';

  return (
    <div
      className={clsx(
        'group relative rounded-lg border bg-bg-1/95 backdrop-blur',
        'shadow-[0_2px_18px_-12px_rgba(0,0,0,0.8)]',
        'transition-[box-shadow,border-color,transform] duration-150 will-change-transform',
        'hover:-translate-y-[1px] hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.9)]',
        p.ring,
        selected &&
          'ring-2 ring-accent-violet/80 border-accent-violet/70 shadow-[0_0_0_3px_rgba(139,108,246,0.18)]',
        highlighted && !selected && 'ring-2 ring-accent-yellow/60 border-accent-yellow/40',
      )}
      style={{ minWidth: isCompact ? 150 : 180 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-ink-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-ink-3" />

      <div className="flex items-center gap-2.5 px-3 py-2">
        <div
          className={clsx(
            'shrink-0 w-8 h-8 rounded-md flex items-center justify-center border',
            p.bg,
            p.ring,
          )}
        >
          <Icon className={clsx('w-[18px] h-[18px]', p.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-ink-0 leading-tight truncate">
            {service.name}
          </div>
          <div className={clsx('text-[10px] mt-0.5 truncate', p.badge)}>
            {p.label}
            {service.runtime && service.runtime !== 'unknown' && service.runtime !== 'managed' && (
              <span className="text-ink-3"> · {service.runtime}</span>
            )}
          </div>
        </div>
        {service.criticality === 'critical' && (
          <div
            title="Critical"
            className="w-1.5 h-1.5 rounded-full bg-accent-red shadow-[0_0_8px_2px_rgba(248,113,113,0.5)]"
          />
        )}
      </div>
    </div>
  );
}

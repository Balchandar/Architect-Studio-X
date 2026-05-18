import type { NodeProps } from '@xyflow/react';

export interface GroupNodeData {
  label: string;
  width: number;
  height: number;
  tone?: 'violet' | 'green' | 'cyan' | 'orange' | 'pink' | 'neutral';
}

const toneMap: Record<NonNullable<GroupNodeData['tone']>, string> = {
  violet: 'border-accent-violet/30 text-accent-violet/90',
  green: 'border-accent-green/30 text-accent-green/90',
  cyan: 'border-accent-cyan/30 text-accent-cyan/90',
  orange: 'border-accent-orange/30 text-accent-orange/90',
  pink: 'border-accent-pink/30 text-accent-pink/90',
  neutral: 'border-line-strong text-ink-2',
};

export default function GroupNodeView(props: NodeProps) {
  const { label, width, height, tone = 'neutral' } = (props.data as unknown) as GroupNodeData;
  return (
    <div
      className={`relative rounded-xl border-2 border-dashed ${toneMap[tone]} bg-white/[0.012]`}
      style={{ width, height }}
    >
      <div className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-md bg-bg-1 border border-line text-[10px] tracking-wider uppercase text-ink-2">
        {label}
      </div>
    </div>
  );
}

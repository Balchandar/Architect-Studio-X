import clsx from 'clsx';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'neutral' | 'violet' | 'red' | 'yellow' | 'green' | 'blue' | 'cyan' | 'orange';

interface ChipProps {
  children: ReactNode;
  tone?: Tone;
  onRemove?: () => void;
  icon?: ReactNode;
  className?: string;
}

const toneClass: Record<Tone, string> = {
  neutral: 'bg-bg-3 border-line-soft text-ink-1',
  violet: 'bg-accent-violet/10 border-accent-violet/30 text-accent-violet',
  red: 'bg-accent-red/10 border-accent-red/30 text-accent-red',
  yellow: 'bg-accent-yellow/10 border-accent-yellow/30 text-accent-yellow',
  green: 'bg-accent-green/10 border-accent-green/30 text-accent-green',
  blue: 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue',
  cyan: 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan',
  orange: 'bg-accent-orange/10 border-accent-orange/30 text-accent-orange',
};

export default function Chip({ children, tone = 'neutral', onRemove, icon, className }: ChipProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px]',
        toneClass[tone],
        className,
      )}
    >
      {icon}
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 -mr-0.5 text-current/60 hover:text-current"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

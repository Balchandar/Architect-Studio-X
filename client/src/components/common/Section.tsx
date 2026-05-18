import { ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useState, type ReactNode } from 'react';

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
  dense?: boolean;
}

export default function Section({
  title,
  defaultOpen = true,
  rightSlot,
  children,
  className,
  dense,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={clsx('border-b border-line/70', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'w-full flex items-center justify-between gap-2 text-left',
          dense ? 'px-3 py-2' : 'px-3 py-2.5',
        )}
      >
        <span className="section-title">{title}</span>
        <span className="flex items-center gap-1.5 text-ink-3">
          {rightSlot}
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>
      {open && <div className={clsx(dense ? 'px-3 pb-2.5' : 'px-3 pb-3')}>{children}</div>}
    </div>
  );
}

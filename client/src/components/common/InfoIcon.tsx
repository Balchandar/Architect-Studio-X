import { Info } from 'lucide-react';

export default function InfoIcon({ title }: { title?: string }) {
  return (
    <span title={title} className="text-ink-3 hover:text-ink-1 cursor-help">
      <Info className="w-3.5 h-3.5" />
    </span>
  );
}

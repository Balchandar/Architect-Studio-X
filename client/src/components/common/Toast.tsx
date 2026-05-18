import { useEffect } from 'react';
import clsx from 'clsx';
import { useUIStore } from '@/store/uiStore';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

export default function Toast() {
  const toast = useUIStore((s) => s.toast);
  const clear = useUIStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clear, 2400);
    return () => clearTimeout(t);
  }, [toast, clear]);

  if (!toast) return null;

  const Icon =
    toast.tone === 'success'
      ? CheckCircle2
      : toast.tone === 'warning'
      ? AlertTriangle
      : toast.tone === 'error'
      ? XCircle
      : Info;
  const color =
    toast.tone === 'success'
      ? 'text-accent-green'
      : toast.tone === 'warning'
      ? 'text-accent-yellow'
      : toast.tone === 'error'
      ? 'text-accent-red'
      : 'text-accent-violet';

  return (
    <div className="fixed bottom-6 right-6 z-50 panel px-3 py-2 flex items-center gap-2 shadow-glow text-[12.5px]">
      <Icon className={clsx('w-4 h-4', color)} />
      <span className="text-ink-0">{toast.message}</span>
    </div>
  );
}

import { useVersionStore } from '@/store/versionStore';
import clsx from 'clsx';
import {
  Activity,
  GitCommit,
  Save,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Layers,
  Bot,
  Wand2,
  Check,
  X,
} from 'lucide-react';
import type { ArchitectureEventKind } from '@/types/version';

const iconByKind: Record<ArchitectureEventKind, typeof Activity> = {
  'version.saved': Save,
  'version.restored': GitCommit,
  'graph.generated': Sparkles,
  'graph.validated': ShieldCheck,
  'graph.template_loaded': Layers,
  'service.added': Activity,
  'service.removed': Activity,
  'service.updated': Activity,
  'connection.added': Activity,
  'connection.removed': Activity,
  'mutation.applied': Wand2,
  'plan.proposed': Bot,
  'plan.approved': Check,
  'plan.rejected': X,
  'ai.suggestion': Sparkles,
};

const colorByActor: Record<string, string> = {
  ai: 'text-accent-violet',
  user: 'text-accent-blue',
  system: 'text-ink-3',
};

export default function EventLogView() {
  const events = useVersionStore((s) => s.events);
  return (
    <div className="h-full overflow-y-auto">
      <ul>
        {events.map((e) => {
          const Icon = iconByKind[e.kind] ?? Activity;
          const actor = e.actor ?? 'user';
          return (
            <li
              key={e.id}
              className="px-3 py-2 flex items-center gap-2 border-b border-line/60 hover:bg-bg-3/30 group"
            >
              <Icon className={clsx('w-3.5 h-3.5 shrink-0', colorByActor[actor])} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-ink-1">{e.message}</div>
                <div className="text-[11px] text-ink-3 font-mono flex items-center gap-2">
                  <span>{e.kind}</span>
                  <span className="text-ink-3">·</span>
                  <span className={clsx(colorByActor[actor])}>{actor}</span>
                </div>
              </div>
              <span className="text-[11px] text-ink-3 tabular-nums">
                {new Date(e.at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <ChevronRight
                className={clsx(
                  'w-3.5 h-3.5 text-ink-3 opacity-0 group-hover:opacity-100',
                )}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

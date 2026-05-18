// Inline-edit project name. Click to enter edit mode, Enter / blur to
// commit, Esc to cancel. Saves directly to graph.metadata.name.

import { useEffect, useRef, useState } from 'react';
import { useGraphStore } from '@/store/graphStore';
import { useUIStore } from '@/store/uiStore';

export default function ProjectNameEdit() {
  const name = useGraphStore((s) => s.graph.metadata.name);
  const setGraphName = useGraphStore((s) => s.setGraphName);
  const showToast = useUIStore((s) => s.showToast);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== name) {
      setGraphName(next);
      showToast('Project renamed', 'success');
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          else if (e.key === 'Escape') cancel();
        }}
        className="ml-2 h-8 px-2 rounded-md bg-bg-2 border border-line-soft text-[13px] font-medium text-ink-0 outline-none focus:ring-1 focus:ring-accent-violet/60 focus:border-accent-violet/60 min-w-[160px]"
      />
    );
  }
  return (
    <button
      className="ml-2 flex items-center gap-2 px-3 h-8 rounded-md hover:bg-bg-3 text-ink-1 text-[13px] transition-colors"
      title="Click to rename project"
      onClick={() => setEditing(true)}
    >
      <span className="font-medium text-ink-0">{name}</span>
    </button>
  );
}

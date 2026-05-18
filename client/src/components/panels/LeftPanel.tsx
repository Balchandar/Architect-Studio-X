import { CheckCircle2, ChevronsLeft, RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';
import Section from '@/components/common/Section';
import InfoIcon from '@/components/common/InfoIcon';
import AutocompleteInput from '@/components/common/AutocompleteInput';
import { useIntentStore } from '@/store/intentStore';
import { useGraphStore } from '@/store/graphStore';
import { useVersionStore } from '@/store/versionStore';
import { useInsightsStore } from '@/store/insightsStore';
import { useUIStore } from '@/store/uiStore';
import {
  budgetSuggestions,
  scaleRpsSuggestions,
  scaleUserSuggestions,
} from '@/lib/intent/suggestions';
import Chip from '@/components/common/Chip';

function ChipList({
  items,
  onRemove,
  onAdd,
  tone = 'neutral',
  placeholder,
}: {
  items: string[];
  onRemove: (item: string) => void;
  onAdd: (item: string) => void;
  tone?: 'neutral' | 'violet' | 'red' | 'yellow' | 'green' | 'blue' | 'cyan' | 'orange';
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((it) => (
          <Chip key={it} tone={tone} onRemove={() => onRemove(it)}>
            {it}
          </Chip>
        ))}
      </div>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const v = draft.trim();
            if (v && !items.includes(v)) onAdd(v);
            setDraft('');
          } else if (e.key === 'Backspace' && draft === '' && items.length > 0) {
            // Backspace on empty input removes the last chip.
            onRemove(items[items.length - 1]);
          }
        }}
        placeholder={placeholder ?? '+ add'}
        className="input !py-1 text-[12px]"
      />
    </div>
  );
}

function BulletConstraints() {
  const constraints = useIntentStore((s) => s.constraints);
  const removeListItem = useIntentStore((s) => s.removeListItem);
  const addListItem = useIntentStore((s) => s.addListItem);
  const [draft, setDraft] = useState('');
  return (
    <div className="space-y-1.5">
      {constraints.map((c) => (
        <div key={c} className="group flex items-center gap-2 text-[12px] text-ink-1">
          <span className="pulse-dot bg-accent-green" />
          <span className="flex-1">{c}</span>
          <button
            className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-ink-1 text-2xs"
            onClick={() => removeListItem('constraints', c)}
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const v = draft.trim();
            if (v && !constraints.includes(v)) addListItem('constraints', v);
            setDraft('');
          } else if (e.key === 'Backspace' && draft === '' && constraints.length > 0) {
            removeListItem('constraints', constraints[constraints.length - 1]);
          }
        }}
        placeholder="+ add constraint"
        className="input !py-1 text-[12px]"
      />
    </div>
  );
}

export default function LeftPanel() {
  const intent = useIntentStore();
  const graph = useGraphStore((s) => s.graph);
  const recompute = useInsightsStore((s) => s.recompute);
  const saveVersion = useVersionStore((s) => s.saveVersion);
  const pushEvent = useVersionStore((s) => s.pushEvent);
  const showToast = useUIStore((s) => s.showToast);
  const dirty = useUIStore((s) => s.dirty);
  const setDirty = useUIStore((s) => s.setDirty);
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel);

  const blank = graph.services.length === 0;

  const onValidate = () => {
    recompute();
    pushEvent('graph.validated', 'Validation engine executed');
    showToast('Validation complete', 'success');
  };

  const onSave = () => {
    const v = saveVersion(graph, 'Manual snapshot');
    setDirty(false);
    showToast(`Saved ${v.label}`, 'success');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-3 flex items-center justify-between border-b border-line/70 shrink-0">
        <div className="flex items-center gap-2">
          <span className="section-title">Requirements & Intent</span>
          <InfoIcon title="Structured architecture intent inputs" />
        </div>
        <div className="flex items-center gap-1">
          <button
            className="text-ink-3 hover:text-ink-0 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-bg-3/40 transition-colors"
            title="Clear all intent fields"
            onClick={() => {
              intent.clearInputs();
              showToast('Intent cleared', 'info');
            }}
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <button
            className="text-ink-3 hover:text-ink-0 inline-flex items-center justify-center w-6 h-6 rounded hover:bg-bg-3/40 transition-colors"
            title="Collapse left panel"
            aria-label="Collapse left panel"
            onClick={toggleLeftPanel}
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable: intent inputs */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pt-2.5 pb-1 text-[11px] text-ink-3 leading-snug">
          Optional. Intent inputs steer AI proposals but the workspace works
          without them.
        </div>

        <Section title="Constraints" defaultOpen>
          <BulletConstraints />
        </Section>

        <Section
          title="Preferred Stack"
          defaultOpen={intent.preferredStack.length > 0}
        >
          <ChipList
            items={intent.preferredStack}
            tone="violet"
            onRemove={(i) => intent.removeListItem('preferredStack', i)}
            onAdd={(i) => intent.addListItem('preferredStack', i)}
            placeholder="+ tech"
          />
        </Section>

        <Section title="Avoid" defaultOpen={intent.avoid.length > 0}>
          <ChipList
            items={intent.avoid}
            tone="red"
            onRemove={(i) => intent.removeListItem('avoid', i)}
            onAdd={(i) => intent.addListItem('avoid', i)}
            placeholder="+ avoid"
          />
        </Section>

        <Section
          title="Compliance"
          defaultOpen={intent.compliance.length > 0}
        >
          <ChipList
            items={intent.compliance}
            tone="violet"
            onRemove={(i) => intent.removeListItem('compliance', i)}
            onAdd={(i) => intent.addListItem('compliance', i)}
            placeholder="+ standard"
          />
        </Section>

        <Section
          title="Scale"
          defaultOpen={Boolean(intent.scaleUsers || intent.scalePeakRps)}
        >
          <div className="space-y-2">
            <div>
              <div className="text-2xs uppercase tracking-[0.14em] text-ink-3 mb-1">Users</div>
              <AutocompleteInput
                value={intent.scaleUsers}
                onChange={(v) => intent.setField('scaleUsers', v)}
                suggestions={scaleUserSuggestions}
                placeholder="e.g. 10M+ Users"
                className="!py-1 text-[12px]"
              />
            </div>
            <div>
              <div className="text-2xs uppercase tracking-[0.14em] text-ink-3 mb-1">
                Throughput
              </div>
              <AutocompleteInput
                value={intent.scalePeakRps}
                onChange={(v) => intent.setField('scalePeakRps', v)}
                suggestions={scaleRpsSuggestions}
                placeholder="e.g. Peak: 50K RPS"
                className="!py-1 text-[12px]"
              />
            </div>
          </div>
        </Section>

        <Section title="Budget" defaultOpen={Boolean(intent.budget)}>
          <AutocompleteInput
            value={intent.budget}
            onChange={(v) => intent.setField('budget', v)}
            suggestions={budgetSuggestions}
            placeholder="e.g. < $120K / month"
            className="!py-1 text-[12px]"
          />
        </Section>
      </div>

      {/* Footer */}
      <div className="p-3 space-y-2 border-t border-line/70 bg-bg-1/60 shrink-0">
        <button
          className="btn btn-primary w-full !py-2"
          onClick={onValidate}
          disabled={blank}
          title={blank ? 'Add at least one service to validate' : 'Run deterministic validation'}
        >
          <CheckCircle2 className="w-4 h-4 text-accent-green" />
          Validate Architecture
        </button>
        <button
          className="btn w-full !py-2"
          onClick={onSave}
          disabled={blank || !dirty}
          title={
            blank
              ? 'Nothing to save — workspace is empty'
              : !dirty
                ? 'No unsaved changes'
                : 'Snapshot the current graph as a new version'
          }
        >
          <Save className="w-4 h-4" />
          Save Version
        </button>
      </div>
    </div>
  );
}

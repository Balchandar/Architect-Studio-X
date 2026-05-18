// Bottom compose bar. ChatGPT/Claude-style sticky input that triggers
// the planner pipeline. Lives below the BottomPanel and spans the
// center column. No attachments, suggestions, or banners — just model
// selector, multiline input, send.

import { ArrowUp, Check, ChevronDown, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useIntentStore } from '@/store/intentStore';
import { useMutationStore } from '@/store/mutationStore';
import type { IntentState } from '@/types/intent';
import { usePlanner } from '@/hooks/usePlanner';
import { MODEL_OPTIONS, getModelOption } from '@/lib/ai/models';

const MAX_TEXTAREA_HEIGHT = 200;

export default function ComposeBar() {
  const model = useIntentStore((s) => s.model);
  const setModel = useIntentStore((s) => s.setModel);
  const prompt = useMutationStore((s) => s.plannerPrompt);
  const setPrompt = useMutationStore((s) => s.setPlannerPrompt);
  const { composePlan, isPlanning } = usePlanner();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Auto-resize: reset to auto then snap to scrollHeight, capped at the
  // max-height. Internal scroll kicks in beyond that.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [prompt]);

  // Re-focus the textarea when planning settles so the user can keep
  // typing without clicking.
  useEffect(() => {
    if (!isPlanning) textareaRef.current?.focus();
  }, [isPlanning]);

  const canSend = prompt.trim().length > 0 && !isPlanning;
  const activeOption = getModelOption(model);

  const send = async () => {
    if (!canSend) return;
    await composePlan();
    setPrompt('');
    textareaRef.current?.focus();
  };

  const pickModel = (value: IntentState['model']) => {
    setModel(value);
    setPickerOpen(false);
  };

  return (
    <div className="shrink-0 border-t border-line bg-bg-1/80 backdrop-blur px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 panel-soft px-2 py-1.5 focus-within:border-accent-violet/40 transition-colors">
          {/* Model selector */}
          <div className="relative shrink-0 self-end">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              disabled={isPlanning}
              title="AI model"
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              className={clsx(
                'h-9 inline-flex items-center gap-1.5 pl-2.5 pr-2 text-[12px] rounded-md border transition-colors',
                'bg-bg-2 border-line-soft text-ink-1 hover:text-ink-0 hover:border-line',
                'focus:outline-none focus:ring-1 focus:ring-accent-violet/40 focus:border-accent-violet/40',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              <span className="truncate max-w-[120px]">{activeOption.label}</span>
              <ChevronDown
                className={clsx(
                  'w-3 h-3 text-ink-3 transition-transform',
                  pickerOpen && 'rotate-180',
                )}
              />
            </button>
            {pickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setPickerOpen(false)}
                />
                <div
                  role="listbox"
                  className="absolute left-0 bottom-full mb-1.5 z-40 w-72 rounded-md border border-line bg-bg-1 shadow-xl overflow-hidden"
                >
                  <div className="px-3 py-2 text-2xs uppercase tracking-[0.14em] text-ink-3 border-b border-line">
                    AI model
                  </div>
                  <ul className="max-h-64 overflow-y-auto">
                    {MODEL_OPTIONS.map((o) => {
                      const active = o.value === model;
                      return (
                        <li key={o.value}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => pickModel(o.value)}
                            className={clsx(
                              'w-full text-left px-3 py-2 transition-colors flex items-start gap-2',
                              active
                                ? 'bg-accent-violet/10 text-ink-0'
                                : 'text-ink-1 hover:bg-bg-3/60 hover:text-ink-0',
                            )}
                          >
                            <span className="mt-0.5 w-3.5 shrink-0 text-accent-violet">
                              {active && <Check className="w-3.5 h-3.5" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[12.5px] font-medium">
                                {o.label}
                              </span>
                              <span className="block text-[11px] text-ink-3 leading-snug mt-0.5">
                                {o.description}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Compose textarea */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            disabled={isPlanning}
            placeholder="Describe an architectural change…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-[13px] text-ink-0 placeholder:text-ink-3 leading-snug py-2 px-1 focus:outline-none disabled:opacity-60"
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
          />

          {/* Send */}
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            title={isPlanning ? 'Composing…' : 'Send (Enter)'}
            className={clsx(
              'shrink-0 self-end w-9 h-9 inline-flex items-center justify-center rounded-md transition-colors',
              canSend
                ? 'bg-accent-violet text-white hover:bg-accent-violet/90'
                : 'bg-bg-3 text-ink-3 cursor-not-allowed',
            )}
          >
            {isPlanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

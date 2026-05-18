// Settings modal — Appearance + Models. Mounted once at App level and
// driven by uiStore.settingsOpen. Stores user-tweakable provider config
// in localStorage so it survives reloads.
//
// Provider config is held as a draft until the user clicks Save, which
// commits to localStorage and shows a success toast. The active model
// selector is synced live with the intent store so the compose bar
// always reflects the same value.

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Moon, Settings, Sun, X } from 'lucide-react';
import clsx from 'clsx';
import { useUIStore, type Theme } from '@/store/uiStore';
import { useIntentStore } from '@/store/intentStore';
import { MODEL_OPTIONS } from '@/lib/ai/models';
import type { AIModel } from '@/types/intent';

const STORAGE_KEY = 'asx.providers';

interface ProviderSettings {
  openaiBaseURL: string;
  openrouterBaseURL: string;
  azureBaseURL: string;
  customBaseURL: string;
  ollamaBaseURL: string;
  // API keys are stored locally only — never leave the browser unless the
  // user explicitly POSTs through the proxy. The server-side proxy reads
  // its own env vars; these fields are a personal-reminder convenience.
  openaiKey: string;
  openrouterKey: string;
  azureKey: string;
  customKey: string;
}

const DEFAULTS: ProviderSettings = {
  openaiBaseURL: 'https://api.openai.com/v1',
  openrouterBaseURL: 'https://openrouter.ai/api/v1',
  azureBaseURL: '',
  customBaseURL: '',
  ollamaBaseURL: 'http://localhost:11434',
  openaiKey: '',
  openrouterKey: '',
  azureKey: '',
  customKey: '',
};

function loadSettings(): ProviderSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function saveSettings(s: ProviderSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function settingsEqual(a: ProviderSettings, b: ProviderSettings): boolean {
  return (Object.keys(DEFAULTS) as (keyof ProviderSettings)[]).every(
    (k) => a[k] === b[k],
  );
}

type Section = 'preferences' | 'models';
type SaveStatus = 'idle' | 'saved';

export default function SettingsModal() {
  const open = useUIStore((s) => s.settingsOpen);
  const close = useUIStore((s) => s.closeSettings);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const showToast = useUIStore((s) => s.showToast);
  const activeModel = useIntentStore((s) => s.model);
  const setActiveModel = useIntentStore((s) => s.setModel);

  const [section, setSection] = useState<Section>('preferences');
  const [persisted, setPersisted] = useState<ProviderSettings>(loadSettings);
  const [draft, setDraft] = useState<ProviderSettings>(loadSettings);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setSection('preferences');
      const fresh = loadSettings();
      setPersisted(fresh);
      setDraft(fresh);
      setSaveStatus('idle');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Saved confirmation auto-clears so the button doesn't stay green forever.
  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const t = setTimeout(() => setSaveStatus('idle'), 2200);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const dirty = useMemo(() => !settingsEqual(draft, persisted), [draft, persisted]);

  if (!open) return null;

  const updateDraft = (key: keyof ProviderSettings, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (saveStatus === 'saved') setSaveStatus('idle');
  };

  const onSave = () => {
    saveSettings(draft);
    setPersisted(draft);
    setSaveStatus('saved');
    showToast('Model settings saved', 'success');
  };

  const onReset = () => {
    setDraft(persisted);
    setSaveStatus('idle');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-3xl bg-bg-1 border border-line rounded-xl shadow-2xl overflow-hidden flex max-h-[80vh] animate-[fadeIn_120ms_ease-out]">
        {/* Sidebar */}
        <nav className="w-44 shrink-0 border-r border-line bg-bg-2/50 py-3">
          <div className="px-3 pb-2 text-2xs uppercase tracking-[0.14em] text-ink-3 flex items-center gap-1.5">
            <Settings className="w-3 h-3" /> Settings
          </div>
          <SidebarItem
            label="General · Preferences"
            active={section === 'preferences'}
            onClick={() => setSection('preferences')}
          />
          <SidebarItem
            label="Models"
            active={section === 'models'}
            onClick={() => setSection('models')}
          />
        </nav>

        {/* Body */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center px-5 py-3 border-b border-line">
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-ink-0">
                {section === 'preferences' ? 'Preferences' : 'Models'}
              </div>
              <div className="text-[12px] text-ink-2 mt-0.5">
                {section === 'preferences'
                  ? 'Appearance and workspace preferences.'
                  : 'Active model selection and provider endpoints.'}
              </div>
            </div>
            <button
              className="text-ink-3 hover:text-ink-0 transition-colors"
              onClick={close}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            {section === 'preferences' && (
              <Field
                label="Appearance"
                hint="Light theme is a community preview — some accent colors are tuned for dark mode."
              >
                <div className="grid grid-cols-2 gap-2 max-w-md">
                  <ThemeChoice
                    icon={<Moon className="w-4 h-4" />}
                    label="Dark"
                    value="dark"
                    current={theme}
                    onSelect={setTheme}
                  />
                  <ThemeChoice
                    icon={<Sun className="w-4 h-4" />}
                    label="Light"
                    value="light"
                    current={theme}
                    onSelect={setTheme}
                  />
                </div>
              </Field>
            )}

            {section === 'models' && (
              <>
                <Field
                  label="Active model"
                  hint="Used by the compose bar. Changes here are reflected immediately in the workspace."
                >
                  <ModelPicker
                    value={activeModel}
                    onChange={setActiveModel}
                  />
                </Field>

                <Field
                  label="OpenAI"
                  hint="Used for GPT models. The server reads OPENAI_API_KEY at runtime; values entered here are remembered in this browser only."
                >
                  <Input
                    placeholder="https://api.openai.com/v1"
                    value={draft.openaiBaseURL}
                    onChange={(v) => updateDraft('openaiBaseURL', v)}
                  />
                  <Input
                    type="password"
                    placeholder="API key"
                    value={draft.openaiKey}
                    onChange={(v) => updateDraft('openaiKey', v)}
                  />
                </Field>

                <Field
                  label="OpenRouter"
                  hint="Default channel for Claude and Gemini."
                >
                  <Input
                    placeholder="https://openrouter.ai/api/v1"
                    value={draft.openrouterBaseURL}
                    onChange={(v) => updateDraft('openrouterBaseURL', v)}
                  />
                  <Input
                    type="password"
                    placeholder="API key"
                    value={draft.openrouterKey}
                    onChange={(v) => updateDraft('openrouterKey', v)}
                  />
                </Field>

                <Field
                  label="Ollama (local)"
                  hint="Local Ollama instance. Default: http://localhost:11434"
                >
                  <Input
                    placeholder="http://localhost:11434"
                    value={draft.ollamaBaseURL}
                    onChange={(v) => updateDraft('ollamaBaseURL', v)}
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => setAdvancedOpen((v) => !v)}
                  className="flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-ink-1 transition-colors"
                >
                  {advancedOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  Advanced providers
                </button>

                {advancedOpen && (
                  <>
                    <Field label="Azure OpenAI">
                      <Input
                        placeholder="https://<resource>.openai.azure.com"
                        value={draft.azureBaseURL}
                        onChange={(v) => updateDraft('azureBaseURL', v)}
                      />
                      <Input
                        type="password"
                        placeholder="api-key"
                        value={draft.azureKey}
                        onChange={(v) => updateDraft('azureKey', v)}
                      />
                    </Field>

                    <Field
                      label="Custom OpenAI-compatible gateway"
                      hint="Any OpenAI-compatible endpoint (vLLM, LiteLLM, in-house proxies)."
                    >
                      <Input
                        placeholder="https://your-gateway/v1"
                        value={draft.customBaseURL}
                        onChange={(v) => updateDraft('customBaseURL', v)}
                      />
                      <Input
                        type="password"
                        placeholder="API key (optional)"
                        value={draft.customKey}
                        onChange={(v) => updateDraft('customKey', v)}
                      />
                    </Field>
                  </>
                )}

                <div className="text-[11px] text-ink-3 leading-snug">
                  Architect Studio X never sends API keys directly from the
                  browser. The server-side proxy at <code>/api/ai/chat</code>
                  reads credentials from environment variables; these fields
                  are saved in your browser only as a personal reminder.
                </div>
              </>
            )}
          </div>

          {section === 'models' && (
            <footer className="shrink-0 flex items-center gap-2 px-5 py-3 border-t border-line bg-bg-2/40">
              <div className="flex-1 text-[11.5px] text-ink-3">
                {dirty
                  ? 'You have unsaved changes.'
                  : saveStatus === 'saved'
                  ? 'Saved to this browser.'
                  : 'Saved locally · changes persist across reloads.'}
              </div>
              <button
                type="button"
                onClick={onReset}
                disabled={!dirty}
                className="btn"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!dirty && saveStatus !== 'saved'}
                className={clsx(
                  'btn btn-primary',
                  saveStatus === 'saved' && '!from-accent-green !to-accent-green !shadow-none',
                )}
              >
                {saveStatus === 'saved' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Saved
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left px-3 py-1.5 text-[12.5px] transition-colors',
        active
          ? 'bg-accent-violet/10 text-accent-violet border-l-2 border-accent-violet'
          : 'text-ink-1 hover:text-ink-0 hover:bg-bg-3/40 border-l-2 border-transparent',
      )}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[12px] font-medium text-ink-0">{label}</div>
      {hint && <div className="text-[11px] text-ink-3 leading-snug">{hint}</div>}
      <div className="space-y-1.5 max-w-lg">{children}</div>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      className="input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
    />
  );
}

function ModelPicker({
  value,
  onChange,
}: {
  value: AIModel;
  onChange: (v: AIModel) => void;
}) {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-w-lg">
      {MODEL_OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <li key={o.value}>
            <button
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={active}
              className={clsx(
                'w-full text-left px-2.5 py-2 rounded-md border transition-colors',
                active
                  ? 'border-accent-violet/50 bg-accent-violet/10'
                  : 'border-line-soft bg-bg-2 hover:border-line hover:bg-bg-3/60',
              )}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={clsx(
                    'text-[12.5px] font-medium',
                    active ? 'text-accent-violet' : 'text-ink-0',
                  )}
                >
                  {o.label}
                </span>
                {active && (
                  <Check className="w-3 h-3 text-accent-violet ml-auto" />
                )}
              </div>
              <div className="text-[11px] text-ink-3 leading-snug mt-0.5">
                {o.description}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ThemeChoice({
  icon,
  label,
  value,
  current,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  value: Theme;
  current: Theme;
  onSelect: (t: Theme) => void;
}) {
  const active = value === current;
  return (
    <button
      onClick={() => onSelect(value)}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-md border text-[12px] transition-colors',
        active
          ? 'border-accent-violet/50 bg-accent-violet/10 text-accent-violet'
          : 'border-line-soft bg-bg-2 text-ink-1 hover:text-ink-0 hover:border-accent-violet/30',
      )}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <span className="ml-auto text-2xs uppercase tracking-[0.14em] text-accent-violet">
          Active
        </span>
      )}
    </button>
  );
}

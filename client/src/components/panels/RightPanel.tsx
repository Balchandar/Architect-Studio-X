import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsRight,
  CircleAlert,
  DollarSign,
  FileCheck,
  Info,
  Lightbulb,
  Scale,
  ShieldAlert,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import type { Insight, InsightsBundle, Severity } from '@/types/insights';
import { useInsightsStore } from '@/store/insightsStore';
import { useGraphStore } from '@/store/graphStore';
import { useADRStore } from '@/store/adrStore';
import { useUIStore } from '@/store/uiStore';
import type { ADRDraft } from '@/types/adr';
import NodeInspector from './NodeInspector';
import EdgeInspector from './EdgeInspector';

const sevDot: Record<Severity, string> = {
  critical: 'bg-accent-red',
  warning: 'bg-accent-yellow',
  suggestion: 'bg-accent-blue',
  info: 'bg-accent-violet',
  ok: 'bg-accent-green',
};

const sevText: Record<Severity, string> = {
  critical: 'text-accent-red',
  warning: 'text-accent-yellow',
  suggestion: 'text-accent-blue',
  info: 'text-accent-violet',
  ok: 'text-accent-green',
};

const COLLAPSED_LIMIT = 3;

interface InsightCardProps {
  title: string;
  count?: number;
  icon: LucideIcon;
  iconClassName?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}

function InsightCard({
  title,
  count,
  icon: Icon,
  iconClassName,
  defaultOpen = true,
  children,
  rightSlot,
}: InsightCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="panel-soft mx-3 mb-2.5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-bg-3/40"
      >
        <Icon className={clsx('w-4 h-4', iconClassName)} />
        <span className="text-[12.5px] font-semibold text-ink-0 flex-1">{title}</span>
        {rightSlot}
        {typeof count === 'number' && (
          <span className="text-2xs px-1.5 py-0.5 rounded bg-bg-3 border border-line-soft text-ink-2">
            {count}
          </span>
        )}
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-ink-3" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-ink-3" />
        )}
      </button>
      {open && <div className="border-t border-line-soft px-3 py-2.5">{children}</div>}
    </div>
  );
}

function SourceBadge({ source }: { source: Insight['source'] }) {
  const label =
    source === 'validation' ? 'Rule' : source === 'ai' ? 'AI' : 'Static';
  const cls =
    source === 'validation'
      ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
      : source === 'ai'
        ? 'bg-accent-violet/10 border-accent-violet/30 text-accent-violet'
        : 'bg-bg-3 border-line-soft text-ink-3';
  const title =
    source === 'validation'
      ? 'Deterministic rule — pure function over the graph, no LLM.'
      : source === 'ai'
        ? 'AI suggestion — proposal only; never auto-applied.'
        : 'Static helper.';
  return (
    <span
      title={title}
      className={clsx(
        'shrink-0 text-[9px] font-medium uppercase tracking-[0.08em] px-1 py-px rounded border leading-none',
        cls,
      )}
    >
      {label}
    </span>
  );
}

function InsightLine({ insight, expanded }: { insight: Insight; expanded: boolean }) {
  const highlight = useGraphStore((s) => s.highlight);
  return (
    <div
      onMouseEnter={() => highlight(insight.affectedNodeIds ?? [])}
      onMouseLeave={() => highlight([])}
      className="group flex items-start gap-2 text-left w-full py-1 hover:bg-bg-3/30 rounded -mx-1 px-1"
    >
      <span className={clsx('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', sevDot[insight.severity])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <div
            className={clsx(
              'text-[12px] leading-snug flex-1',
              sevText[insight.severity],
            )}
          >
            {insight.title}
          </div>
          <SourceBadge source={insight.source} />
        </div>
        {insight.detail && (
          <div className="text-[11px] text-ink-2 leading-snug mt-0.5">{insight.detail}</div>
        )}
        {expanded && (
          <div className="text-[11px] text-ink-3 mt-1 flex flex-wrap gap-x-3">
            <span>severity: {insight.severity}</span>
            {insight.confidence && <span>confidence: {insight.confidence}</span>}
            <span>source: {insight.source}</span>
            {insight.affectedNodeIds && insight.affectedNodeIds.length > 0 && (
              <span>affects: {insight.affectedNodeIds.length} node(s)</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Renders a list of insights with a collapse/expand affordance. The label
 * (e.g. "View details", "View more") becomes a real toggle that flips to
 * "Show less" when expanded.
 */
function ExpandableInsightList({
  insights,
  expandLabel,
}: {
  insights: Insight[];
  expandLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (insights.length === 0) return null;
  const visible = expanded ? insights : insights.slice(0, COLLAPSED_LIMIT);
  const remaining = insights.length - COLLAPSED_LIMIT;
  return (
    <>
      {visible.map((i) => (
        <InsightLine key={i.id} insight={i} expanded={expanded} />
      ))}
      {insights.length > COLLAPSED_LIMIT && (
        <button
          className="mt-2 text-[11px] text-accent-violet hover:text-accent-blue"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : `${expandLabel} (${remaining} more) →`}
        </button>
      )}
      {expanded && insights.length <= COLLAPSED_LIMIT && (
        <button
          className="mt-2 text-[11px] text-accent-violet hover:text-accent-blue"
          onClick={() => setExpanded(false)}
        >
          Show less
        </button>
      )}
      {!expanded && insights.length <= COLLAPSED_LIMIT && (
        <button
          className="mt-2 text-[11px] text-accent-violet hover:text-accent-blue"
          onClick={() => setExpanded(true)}
        >
          View details →
        </button>
      )}
    </>
  );
}

function CountBadge({ severity, count }: { severity: Severity; count: number }) {
  if (count === 0) return null;
  return (
    <span
      className={clsx(
        'text-2xs px-1.5 py-0.5 rounded border',
        severity === 'critical' && 'bg-accent-red/10 border-accent-red/30 text-accent-red',
        severity === 'warning' && 'bg-accent-yellow/10 border-accent-yellow/30 text-accent-yellow',
        severity === 'suggestion' && 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue',
        severity === 'info' && 'bg-accent-violet/10 border-accent-violet/30 text-accent-violet',
        severity === 'ok' && 'bg-accent-green/10 border-accent-green/30 text-accent-green',
      )}
    >
      {count}
    </span>
  );
}

function CostBlock({ cost }: { cost: InsightsBundle['cost'] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? cost.topContributors
    : cost.topContributors.slice(0, COLLAPSED_LIMIT);
  return (
    <>
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-2xs uppercase tracking-wider text-ink-3">Top contributors</div>
        <div className="text-accent-green font-semibold tabular-nums text-[14px]">
          ${cost.monthlyTotal.toLocaleString()} / month
        </div>
      </div>
      <ul className="space-y-1.5">
        {visible.map((c) => (
          <li key={c.name} className="flex items-center justify-between text-[12px]">
            <span className="text-ink-1 truncate">{c.name}</span>
            <span className="text-ink-2 tabular-nums">${c.monthly.toLocaleString()}</span>
          </li>
        ))}
      </ul>
      {cost.topContributors.length > COLLAPSED_LIMIT && (
        <button
          className="mt-2 text-[11px] text-accent-violet hover:text-accent-blue inline-flex items-center gap-1"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? 'Show fewer ↑'
            : `View full breakdown (${cost.topContributors.length - COLLAPSED_LIMIT} more) →`}
        </button>
      )}
    </>
  );
}

function ADRDraftBlock({ draft }: { draft: ADRDraft }) {
  const [open, setOpen] = useState(false);
  const remove = useADRStore((s) => s.removeDraft);
  return (
    <div className="border-b border-line-soft last:border-b-0 py-2 space-y-1">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 text-left"
        >
          <div className="text-[12.5px] font-medium text-ink-0 leading-snug">
            {draft.title}
          </div>
          <div className="text-[11px] text-ink-3 mt-0.5">
            Status: <span className="text-accent-violet">Proposed</span>
            <span className="mx-1.5">·</span>
            <span>from {draft.source}</span>
          </div>
        </button>
        <button
          className="text-ink-3 hover:text-accent-red"
          onClick={() => remove(draft.id)}
          title="Discard draft"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <button
        className="text-[11px] text-accent-violet hover:text-accent-blue inline-flex items-center gap-1"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide ADR ↑' : 'View ADR →'}
      </button>

      {open && (
        <div className="pt-1 space-y-2">
          <ADRSection label="Decision" body={draft.decision} />
          <ADRSection label="Rationale" body={draft.rationale} />
          <ADRSection label="Tradeoffs" items={draft.tradeoffs} />
          <ADRSection label="Impact" items={draft.impact} />
        </div>
      )}
    </div>
  );
}

function ADRSection({
  label,
  body,
  items,
}: {
  label: string;
  body?: string;
  items?: string[];
}) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-[0.14em] text-ink-3 mb-1">{label}</div>
      {body && (
        <div className="text-[12px] text-ink-1 whitespace-pre-line leading-snug">{body}</div>
      )}
      {items && items.length > 0 && (
        <ul className="text-[12px] text-ink-1 space-y-0.5 leading-snug">
          {items.map((i, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="mt-1 w-1 h-1 rounded-full bg-ink-3 shrink-0" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      )}
      {(!body || body.length === 0) && (!items || items.length === 0) && (
        <div className="text-[11px] text-ink-3">—</div>
      )}
    </div>
  );
}

export default function RightPanel() {
  const bundle = useInsightsStore((s) => s.bundle);
  const validated = useInsightsStore((s) => s.validated);
  const recompute = useInsightsStore((s) => s.recompute);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectedConnectionId = useGraphStore((s) => s.selectedConnectionId);
  const adrDrafts = useADRStore((s) => s.drafts);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);

  const securityCounts = countBy(bundle.security);
  const reliabilityCounts = countBy(bundle.reliability);
  const validationCount =
    bundle.security.length + bundle.reliability.length + bundle.validation.length;
  const noCritical = !bundle.security.some((i) => i.severity === 'critical');

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-3 flex items-center justify-between border-b border-line/70">
        <div className="flex items-center gap-2">
          <button
            className="text-ink-3 hover:text-ink-0 inline-flex items-center justify-center w-6 h-6 rounded hover:bg-bg-3/40 transition-colors"
            title="Collapse right panel"
            aria-label="Collapse right panel"
            onClick={toggleRightPanel}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
          <Sparkles className="w-4 h-4 text-accent-violet" />
          <span className="section-title">
            {selectedNodeId
              ? 'Inspector & Insights'
              : selectedConnectionId
                ? 'Edge & Insights'
                : 'Architecture Insights'}
          </span>
        </div>
        <Info className="w-3.5 h-3.5 text-ink-3" />
      </div>

      <div className="flex-1 overflow-y-auto pt-3 pb-3">
        {selectedNodeId && <NodeInspector />}
        {!selectedNodeId && selectedConnectionId && <EdgeInspector />}

        {!validated && !selectedNodeId && !selectedConnectionId && adrDrafts.length === 0 && (
          <div className="mx-3 mb-2.5 panel-soft px-4 py-5 text-center">
            <CircleAlert className="w-5 h-5 text-accent-violet mx-auto mb-2" />
            <div className="text-[13px] text-ink-0 font-medium leading-snug">
              Architecture not yet validated
            </div>
            <div className="text-[12px] text-ink-2 mt-1 leading-snug">
              Run validation to analyze tradeoffs, security, resiliency, cost,
              SPOFs, and architectural suggestions.
            </div>
            <button className="btn btn-primary mt-3 !py-1.5" onClick={recompute}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Validate Architecture
            </button>
          </div>
        )}

        {/* ADR drafts always render when present, even if validation hasn't
            been run yet — they're produced by approved plans too. */}
        {adrDrafts.length > 0 && (
          <InsightCard
            title="ADR Drafts"
            icon={FileCheck}
            iconClassName="text-accent-violet"
            count={adrDrafts.length}
          >
            <div className="-my-2">
              {adrDrafts.map((d) => (
                <ADRDraftBlock key={d.id} draft={d} />
              ))}
            </div>
          </InsightCard>
        )}

        {validated && (
          <>
            <InsightCard title="Tradeoffs" icon={Scale} iconClassName="text-accent-blue">
              {bundle.tradeoffs.length ? (
                <ExpandableInsightList insights={bundle.tradeoffs} expandLabel="View details" />
              ) : (
                <Empty />
              )}
            </InsightCard>

            <InsightCard
              title="Security Risks"
              icon={ShieldAlert}
              iconClassName="text-accent-red"
              rightSlot={<CountBadge severity="critical" count={securityCounts.critical} />}
              count={bundle.security.length}
            >
              {bundle.security.length ? (
                <ExpandableInsightList insights={bundle.security} expandLabel="View details" />
              ) : (
                <div className="text-[12px] text-ink-2 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" /> No security risks
                  detected
                </div>
              )}
            </InsightCard>

            <InsightCard
              title="Reliability Concerns"
              icon={AlertTriangle}
              iconClassName="text-accent-yellow"
              rightSlot={<CountBadge severity="warning" count={reliabilityCounts.warning} />}
              count={bundle.reliability.length}
            >
              {bundle.reliability.length ? (
                <ExpandableInsightList insights={bundle.reliability} expandLabel="View details" />
              ) : (
                <Empty />
              )}
            </InsightCard>

            <InsightCard
              title="Cost Estimate"
              icon={DollarSign}
              iconClassName="text-accent-green"
              rightSlot={
                <span className="text-accent-green font-semibold tabular-nums text-[12px]">
                  ${bundle.cost.monthlyTotal.toLocaleString()} / month
                </span>
              }
            >
              <CostBlock cost={bundle.cost} />
            </InsightCard>

            <InsightCard
              title="Architectural Suggestions"
              icon={Lightbulb}
              iconClassName="text-accent-blue"
              count={bundle.suggestions.length}
            >
              {bundle.suggestions.length ? (
                <ExpandableInsightList insights={bundle.suggestions} expandLabel="View more" />
              ) : (
                <Empty />
              )}
            </InsightCard>

            <InsightCard
              title="Validation Results"
              icon={CircleAlert}
              iconClassName="text-accent-green"
              rightSlot={<Info className="w-3.5 h-3.5 text-ink-3" />}
            >
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-[12px] text-ink-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent-green" />
                  {noCritical ? 'No critical issues found.' : 'Critical issues detected.'}
                </li>
                <li className="flex items-center gap-2 text-[12px] text-ink-1">
                  <span className={clsx('w-1.5 h-1.5 rounded-full', sevDot.warning)} />
                  {validationCount} {validationCount === 1 ? 'finding' : 'findings'}
                </li>
              </ul>
            </InsightCard>
          </>
        )}
      </div>
    </div>
  );
}

function countBy(insights: Insight[]) {
  return insights.reduce(
    (acc, i) => {
      acc[i.severity]++;
      return acc;
    },
    { critical: 0, warning: 0, suggestion: 0, info: 0, ok: 0 } as Record<Severity, number>,
  );
}

function Empty() {
  return <div className="text-[11px] text-ink-3">No items.</div>;
}

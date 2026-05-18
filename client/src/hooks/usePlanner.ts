// Trigger for the planner pipeline. Same flow as before — extracted into
// a dedicated hook so multiple call sites (left footer, bottom compose
// bar, ad-hoc actions) can fire it without duplicating logic.

import { useGraphStore } from '@/store/graphStore';
import { useIntentStore } from '@/store/intentStore';
import { useMutationStore } from '@/store/mutationStore';
import { useUIStore } from '@/store/uiStore';
import { getProvider } from '@/lib/ai/registry';
import { proposePlan } from '@/lib/ai/pipeline';

export function usePlanner() {
  const intent = useIntentStore();
  const graph = useGraphStore((s) => s.graph);
  const isPlanning = useMutationStore((s) => s.isPlanning);
  const setPlanning = useMutationStore((s) => s.setPlanning);
  const setError = useMutationStore((s) => s.setError);
  const prompt = useMutationStore((s) => s.plannerPrompt);
  const showToast = useUIStore((s) => s.showToast);

  const composePlan = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      showToast('Describe the change you want planned', 'warning');
      return;
    }
    setPlanning(true);
    setError(null);
    try {
      const provider = getProvider(intent.model);
      const plan = await provider.plan({ intent, graph, prompt: trimmed });
      proposePlan(plan);
      const summary =
        plan.mutations.length === 0
          ? 'Plan ready (no mutations needed)'
          : `Plan ready: ${plan.mutations.length} mutation(s)`;
      showToast(summary, 'info');
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      showToast(`Plan failed: ${msg}`, 'error');
    } finally {
      setPlanning(false);
    }
  };

  return {
    composePlan,
    isPlanning,
    hasPrompt: prompt.trim().length > 0,
  };
}

import { useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import SideRail from '@/components/layout/SideRail';
import LeftPanel from '@/components/panels/LeftPanel';
import CenterPanel from '@/components/panels/CenterPanel';
import RightPanel from '@/components/panels/RightPanel';
import BottomPanel from '@/components/panels/BottomPanel';
import Toast from '@/components/common/Toast';
import MutationApprovalModal from '@/components/panels/MutationApprovalModal';
import NewProjectModal from '@/components/layout/NewProjectModal';
import SettingsModal from '@/components/layout/SettingsModal';
import ComposeBar from '@/components/compose/ComposeBar';
import { useUIStore } from '@/store/uiStore';
import { useGraphStore } from '@/store/graphStore';
import { useVersionStore } from '@/store/versionStore';
import { useADRStore } from '@/store/adrStore';
import { useIntentStore } from '@/store/intentStore';
import { useMutationStore } from '@/store/mutationStore';
import { loadWorkspace, saveWorkspace } from '@/lib/persistence/workspace';

export default function App() {
  const leftOpen = useUIStore((s) => s.leftPanelOpen);
  const rightOpen = useUIStore((s) => s.rightPanelOpen);
  const theme = useUIStore((s) => s.theme);

  // Apply theme class to <html> so CSS overrides target light mode.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.classList.add('light');
    else root.classList.remove('light');
  }, [theme]);

  // Restore workspace from localStorage on first mount, if any.
  useEffect(() => {
    const snap = loadWorkspace();
    if (!snap) return;
    if (snap.graph) useGraphStore.setState({ graph: snap.graph });
    if (snap.versions || snap.events) {
      useVersionStore.setState({
        versions: snap.versions ?? [],
        events: snap.events ?? [],
        compareLeftId: snap.versions?.at(-2)?.id ?? null,
        compareRightId: snap.versions?.at(-1)?.id ?? null,
      });
    }
    if (snap.adrDrafts) useADRStore.setState({ drafts: snap.adrDrafts });
    if (snap.intent) useIntentStore.setState(snap.intent);
    if (snap.plannerPrompt !== undefined)
      useMutationStore.setState({ plannerPrompt: snap.plannerPrompt });
    // Loaded from disk → not dirty until the user makes a manual change.
    useUIStore.getState().setDirty(false);
  }, []);

  // Mark workspace as dirty on graph changes (manual edits).
  useEffect(() => {
    let prev = useGraphStore.getState().graph;
    const unsub = useGraphStore.subscribe((s) => {
      if (s.graph !== prev) {
        prev = s.graph;
        if (s.graph.services.length > 0) {
          useUIStore.getState().setDirty(true);
        }
      }
    });
    return unsub;
  }, []);

  // Auto-persist a workspace snapshot. Debounced so we don't write to
  // localStorage on every keystroke. The snapshot mirrors the conceptual
  // `.asx` project state.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const graph = useGraphStore.getState().graph;
        const { versions, events } = useVersionStore.getState();
        const adrDrafts = useADRStore.getState().drafts;
        const { plannerPrompt } = useMutationStore.getState();
        const intent = useIntentStore.getState();
        saveWorkspace({
          version: 1,
          savedAt: new Date().toISOString(),
          graph,
          versions,
          events,
          adrDrafts,
          intent: {
            businessGoal: intent.businessGoal,
            constraints: intent.constraints,
            compliance: intent.compliance,
            preferredStack: intent.preferredStack,
            avoid: intent.avoid,
            budget: intent.budget,
            scaleUsers: intent.scaleUsers,
            scalePeakRps: intent.scalePeakRps,
            teamStrong: intent.teamStrong,
            teamMedium: intent.teamMedium,
            deploymentTargets: intent.deploymentTargets,
            model: intent.model,
          },
          plannerPrompt,
        });
      }, 400);
    };

    const unsubGraph = useGraphStore.subscribe(schedule);
    const unsubVersions = useVersionStore.subscribe(schedule);
    const unsubADR = useADRStore.subscribe(schedule);
    const unsubIntent = useIntentStore.subscribe(schedule);
    const unsubMut = useMutationStore.subscribe(schedule);
    return () => {
      if (timer) clearTimeout(timer);
      unsubGraph();
      unsubVersions();
      unsubADR();
      unsubIntent();
      unsubMut();
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col bg-bg-0 text-ink-1 overflow-hidden">
      <TopBar />
      <div className="flex-1 flex min-h-0">
        <SideRail />
        {/* Left panel wrapper animates width; inner content stays at a
            fixed width so children don't reflow during the transition. */}
        <aside
          className="shrink-0 overflow-hidden transition-[width] duration-200 ease-out border-r border-line bg-bg-1"
          style={{ width: leftOpen ? 300 : 0 }}
          aria-hidden={!leftOpen}
        >
          <div className="w-[300px] h-full min-h-0 flex flex-col">
            <LeftPanel />
          </div>
        </aside>
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <CenterPanel />
          <BottomPanel />
          <ComposeBar />
        </main>
        <aside
          className="shrink-0 overflow-hidden transition-[width] duration-200 ease-out border-l border-line bg-bg-1"
          style={{ width: rightOpen ? 330 : 0 }}
          aria-hidden={!rightOpen}
        >
          <div className="w-[330px] h-full min-h-0 flex flex-col">
            <RightPanel />
          </div>
        </aside>
      </div>
      <Toast />
      <MutationApprovalModal />
      <NewProjectModal />
      <SettingsModal />
    </div>
  );
}

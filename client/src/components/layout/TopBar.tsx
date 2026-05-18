import {
  FilePlus2,
  Moon,
  PanelLeft,
  PanelRight,
  Sun,
} from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '@/store/uiStore';
import Logo from '@/components/branding/Logo';
import ProjectNameEdit from './ProjectNameEdit';

export default function TopBar() {
  const openNewProject = useUIStore((s) => s.openNewProject);
  const leftOpen = useUIStore((s) => s.leftPanelOpen);
  const rightOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleLeft = useUIStore((s) => s.toggleLeftPanel);
  const toggleRight = useUIStore((s) => s.toggleRightPanel);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const dirty = useUIStore((s) => s.dirty);

  const onNewProject = () => {
    if (dirty) {
      const ok = window.confirm(
        'You have unsaved manual changes. Discard them and start a new project?',
      );
      if (!ok) return;
    }
    openNewProject();
  };

  return (
    <header className="h-12 shrink-0 flex items-center px-3 border-b border-line bg-bg-1/90 backdrop-blur z-30">
      <div className="flex items-center gap-2 pr-3 mr-1 border-r border-line">
        <Logo />
        <span className="text-[13px] font-semibold text-ink-0 tracking-tight">
          Architect Studio X
        </span>
      </div>

      <ProjectNameEdit />

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <button
          className="btn"
          onClick={onNewProject}
          title="Start a new project"
        >
          <FilePlus2 className="w-3.5 h-3.5 text-accent-violet" />
          New Project
        </button>
      </div>

      <div className="ml-3 flex items-center gap-0.5 pl-2 border-l border-line">
        <PanelToggle
          icon={PanelLeft}
          active={leftOpen}
          onClick={toggleLeft}
          label={leftOpen ? 'Collapse left panel' : 'Expand left panel'}
        />
        <PanelToggle
          icon={PanelRight}
          active={rightOpen}
          onClick={toggleRight}
          label={rightOpen ? 'Collapse right panel' : 'Expand right panel'}
        />
        <button
          className="btn-ghost btn !px-2"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </header>
  );
}

function PanelToggle({
  icon: Icon,
  active,
  onClick,
  label,
}: {
  icon: typeof PanelLeft;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className={clsx(
        'btn-ghost btn !px-2 transition-colors',
        active ? 'text-ink-0' : 'text-ink-3',
      )}
      title={label}
      onClick={onClick}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

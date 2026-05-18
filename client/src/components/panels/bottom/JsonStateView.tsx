import JsonStatePreview from './JsonStatePreview';
import { useGraphStore } from '@/store/graphStore';
import { useUIStore } from '@/store/uiStore';
import { Copy, Download } from 'lucide-react';

export default function JsonStateView() {
  const graph = useGraphStore((s) => s.graph);
  const showToast = useUIStore((s) => s.showToast);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(graph, null, 2));
      showToast('Graph JSON copied', 'success');
    } catch {
      showToast('Copy failed', 'error');
    }
  };
  const onDownload = () => {
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${graph.metadata.name.replace(/\s+/g, '-').toLowerCase()}.architecture.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end gap-2 px-3 py-2 border-b border-line">
        <button className="btn !py-1" onClick={onCopy}>
          <Copy className="w-3.5 h-3.5" /> Copy
        </button>
        <button className="btn !py-1" onClick={onDownload}>
          <Download className="w-3.5 h-3.5" /> Download
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <JsonStatePreview />
      </div>
    </div>
  );
}

import { useGraphStore } from '@/store/graphStore';

export default function JsonStatePreview() {
  const graph = useGraphStore((s) => s.graph);
  // Show a compact, readable subset (services array) like the reference image.
  const subset = {
    services: graph.services.slice(0, 4).map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      runtime: s.runtime,
      region: s.region,
      criticality: s.criticality,
      tags: s.tags,
    })),
  };
  const text = JSON.stringify(subset, null, 2);
  const lines = text.split('\n');
  return (
    <div className="h-full overflow-auto font-mono text-[12px] leading-[18px]">
      <table className="w-full">
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="align-top">
              <td className="select-none text-ink-3 text-right pr-3 pl-4 w-10 tabular-nums">
                {i + 1}
              </td>
              <td className="pr-4">
                <SyntaxLine line={line} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SyntaxLine({ line }: { line: string }) {
  // very simple highlighter: keys, strings, numbers, brackets
  const tokens: { text: string; cls: string }[] = [];
  let rest = line;
  // leading whitespace
  const ws = rest.match(/^\s+/);
  if (ws) {
    tokens.push({ text: ws[0], cls: '' });
    rest = rest.slice(ws[0].length);
  }
  while (rest.length) {
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^"([^"]*)"\s*:/))) {
      tokens.push({ text: `"${m[1]}"`, cls: 'text-accent-violet' });
      tokens.push({ text: ':', cls: 'text-ink-3' });
      rest = rest.slice(m[0].length);
    } else if ((m = rest.match(/^"([^"]*)"/))) {
      tokens.push({ text: `"${m[1]}"`, cls: 'text-accent-green' });
      rest = rest.slice(m[0].length);
    } else if ((m = rest.match(/^-?\d+(\.\d+)?/))) {
      tokens.push({ text: m[0], cls: 'text-accent-orange' });
      rest = rest.slice(m[0].length);
    } else if ((m = rest.match(/^(true|false|null)/))) {
      tokens.push({ text: m[0], cls: 'text-accent-blue' });
      rest = rest.slice(m[0].length);
    } else if ((m = rest.match(/^[{}\[\],]/))) {
      tokens.push({ text: m[0], cls: 'text-ink-3' });
      rest = rest.slice(m[0].length);
    } else if ((m = rest.match(/^\s+/))) {
      tokens.push({ text: m[0], cls: '' });
      rest = rest.slice(m[0].length);
    } else {
      tokens.push({ text: rest[0], cls: 'text-ink-1' });
      rest = rest.slice(1);
    }
  }
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} className={t.cls}>
          {t.text}
        </span>
      ))}
    </>
  );
}

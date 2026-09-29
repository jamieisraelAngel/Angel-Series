import React, { useState } from 'react';
import { Copy, Check, Terminal, FileCode } from 'lucide-react';

interface ScriptCodeViewerProps {
  code: string;
  language?: string; // 'py' | 'ts' | 'cuda' | 'hlsl' | 'json' | string;
  fileName?: string;
  maxHeight?: string;
}

export const ScriptCodeViewer: React.FC<ScriptCodeViewerProps> = ({
  code,
  language = 'py',
  fileName,
  maxHeight = '450px',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  // Simple token regex highlighter for Python, TypeScript, CUDA, HLSL, and JSON
  const highlightLine = (line: string): React.ReactNode => {
    // Comment line
    if (/^\s*(#|\/\/|\/\*)/.test(line)) {
      return <span className="text-emerald-400/90 italic">{line}</span>;
    }

    // Split line into tokens preserving separators
    const tokenRegex =
      /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:def|class|import|from|return|if|elif|else|for|while|in|as|with|try|except|raise|None|True|False|self|function|const|let|var|interface|type|export|async|await|struct|__global__|__device__|bool|int|float|void|vec3|vec4|mat3|mat4|texture2D|clamp|radians)\b|\b\d+(?:\.\d+)?(?:f)?\b|[{}()[\]+\-*/=<>!&|,:;])/g;

    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(line)) !== null) {
      if (match.index > lastIdx) {
        parts.push(line.substring(lastIdx, match.index));
      }
      const val = match[0];

      // String literal
      if (val.startsWith('"') || val.startsWith("'") || val.startsWith('`')) {
        parts.push(<span key={match.index} className="text-amber-300">{val}</span>);
      }
      // Keyword
      else if (
        /^(def|class|import|from|return|if|elif|else|for|while|in|as|with|try|except|raise|function|const|let|var|interface|type|export|async|await|struct|__global__|__device__|void)$/.test(
          val
        )
      ) {
        parts.push(<span key={match.index} className="text-indigo-400 font-semibold">{val}</span>);
      }
      // Types / Primitives
      else if (/^(None|True|False|self|bool|int|float|vec3|vec4|mat3|mat4|texture2D|clamp|radians)$/.test(val)) {
        parts.push(<span key={match.index} className="text-cyan-400 font-medium">{val}</span>);
      }
      // Numbers
      else if (/^\d/.test(val)) {
        parts.push(<span key={match.index} className="text-rose-400">{val}</span>);
      }
      // Punctuation
      else {
        parts.push(<span key={match.index} className="text-slate-400">{val}</span>);
      }
      lastIdx = tokenRegex.lastIndex;
    }

    if (lastIdx < line.length) {
      parts.push(line.substring(lastIdx));
    }

    return parts.length > 0 ? parts : line;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs shadow-inner">
      {/* Script Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2 text-slate-300">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold">{fileName || `Source Script (.${language})`}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-bold">
            {language}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            ({lines.length} lines)
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-[11px]"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body with Line Numbers */}
      <div
        className="overflow-x-auto overflow-y-auto p-3 text-slate-300 leading-relaxed font-mono"
        style={{ maxHeight }}
      >
        <table className="border-collapse w-full">
          <tbody>
            {lines.map((lineText, idx) => (
              <tr key={idx} className="hover:bg-slate-900/50">
                <td className="w-10 pr-3 text-right select-none text-slate-400 text-[11px] align-top font-mono">
                  {idx + 1}
                </td>
                <td className="whitespace-pre font-mono text-[11px] align-top">
                  {highlightLine(lineText)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Download,
  Box,
  FileCode,
  Dna,
  Terminal,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Play,
  Trash2,
  Tag,
  Calendar,
  User,
  Shield,
  Loader2,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { ArchiveItem, AIAnalysisResult, AssetTier } from '../types';
import { analyzeAsset } from '../lib/gemini';
import { downloadAssetBundle } from '../utils/bundleExport';
import { ScriptCodeViewer } from './ScriptCodeViewer';

interface AssetDetailModalProps {
  item: ArchiveItem | null;
  isOpen: boolean;
  onClose: () => void;
  onLoadAsset: (item: ArchiveItem) => void;
  onUpdateAsset?: (updated: ArchiveItem) => void;
  onDeleteAsset?: (id: string) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onLoadAsset,
  onUpdateAsset,
  onDeleteAsset,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'code' | 'specs'>('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloadingBundle, setIsDownloadingBundle] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(item?.aiAnalysis || null);

  // Sync state if item changes
  React.useEffect(() => {
    if (item) {
      setAnalysis(item.aiAnalysis || null);
      if (item.category === 'script' || item.category === 'shader') {
        setActiveTab('code');
      } else {
        setActiveTab('overview');
      }
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeAsset(item);
      setAnalysis(result);
      if (onUpdateAsset) {
        onUpdateAsset({
          ...item,
          aiAnalysis: result,
        });
      }
    } catch (err) {
      console.error('Failed to run AI analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadBundle = async () => {
    setIsDownloadingBundle(true);
    try {
      await downloadAssetBundle({
        ...item,
        aiAnalysis: analysis || item.aiAnalysis,
      });
    } catch (err) {
      console.error('Error creating bundle:', err);
    } finally {
      setIsDownloadingBundle(false);
    }
  };

  const getTierBadge = (tier: AssetTier) => {
    switch (tier) {
      case 'masterwork':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'relic':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'rare':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'experimental':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  const getCategoryIcon = () => {
    switch (item.category) {
      case 'script':
        return <Terminal className="w-4 h-4 text-emerald-400" />;
      case 'shader':
        return <Cpu className="w-4 h-4 text-indigo-400" />;
      case 'molecular':
        return <Dna className="w-4 h-4 text-rose-400" />;
      default:
        return <Box className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
              {getCategoryIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{item.name}</h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getTierBadge(
                    item.tier
                  )}`}
                >
                  {item.tier}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                  .{item.format}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {item.category.toUpperCase()} • {(item.size / 1024).toFixed(1)} KB • Added{' '}
                {new Date(item.dateAdded).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadBundle}
              disabled={isDownloadingBundle}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
              title="Download Asset Bundle (Asset + metadata.json + README.md in ZIP)"
            >
              {isDownloadingBundle ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden sm:inline">Download Bundle (ZIP)</span>
            </button>

            <button
              onClick={() => {
                onLoadAsset(item);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Load in Viewer</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-900/50 gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Overview
          </button>

          {(item.codeContent || item.category === 'script' || item.category === 'shader') && (
            <button
              onClick={() => setActiveTab('code')}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'code'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Script Source
            </button>
          )}

          <button
            onClick={() => setActiveTab('analysis')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'analysis'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            AI Deep Analysis
            {analysis && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('specs')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'specs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Specs & Pipeline
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Description & Summary */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Description
                </h3>
                <p className="text-sm text-slate-200 leading-relaxed">{item.description}</p>
              </div>

              {/* Quick AI Highlights preview */}
              {analysis && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-950/40 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-indigo-200">
                        Gemini AI Assessment
                      </span>
                    </div>
                    {analysis.complexityScore && (
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Score: {analysis.complexityScore}/100
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{analysis.summary}</p>
                </div>
              )}

              {/* Key Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Author / Origin</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {item.author || 'KEEPER Vault'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span>License</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {item.license || 'MIT / CC0'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Version</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {item.version || '1.0.0'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <Box className="w-3.5 h-3.5" />
                    <span>Format</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 uppercase">
                    {item.format}
                  </div>
                </div>
              </div>

              {/* Compatibility Badges */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Verified Pipeline Compatibility
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(item.compatibility && item.compatibility.length > 0
                    ? item.compatibility
                    : ['Blender 4.2', 'Three.js r160']
                  ).map((comp, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {comp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Taxonomy & Search Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs border border-slate-700 font-mono"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CODE / SCRIPT VIEWER */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              {item.codeContent ? (
                <ScriptCodeViewer
                  code={item.codeContent}
                  language={item.format}
                  fileName={`${item.name.replace(/\s+/g, '_')}.${item.format}`}
                  maxHeight="520px"
                />
              ) : (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400">
                  <FileCode className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                  <p className="text-sm font-semibold">Binary 3D model asset</p>
                  <p className="text-xs mt-1">
                    Binary mesh files (.glb, .obj, .stl) can be viewed in the interactive 3D Viewport.
                  </p>
                  <button
                    onClick={() => {
                      onLoadAsset(item);
                      onClose();
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Open in 3D Viewport
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AI DEEP ANALYSIS */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              {/* Trigger Analysis Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-purple-900/30 to-slate-950/60 border border-indigo-500/40 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">
                      AI Inspection & Analysis Assistant
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Automated mesh topology critique, algorithmic code quality, and performance
                    recommendations powered by Gemini 3.8 Flash.
                  </p>
                </div>

                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 shrink-0 active:scale-95 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{analysis ? 'Re-run Analysis' : 'Run AI Analysis'}</span>
                    </>
                  )}
                </button>
              </div>

              {analysis ? (
                <div className="space-y-6">
                  {/* Executive Summary */}
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Executive Summary
                    </h4>
                    <p className="text-sm text-slate-200 leading-relaxed">{analysis.summary}</p>
                  </div>

                  {/* Topology / Code Quality */}
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      Topology & Implementation Quality
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {analysis.topologyOrQuality}
                    </p>
                  </div>

                  {/* Usage Documentation */}
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      Auto-Generated Usage Documentation
                    </h4>
                    <div className="text-xs text-slate-300 font-mono bg-slate-900/80 p-3 rounded-lg border border-slate-800 whitespace-pre-wrap">
                      {analysis.documentation}
                    </div>
                  </div>

                  {/* Performance Tips */}
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Performance & Optimization Tips
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {analysis.performanceTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* AI Suggested Tags */}
                  {analysis.suggestedTags && analysis.suggestedTags.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        AI Suggested Tags
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.suggestedTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-xs border border-indigo-500/20 font-mono"
                          >
                            +{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
                  <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">
                    No technical report has been generated yet for this asset.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Click &ldquo;Run AI Analysis&rdquo; to evaluate mesh bounds, UV layouts, or source code.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SPECS & PIPELINE */}
          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Technical Specifications
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Internal Vault ID:</span>
                    <p className="font-mono text-slate-200 mt-0.5">{item.id}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">File Format:</span>
                    <p className="font-mono text-slate-200 uppercase mt-0.5">{item.format}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">File Size:</span>
                    <p className="font-mono text-slate-200 mt-0.5">
                      {item.size.toLocaleString()} bytes ({(item.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Tier Quality:</span>
                    <p className="font-mono text-slate-200 uppercase mt-0.5">{item.tier}</p>
                  </div>
                </div>
              </div>

              {item.stats && (
                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Model Metrics
                  </h4>
                  <pre className="text-xs font-mono text-slate-300 bg-slate-900 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(item.stats, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div>
            {onDeleteAsset && (
              <button
                onClick={() => {
                  if (confirm(`Remove "${item.name}" from the KEEPER Vault?`)) {
                    onDeleteAsset(item.id);
                    onClose();
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete from Vault</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onLoadAsset(item);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Load in Viewer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

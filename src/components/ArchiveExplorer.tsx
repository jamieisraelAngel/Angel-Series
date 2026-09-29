import React, { useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Filter,
  ArrowUpDown,
  Plus,
  Box,
  Terminal,
  Cpu,
  Dna,
  Download,
  Play,
  Layers,
  Tag,
  Calendar,
  X,
  Loader2,
  CheckCircle2,
  ChevronDown,
  Info,
  Trash2,
} from 'lucide-react';
import { ArchiveItem, AssetCategory, AssetTier, ArchiveSortField, SortOrder } from '../types';
import { semanticSearchVault } from '../lib/gemini';
import { downloadAssetBundle } from '../utils/bundleExport';
import { formatVaultDateTime, formatVaultShortTimestamp, formatRelativeTime } from '../lib/db';

interface ArchiveExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  items: ArchiveItem[];
  activeModelName?: string;
  onLoadAsset: (item: ArchiveItem) => void;
  onInspectAsset: (item: ArchiveItem) => void;
  onOpenUpload: () => void;
  onDeleteAsset?: (id: string) => void;
}

export const ArchiveExplorer: React.FC<ArchiveExplorerProps> = ({
  isOpen,
  onClose,
  items,
  activeModelName = '',
  onLoadAsset,
  onInspectAsset,
  onOpenUpload,
  onDeleteAsset,
}) => {
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'all'>('all');
  const [selectedTier, setSelectedTier] = useState<AssetTier | 'all'>('all');
  const [sortField, setSortField] = useState<ArchiveSortField>('dateAdded');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [catalogueLayout, setCatalogueLayout] = useState<'grid' | 'table'>('grid');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // AI Semantic Search State
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiMatchedIds, setAiMatchedIds] = useState<string[] | null>(null);
  const [aiReasoningMap, setAiReasoningMap] = useState<Record<string, string>>({});
  const [batchExporting, setBatchExporting] = useState(false);

  if (!isOpen) return null;

  const handleTriggerAiSearch = async () => {
    if (!searchQuery.trim()) {
      setAiMatchedIds(null);
      setAiReasoningMap({});
      return;
    }

    setIsAiSearching(true);
    try {
      const result = await semanticSearchVault(searchQuery, items);
      setAiMatchedIds(result.matchedIds);
      setAiReasoningMap(result.reasoning);
    } catch (err) {
      console.error('Semantic search error:', err);
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setAiMatchedIds(null);
    setAiReasoningMap({});
  };

  const handleBatchExport = async () => {
    setBatchExporting(true);
    try {
      for (const item of filteredItems.slice(0, 5)) {
        await downloadAssetBundle(item);
      }
    } catch (e) {
      console.error('Batch export error:', e);
    } finally {
      setBatchExporting(false);
    }
  };

  // Filter & Sort Items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // AI Matched filter if active
        if (aiMatchedIds !== null) {
          if (!aiMatchedIds.includes(item.id)) return false;
        } else if (searchQuery.trim().length > 0) {
          // Standard text search fallback
          const q = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchTag = item.tags.some((t) => t.toLowerCase().includes(q));
          const matchComp = (item.compatibility || []).some((c) => c.toLowerCase().includes(q));
          if (!matchName && !matchDesc && !matchTag && !matchComp) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
        }

        // Tier filter
        if (selectedTier !== 'all' && item.tier !== selectedTier) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortField === 'size') {
          diff = a.size - b.size;
        } else if (sortField === 'tier') {
          const tierRank: Record<AssetTier, number> = {
            masterwork: 5,
            relic: 4,
            rare: 3,
            experimental: 2,
            standard: 1,
          };
          diff = (tierRank[a.tier] || 0) - (tierRank[b.tier] || 0);
        } else {
          // dateAdded
          diff = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
        }

        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [items, searchQuery, aiMatchedIds, selectedCategory, selectedTier, sortField, sortOrder]);

  const getTierColor = (tier: AssetTier) => {
    switch (tier) {
      case 'masterwork':
        return 'border-amber-500/50 bg-amber-500/10 text-amber-300';
      case 'relic':
        return 'border-purple-500/50 bg-purple-500/10 text-purple-300';
      case 'rare':
        return 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300';
      case 'experimental':
        return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300';
      default:
        return 'border-slate-700 bg-slate-800/50 text-slate-400';
    }
  };

  const getCategoryIcon = (category: AssetCategory) => {
    switch (category) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">KEEPER Vault Explorer</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {items.length} Assets
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Persistent IndexedDB 3D asset storage &amp; Gemini natural language discovery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenUpload}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Ingest Asset</span>
            </button>

            <button
              onClick={handleBatchExport}
              disabled={batchExporting || filteredItems.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Download bundles for first 5 visible items"
            >
              {batchExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden sm:inline">Batch Export (ZIP)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 space-y-3">
          {/* Natural Language Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTriggerAiSearch();
                }}
                placeholder='Search vault with natural language (e.g., "Find rigged humanoid models compatible with Blender 4.2")...'
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* AI Search Action Button */}
            <button
              onClick={handleTriggerAiSearch}
              disabled={isAiSearching || !searchQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 shrink-0"
              title="Execute Gemini AI semantic ranking and reasoning"
            >
              {isAiSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">AI Vault Search</span>
            </button>
          </div>

          {/* Category Tabs & Multi-attribute Sorting */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              {(
                [
                  { id: 'all', label: 'All Vault' },
                  { id: '3d-model', label: '3D Models' },
                  { id: 'script', label: 'Scripts (.py, .ts)' },
                  { id: 'shader', label: 'Shaders (.hlsl)' },
                  { id: 'molecular', label: 'Molecular (Mol*)' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Multi-attribute Sorting Controls */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sort:</span>
              </div>

              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as ArchiveSortField)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="dateAdded">Date Pushed (Timestamp)</option>
                <option value="name">Name (A-Z)</option>
                <option value="size">File Size</option>
                <option value="tier">Vault Tier</option>
              </select>

              <button
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono font-bold"
                title={`Order: ${sortOrder.toUpperCase()}`}
              >
                {sortOrder === 'asc' ? '↑ ASC' : '↓ DESC'}
              </button>

              {/* View Mode Switcher: Grid vs Catalogue Table */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 ml-1">
                <button
                  onClick={() => setCatalogueLayout('grid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    catalogueLayout === 'grid'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setCatalogueLayout('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    catalogueLayout === 'table'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Table
                </button>
              </div>
            </div>
          </div>

          {/* AI Search Active Indicator Banner */}
          {aiMatchedIds !== null && (
            <div className="px-3 py-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Semantic query matched <strong>{filteredItems.length}</strong> asset(s) based on your intent.
                </span>
              </div>
              <button
                onClick={handleClearSearch}
                className="text-[11px] text-slate-400 hover:text-white underline ml-2"
              >
                Reset Search
              </button>
            </div>
          )}
        </div>

        {/* Asset Grid / Catalogue Table Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Box className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-300">No assets found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                No items match your query &ldquo;{searchQuery}&rdquo;. Try adjusting the search keywords, clearing filters, or ingesting a new asset.
              </p>
              <button
                onClick={onOpenUpload}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Ingest New Asset
              </button>
            </div>
          ) : catalogueLayout === 'table' ? (
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/50">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold">
                    <th className="py-3 px-4">Model / Asset Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Format</th>
                    <th className="py-3 px-3">Storage Source</th>
                    <th className="py-3 px-3">Pushed Timestamp</th>
                    <th className="py-3 px-3 text-right">Size</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredItems.map((item) => {
                    const isVisualizing =
                      Boolean(activeModelName) &&
                      (activeModelName.toLowerCase().includes(item.name.toLowerCase()) ||
                        (item.pdbId && activeModelName.toLowerCase().includes(item.pdbId.toLowerCase())) ||
                        (item.sampleType && activeModelName.toLowerCase().includes(item.sampleType.toLowerCase())));
                    const is3DOrMol = item.category === '3d-model' || item.category === 'molecular';
                    const relTime = formatRelativeTime(item.dateAdded);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isVisualizing ? 'bg-indigo-950/30' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                              {getCategoryIcon(item.category)}
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-2">
                                <span>{item.name}</span>
                                {isVisualizing && (
                                  <span className="text-[10px] font-semibold text-emerald-400">
                                    · Active in Viewport
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 line-clamp-1">
                                {item.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 capitalize text-slate-300">
                          {item.category.replace('-', ' ')}
                        </td>
                        <td className="py-3 px-3 font-mono uppercase text-slate-300">
                          .{item.format}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {item.blob
                            ? 'IndexedDB Binary'
                            : item.pdbId
                            ? `RCSB (${item.pdbId})`
                            : 'Vault Catalogue'}
                        </td>
                        <td
                          className="py-3 px-3 font-mono tabular-nums text-slate-300"
                          title={`Pushed: ${formatVaultDateTime(item.dateAdded)} (${item.dateAdded})`}
                        >
                          <div>{formatVaultShortTimestamp(item.dateAdded)}</div>
                          {relTime && (
                            <div className="text-[10px] text-indigo-300/80">{relTime}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-400">
                          {(item.size / 1024).toFixed(1)} KB
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onDeleteAsset && (
                              confirmDeleteId === item.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      onDeleteAsset(item.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors"
                                  >
                                    Confirm Delete
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(item.id)}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition-colors"
                                  title="Remove model from IndexedDB database"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                            <button
                              onClick={() => onInspectAsset(item)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => {
                                onLoadAsset(item);
                                onClose();
                              }}
                              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors inline-flex items-center gap-1"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{is3DOrMol ? 'Visualize' : 'Open'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const matchReason = aiReasoningMap[item.id];
                const isVisualizing =
                  Boolean(activeModelName) &&
                  (activeModelName.toLowerCase().includes(item.name.toLowerCase()) ||
                    (item.pdbId && activeModelName.toLowerCase().includes(item.pdbId.toLowerCase())) ||
                    (item.sampleType && activeModelName.toLowerCase().includes(item.sampleType.toLowerCase())));
                const is3DOrMol = item.category === '3d-model' || item.category === 'molecular';

                return (
                  <div
                    key={item.id}
                    className={`group rounded-2xl bg-slate-950/60 hover:bg-slate-950/90 border p-4 transition-all duration-200 flex flex-col justify-between shadow-md hover:shadow-xl ${
                      isVisualizing
                        ? 'border-indigo-500/70 bg-indigo-950/20'
                        : 'border-slate-800 hover:border-indigo-500/50'
                    }`}
                  >
                    <div>
                      {/* Visual Preview Header */}
                      <div
                        onClick={() => {
                          onLoadAsset(item);
                          onClose();
                        }}
                        className="relative h-28 mb-3 rounded-xl bg-slate-900/90 border border-slate-800/90 overflow-hidden flex items-center justify-center cursor-pointer group/preview"
                      >
                        {item.category === 'molecular' ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <Dna className="w-9 h-9 text-emerald-400/80 group-hover/preview:scale-110 transition-transform" />
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-1 rounded-full" style={{ backgroundColor: '#0053D6' }} />
                              <span className="w-3 h-1 rounded-full" style={{ backgroundColor: '#65CBF3' }} />
                              <span className="w-3 h-1 rounded-full" style={{ backgroundColor: '#FFDB13' }} />
                              <span className="w-3 h-1 rounded-full" style={{ backgroundColor: '#FF7D45' }} />
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {item.pdbId ? `PDB ${item.pdbId} · ${item.version || '3D'}` : 'Mol* Structure'}
                            </span>
                          </div>
                        ) : item.category === '3d-model' ? (
                          <div className="flex flex-col items-center gap-1.5">
                            <Box className="w-9 h-9 text-cyan-400/80 group-hover/preview:scale-110 transition-transform" />
                            <span className="text-[10px] font-mono text-slate-400">
                              Three.js 3D Mesh · .{item.format.toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-full p-3 font-mono text-[10px] text-slate-400 bg-slate-950/80 overflow-hidden leading-relaxed">
                            {(item.codeContent || '// Script Asset').slice(0, 160)}
                          </div>
                        )}

                        {/* Hover Visualize Overlay */}
                        <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-semibold text-white">
                          <Play className="w-4 h-4 fill-current text-indigo-400" />
                          <span>{is3DOrMol ? 'Click to Visualize in 3D' : 'Click to Open Script'}</span>
                        </div>
                      </div>

                      {/* Metadata Kicker */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="uppercase text-slate-300 font-semibold">.{item.format}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.blob ? 'IndexedDB' : item.pdbId ? 'RCSB' : 'Vault'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{item.tier}</span>
                        </div>
                        {isVisualizing && (
                          <span className="text-[10px] font-semibold text-emerald-400">
                            Visualizing
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {/* AI Search Match Reason */}
                      {matchReason && (
                        <div className="mt-2.5 p-2 rounded-lg bg-indigo-950/50 border border-indigo-500/20 text-[11px] text-indigo-200 flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{matchReason}</span>
                        </div>
                      )}

                      {/* Compatibility Text */}
                      {item.compatibility && item.compatibility.length > 0 && (
                        <div className="mt-2.5 text-[11px] text-slate-400 truncate">
                          {item.compatibility.join(' · ')}
                        </div>
                      )}

                      {/* Pushed Date & Exact Timestamp */}
                      <div
                        className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums"
                        title={`Pushed to Vault: ${formatVaultDateTime(item.dateAdded)} (${item.dateAdded})`}
                      >
                        <span>Pushed {formatVaultShortTimestamp(item.dateAdded)}</span>
                        {formatRelativeTime(item.dateAdded) && (
                          <span className="text-indigo-300/90">{formatRelativeTime(item.dateAdded)}</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Metadata & Actions */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                        {(item.size / 1024).toFixed(1)} KB
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onDeleteAsset && (
                          confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  onDeleteAsset(item.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition-colors"
                              title="Remove from IndexedDB database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                        <button
                          onClick={() => onInspectAsset(item)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                          title="View Details & AI Inspection Report"
                        >
                          Inspect
                        </button>

                        <button
                          onClick={() => {
                            onLoadAsset(item);
                            onClose();
                          }}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                          title="Load into 3D / Mol* Viewer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>{is3DOrMol ? 'Visualize' : 'Open'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Palette,
  Film,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Focus,
  Play,
  Pause,
  Box,
  Dna,
  Atom,
  Flame,
  ChevronLeft,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  AnimationClipInfo,
  ArchiveItem,
  AssetCategory,
  MaterialInfo,
  MeshNodeItem,
  MolecularLigandInfo,
  MolecularStats,
  ViewerMode,
} from '../types';
import { formatVaultDateTime, formatVaultShortTimestamp, formatRelativeTime } from '../lib/db';

interface ModelTreePanelProps {
  viewerMode: ViewerMode;
  tree: MeshNodeItem | null;
  materials: MaterialInfo[];
  molecularStats: MolecularStats | null;
  animations: AnimationClipInfo[];
  currentAnimationIndex: number;
  onSelectAnimation: (index: number) => void;
  isPlayingAnimation: boolean;
  onTogglePlayAnimation: () => void;
  animationTime: number;
  animationDuration: number;
  onSeekAnimation: (time: number) => void;
  animationSpeed: number;
  onChangeAnimationSpeed: (speed: number) => void;
  onToggleNodeVisibility: (nodeId: string, visible: boolean) => void;
  onFocusNode: (nodeId: string) => void;
  onFocusMolecularChain?: (chainId: string) => void;
  onToggleLigandVisibility?: (ligandId: string, visible: boolean) => void;
  onToggleAllLigandsVisibility?: (visible: boolean) => void;
  onFocusLigand?: (ligand: MolecularLigandInfo) => void;
  onHoverLigand?: (ligand: MolecularLigandInfo | null) => void;
  onUpdateMaterialColor: (matId: string, hexColor: string) => void;
  vaultItems?: ArchiveItem[];
  activeModelName?: string;
  onLoadVaultItem?: (item: ArchiveItem) => void;
  onInspectVaultItem?: (item: ArchiveItem) => void;
  onDeleteVaultItem?: (id: string) => void;
  onOpenArchiveExplorer?: () => void;
  onOpenUploadModal?: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const ModelTreePanel: React.FC<ModelTreePanelProps> = ({
  viewerMode,
  tree,
  materials,
  molecularStats,
  animations,
  currentAnimationIndex,
  onSelectAnimation,
  isPlayingAnimation,
  onTogglePlayAnimation,
  animationTime,
  animationDuration,
  onSeekAnimation,
  animationSpeed,
  onChangeAnimationSpeed,
  onToggleNodeVisibility,
  onFocusNode,
  onFocusMolecularChain,
  onToggleLigandVisibility,
  onToggleAllLigandsVisibility,
  onFocusLigand,
  onHoverLigand,
  onUpdateMaterialColor,
  vaultItems = [],
  activeModelName = '',
  onLoadVaultItem,
  onInspectVaultItem,
  onDeleteVaultItem,
  onOpenArchiveExplorer,
  onOpenUploadModal,
  isOpen,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState<'vault' | 'hierarchy' | 'materials' | 'animations' | 'ligands'>('vault');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [ligandFilter, setLigandFilter] = useState<string>('');
  const [vaultFilter, setVaultFilter] = useState<string>('');
  const [vaultCategory, setVaultCategory] = useState<'all' | AssetCategory>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleNodeExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const ligands = molecularStats?.ligands || [];

  // Filter ligands by search query
  const filteredLigands = useMemo(() => {
    if (!ligandFilter.trim()) return ligands;
    const q = ligandFilter.trim().toLowerCase();
    return ligands.filter(
      (lig) =>
        lig.chemId.toLowerCase().includes(q) ||
        lig.name.toLowerCase().includes(q) ||
        lig.chainId.toLowerCase().includes(q) ||
        String(lig.resSeq).includes(q) ||
        (lig.formula && lig.formula.toLowerCase().includes(q)) ||
        (lig.description && lig.description.toLowerCase().includes(q))
    );
  }, [ligands, ligandFilter]);

  const visibleLigandsCount = useMemo(() => {
    return ligands.filter((l) => l.visible).length;
  }, [ligands]);

  // Color generator for chemical ligand badges
  const getLigandBadgeStyle = (chemId: string) => {
    const id = chemId.toUpperCase();
    if (id === 'HEM' || id === 'HEA' || id === 'HEC') {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
    if (id === 'REA' || id === 'PLP' || id === 'SAM') {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    if (id === 'ATP' || id === 'ADP' || id === 'GTP' || id === 'GDP') {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    }
    if (id === 'ZN' || id === 'MG' || id === 'CA' || id === 'FE' || id === 'MN' || id === 'CU') {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
    if (id === 'NAG' || id === 'MAN' || id === 'BMA' || id === 'GLC') {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
    return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
  };

  // Render 3D CAD tree node recursively
  const renderTreeNode = (node: MeshNodeItem, depth = 0) => {
    const isExpanded = expandedNodes[node.id] ?? true;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="flex flex-col select-none">
        <div
          className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-800/80 text-xs transition-colors group cursor-pointer"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => onFocusNode(node.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpand(node.id);
              }}
              className="p-0.5 rounded hover:bg-slate-700 text-slate-400"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-3.5" />
          )}

          <Box className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate flex-1 font-medium text-slate-300 group-hover:text-white">
            {node.name}
          </span>

          {node.triangleCount > 0 && (
            <span className="text-[10px] text-slate-500 font-mono">
              {node.triangleCount.toLocaleString()}△
            </span>
          )}

          {/* Visibility toggle button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleNodeVisibility(node.id, !node.visible);
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity"
            title={node.visible ? 'Hide Mesh' : 'Show Mesh'}
          >
            {node.visible ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 text-red-400" />}
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="flex flex-col">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Reusable Ligand Item Component
  const renderLigandItem = (ligand: MolecularLigandInfo) => {
    return (
      <div
        key={ligand.id}
        onMouseEnter={() => onHoverLigand?.(ligand)}
        onMouseLeave={() => onHoverLigand?.(null)}
        className={`p-2.5 rounded-xl border transition-all ${
          ligand.visible
            ? 'bg-slate-800/70 border-slate-700/70 hover:border-indigo-500/50 hover:bg-slate-800'
            : 'bg-slate-900/50 border-slate-800/80 opacity-60'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Left: Chemical Badge & Identifiers */}
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold border tracking-wider ${getLigandBadgeStyle(
                ligand.chemId
              )}`}
            >
              {ligand.chemId}
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <span className={ligand.visible ? 'text-white' : 'line-through text-slate-400'}>
                  Chain {ligand.chainId}
                </span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-cyan-400">Res #{ligand.resSeq}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {ligand.count} atoms {ligand.formula ? `• ${ligand.formula}` : ''}
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1">
            {/* Focus Camera on Ligand */}
            <button
              onClick={() => onFocusLigand?.(ligand)}
              title={`Focus camera on ${ligand.chemId} (${ligand.name})`}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 transition-colors"
            >
              <Focus className="w-3.5 h-3.5" />
            </button>

            {/* Individual Visibility Toggle */}
            <button
              id={`toggle-ligand-${ligand.id}`}
              onClick={() => onToggleLigandVisibility?.(ligand.id, !ligand.visible)}
              title={ligand.visible ? `Hide ${ligand.chemId}` : `Show ${ligand.chemId}`}
              className={`p-1.5 rounded-lg border transition-all ${
                ligand.visible
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {ligand.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />}
            </button>
          </div>
        </div>

        {/* Chemical Name and Description */}
        <div className="mt-2 text-xs font-medium text-slate-300 leading-snug">
          {ligand.name}
        </div>
        {ligand.description && (
          <div className="mt-0.5 text-[10px] text-slate-400 leading-normal">
            {ligand.description}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      id="left-sidebar-panel"
      className={`absolute top-0 left-0 bottom-0 z-20 flex transition-all duration-300 ease-in-out ${
        isOpen ? 'w-80' : 'w-0'
      }`}
    >
      <div className="w-80 h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Header Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 p-1 shrink-0 gap-0.5">
          <button
            id="sidebar-tab-vault-catalogue"
            onClick={() => setActiveTab('vault')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
              activeTab === 'vault'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Vault ({vaultItems.length})</span>
          </button>

          {viewerMode === 'molstar' ? (
            <>
              <button
                onClick={() => setActiveTab('hierarchy')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'hierarchy'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Dna className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Chains</span>
              </button>

              <button
                id="sidebar-tab-ligands"
                onClick={() => setActiveTab('ligands')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'ligands'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Atom className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">Ligands ({ligands.length})</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('hierarchy')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'hierarchy'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Nodes</span>
              </button>

              <button
                onClick={() => setActiveTab('materials')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                  activeTab === 'materials'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span className="truncate">Mats</span>
              </button>

              {animations.length > 0 && (
                <button
                  onClick={() => setActiveTab('animations')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                    activeTab === 'animations'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Clips</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* VAULT CATALOGUE TAB */}
          {activeTab === 'vault' && (
            <div className="space-y-3">
              {/* Top Vault Header & Actions */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Stored Vault Catalogue</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {vaultItems.filter((i) => i.category === '3d-model' || i.category === 'molecular').length} 3D/Mol models · {vaultItems.length} total
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {onOpenUploadModal && (
                    <button
                      onClick={onOpenUploadModal}
                      className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition-colors"
                      title="Ingest new 3D model, PDB/mmCIF structure, or script into Vault"
                    >
                      + Ingest
                    </button>
                  )}
                  {onOpenArchiveExplorer && (
                    <button
                      onClick={onOpenArchiveExplorer}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-medium transition-colors"
                      title="Expand full-screen Vault Catalogue & AI Search"
                    >
                      Expand
                    </button>
                  )}
                </div>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={vaultFilter}
                  onChange={(e) => setVaultFilter(e.target.value)}
                  placeholder="Filter catalogue models..."
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Category Filter Segmented Control */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950/70 rounded-xl border border-slate-800/80">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'molecular', label: 'Mol*' },
                    { id: '3d-model', label: '3D Mesh' },
                    { id: 'script', label: 'Code' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setVaultCategory(cat.id as 'all' | AssetCategory)}
                    className={`py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                      vaultCategory === cat.id
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Vault Model Cards List (Sorted Newest First) */}
              <div className="space-y-2">
                {[...vaultItems]
                  .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
                  .filter((item) => {
                    if (vaultCategory === 'script') {
                      if (item.category !== 'script' && item.category !== 'shader') return false;
                    } else if (vaultCategory !== 'all' && item.category !== vaultCategory) {
                      return false;
                    }
                    if (vaultFilter.trim()) {
                      const q = vaultFilter.toLowerCase();
                      return (
                        item.name.toLowerCase().includes(q) ||
                        item.format.toLowerCase().includes(q) ||
                        item.description.toLowerCase().includes(q) ||
                        item.tags.some((t) => t.toLowerCase().includes(q))
                      );
                    }
                    return true;
                  })
                  .map((item) => {
                    const isVisualizing =
                      Boolean(activeModelName) &&
                      (activeModelName.toLowerCase().includes(item.name.toLowerCase()) ||
                        (item.pdbId && activeModelName.toLowerCase().includes(item.pdbId.toLowerCase())) ||
                        (item.sampleType && activeModelName.toLowerCase().includes(item.sampleType.toLowerCase())));

                    const isVisual3DOrMol = item.category === 'molecular' || item.category === '3d-model';
                    const relTime = formatRelativeTime(item.dateAdded);

                    return (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isVisualizing
                            ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md'
                            : 'bg-slate-800/50 hover:bg-slate-800/90 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                              <span className="uppercase font-semibold text-slate-300">.{item.format}</span>
                              <span aria-hidden="true">·</span>
                              <span className="capitalize">{item.category.replace('-', ' ')}</span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">{(item.size / 1024).toFixed(0)} KB</span>
                            </div>
                            <div
                              onClick={() => onLoadVaultItem?.(item)}
                              className="text-xs font-semibold text-white hover:text-indigo-300 cursor-pointer truncate mt-0.5"
                              title={item.name}
                            >
                              {item.name}
                            </div>
                          </div>

                          {isVisualizing && (
                            <span className="text-[10px] font-semibold text-emerald-400 shrink-0">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                          {item.description}
                        </p>

                        {/* Pushed Date & Exact Timestamp Line */}
                        <div
                          className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono tabular-nums"
                          title={`Pushed to Vault: ${formatVaultDateTime(item.dateAdded)} (${item.dateAdded})`}
                        >
                          <span>Pushed {formatVaultShortTimestamp(item.dateAdded)}</span>
                          {relTime && <span className="text-indigo-300/90">{relTime}</span>}
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between gap-1.5">
                          <span className="text-[10px] text-slate-400 truncate">
                            {item.blob ? 'IndexedDB Binary' : item.pdbId ? `RCSB ${item.pdbId}` : 'Vault Asset'}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            {onDeleteVaultItem && (
                              confirmDeleteId === item.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      onDeleteVaultItem(item.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-semibold transition-colors"
                                    title="Confirm permanent removal from IndexedDB"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(item.id)}
                                  className="p-1 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors"
                                  title="Remove model from IndexedDB database"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )
                            )}
                            <button
                              onClick={() => onInspectVaultItem?.(item)}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium transition-colors"
                              title="Inspect metadata, code, or AI analysis"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => onLoadVaultItem?.(item)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                                isVisualizing
                                  ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-200'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              }`}
                              title={
                                isVisual3DOrMol
                                  ? 'Visualize model in 3D / Mol* Viewport'
                                  : 'Open script in Code Studio'
                              }
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>{isVisual3DOrMol ? 'Visualize' : 'Open'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Molecular Structure View (Mol*) */}
          {activeTab !== 'vault' && viewerMode === 'molstar' && molecularStats && (
            <div className="space-y-4">
              {/* If on Ligands Tab: Dedicated Ligand Manager */}
              {activeTab === 'ligands' ? (
                <div className="space-y-3">
                  {/* Section Title & Statistics */}
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Atom className="w-4 h-4 text-cyan-400" />
                        <span>Identified Ligands</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {visibleLigandsCount} of {ligands.length} visible
                      </p>
                    </div>

                    {/* Batch Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleAllLigandsVisibility?.(true)}
                        title="Show All Ligands"
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3 text-emerald-400" />
                        <span>All</span>
                      </button>
                      <button
                        onClick={() => onToggleAllLigandsVisibility?.(false)}
                        title="Hide All Ligands"
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <EyeOff className="w-3 h-3 text-red-400" />
                        <span>None</span>
                      </button>
                    </div>
                  </div>

                  {/* Search / Filter Input */}
                  {ligands.length > 2 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={ligandFilter}
                        onChange={(e) => setLigandFilter(e.target.value)}
                        placeholder="Search by ID, name, chain..."
                        className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  )}

                  {/* List of Ligands */}
                  {filteredLigands.length > 0 ? (
                    <div className="space-y-2">
                      {filteredLigands.map((lig) => renderLigandItem(lig))}
                    </div>
                  ) : ligands.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-center space-y-1.5">
                      <Atom className="w-6 h-6 text-slate-500 mx-auto" />
                      <div className="text-xs font-semibold text-slate-300">No Ligands Detected</div>
                      <div className="text-[10px] text-slate-500 leading-relaxed">
                        This structure does not contain non-solvent heteroatoms or chemical cofactors.
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-800/30 text-center text-xs text-slate-400">
                      No ligands match "{ligandFilter}"
                    </div>
                  )}
                </div>
              ) : (
                /* Default Chains & Structure Overview Tab */
                <div className="space-y-4">
                  {/* Chains Section */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Polymer Chains</span>
                      <span className="text-slate-500 font-mono">
                        {molecularStats.chains.length} Chains
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {molecularStats.chains.map((chain) => (
                        <div
                          key={chain.id}
                          onClick={() => onFocusMolecularChain?.(chain.id)}
                          className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                              {chain.id}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                                {chain.name}
                              </div>
                              <div className="text-[10px] text-slate-400 capitalize">
                                {chain.type} • {chain.residueCount} residues
                              </div>
                            </div>
                          </div>
                          <Focus className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sidebar Section: Identified Ligands with Individual Visibility Toggles */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Atom className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Ligands & Bound Molecules</span>
                      </span>
                      <span className="text-slate-500 font-mono">
                        {visibleLigandsCount} / {ligands.length} Visible
                      </span>
                    </div>

                    {ligands.length > 0 ? (
                      <div className="space-y-2">
                        {/* Quick Batch Actions */}
                        <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                          <span>{ligands.length} bound ligands</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onToggleAllLigandsVisibility?.(true)}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3 text-emerald-400" />
                              <span>Show All</span>
                            </button>
                            <button
                              onClick={() => onToggleAllLigandsVisibility?.(false)}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1"
                            >
                              <EyeOff className="w-3 h-3 text-red-400" />
                              <span>Hide All</span>
                            </button>
                          </div>
                        </div>

                        {/* List all ligands with individual visibility toggles */}
                        <div className="space-y-2">
                          {ligands.map((lig) => renderLigandItem(lig))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-400">
                        No non-solvent chemical ligands detected.
                      </div>
                    )}
                  </div>

                  {/* Secondary Structure Breakdown */}
                  {((molecularStats.helixCount ?? 0) > 0 || (molecularStats.sheetCount ?? 0) > 0) && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Secondary Structure Elements
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 flex flex-col">
                          <span className="text-[10px] text-slate-400">Alpha Helices</span>
                          <span className="text-sm font-bold text-pink-400 font-mono">
                            {molecularStats.helixCount || 0}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 flex flex-col">
                          <span className="text-[10px] text-slate-400">Beta Sheets</span>
                          <span className="text-sm font-bold text-amber-400 font-mono">
                            {molecularStats.sheetCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3D CAD / Mesh View (Three.js) */}
          {viewerMode === 'three' && (
            <>
              {activeTab === 'hierarchy' && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Scene Graph
                  </div>
                  {tree ? (
                    renderTreeNode(tree)
                  ) : (
                    <div className="text-xs text-slate-500 py-4 text-center">
                      No scene nodes loaded
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'materials' && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Materials ({materials.length})
                  </div>
                  {materials.map((mat) => (
                    <div
                      key={mat.id}
                      className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={mat.color || '#cccccc'}
                          onChange={(e) => onUpdateMaterialColor(mat.id, e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{mat.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Rough: {mat.roughness.toFixed(2)} • Metal: {mat.metalness.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {(mat.type || 'PBR').replace('Mesh', '').replace('Material', '')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'animations' && (
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Skeletal Animations
                  </div>
                  <div className="space-y-1.5">
                    {animations.map((clip, index) => (
                      <div
                        key={clip.name || index}
                        onClick={() => onSelectAnimation(index)}
                        className={`p-2 rounded-xl border cursor-pointer transition-colors flex items-center justify-between text-xs ${
                          currentAnimationIndex === index
                            ? 'bg-indigo-600/30 border-indigo-500/50 text-white'
                            : 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="font-medium truncate">{clip.name || `Clip ${index + 1}`}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {clip.duration.toFixed(2)}s
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Playback Controls */}
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <button
                        onClick={onTogglePlayAnimation}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1.5 transition-colors"
                      >
                        {isPlayingAnimation ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlayingAnimation ? 'Pause' : 'Play'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {[0.5, 1, 2].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => onChangeAnimationSpeed(spd)}
                            className={`px-2 py-1 rounded text-[10px] font-mono ${
                              animationSpeed === spd
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>{animationTime.toFixed(2)}s</span>
                        <span>{animationDuration.toFixed(2)}s</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={animationDuration || 1}
                        step="0.01"
                        value={animationTime}
                        onChange={(e) => onSeekAnimation(Number(e.target.value))}
                        className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Collapse/Expand Toggle Tab */}
      <button
        id="toggle-left-sidebar"
        onClick={onToggleOpen}
        title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
        className="self-center -mr-3 z-30 w-6 h-12 bg-slate-800/90 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 rounded-r-xl flex items-center justify-center shadow-lg transition-colors"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </aside>
  );
};

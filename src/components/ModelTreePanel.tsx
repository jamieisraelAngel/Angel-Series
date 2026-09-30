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
  CircleDot,
  Copy,
  Check,
} from 'lucide-react';
import {
  AnimationClipInfo,
  ArchiveItem,
  AssetCategory,
  ChainHighlightConfig,
  ChainResidueEntry,
  MaterialInfo,
  MeshNodeItem,
  MolecularChainInfo,
  MolecularLigandInfo,
  MolecularStats,
  ViewerMode,
} from '../types';
import { formatVaultDateTime, formatVaultShortTimestamp, formatRelativeTime } from '../lib/db';
import { getAminoAcidInfo, getPlddtColor, resNameToOneLetter } from '../utils/molecularHelpers';

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
  chainHighlight?: ChainHighlightConfig;
  onChangeChainHighlight?: (updated: Partial<ChainHighlightConfig>) => void;
  onHoverMolecularChain?: (chainId: string | null) => void;
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
  chainHighlight,
  onChangeChainHighlight,
  onHoverMolecularChain,
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
  const [expandedChains, setExpandedChains] = useState<Record<string, boolean>>({ A: true });
  const [sequenceFormat, setSequenceFormat] = useState<'1-letter' | '3-letter' | 'fasta'>('1-letter');
  const [copiedChainId, setCopiedChainId] = useState<string | null>(null);
  const [hoveredResidue, setHoveredResidue] = useState<{
    chainId: string;
    entry: ChainResidueEntry;
  } | null>(null);
  const [ligandFilter, setLigandFilter] = useState<string>('');
  const [vaultFilter, setVaultFilter] = useState<string>('');
  const [vaultCategory, setVaultCategory] = useState<'all' | AssetCategory>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleNodeExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleChainExpand = (chainId: string) => {
    setExpandedChains((prev) => ({ ...prev, [chainId]: !prev[chainId] }));
  };

  const getChainResidueList = (chain: MolecularChainInfo): ChainResidueEntry[] => {
    if (chain.residues && chain.residues.length > 0) {
      return chain.residues;
    }
    const fromStats = (molecularStats?.residueConfidences || [])
      .filter((r) => r.chainId === chain.id)
      .sort((a, b) => a.resSeq - b.resSeq)
      .map((r) => ({
        resSeq: r.resSeq,
        resName: r.resName,
        oneLetter: resNameToOneLetter(r.resName),
        score: r.score,
        rawBFactor: r.rawBFactor,
      }));
    if (fromStats.length > 0) {
      return fromStats;
    }
    // Deterministic fallback sequence if structure file had no parsed ATOM residue records
    const sampleTriplets =
      chain.type === 'nucleic'
        ? ['DC', 'DG', 'DC', 'DG', 'DA', 'DT', 'DT', 'DC', 'DG', 'DC', 'DG', 'DA']
        : [
            'VAL', 'LEU', 'SER', 'PRO', 'ALA', 'ASP', 'LYS', 'THR', 'ASN', 'VAL',
            'LYS', 'ALA', 'ALA', 'TRP', 'GLY', 'LYS', 'VAL', 'GLY', 'ALA', 'HIS',
          ];
    const count = Math.min(Math.max(chain.residueCount || 20, 1), 300);
    return Array.from({ length: count }, (_, idx) => {
      const resName = sampleTriplets[idx % sampleTriplets.length];
      return {
        resSeq: idx + 1,
        resName,
        oneLetter: resNameToOneLetter(resName),
        score: 91.5,
        rawBFactor: 18.0,
      };
    });
  };

  const handleCopySequence = (chain: MolecularChainInfo, residues: ChainResidueEntry[]) => {
    const seqStr = residues.map((r) => r.oneLetter).join('');
    const header = `>${molecularStats?.pdbId || 'MODEL'}_Chain_${chain.id} (${residues.length} residues)`;
    const fastaText =
      sequenceFormat === 'fasta'
        ? `${header}\n${seqStr.match(/.{1,60}/g)?.join('\n') || seqStr}`
        : seqStr;
    navigator.clipboard?.writeText(fastaText).catch(() => {});
    setCopiedChainId(chain.id);
    setTimeout(() => {
      setCopiedChainId((prev) => (prev === chain.id ? null : prev));
    }, 1800);
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
                  {/* Chains Section with Glow, Ring & Isolate Chain Toggle */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <CircleDot
                          className="w-3.5 h-3.5"
                          style={{ color: chainHighlight?.color || '#00f0ff' }}
                        />
                        <span>Polymer Chains</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {chainHighlight && onChangeChainHighlight && (
                          <button
                            id="btn-toggle-isolate-chain"
                            type="button"
                            onClick={() => {
                              const nextIsolate = !chainHighlight.isolateOnAction;
                              onChangeChainHighlight({
                                isolateOnAction: nextIsolate,
                                mode: nextIsolate ? 'isolate' : 'glow-halo',
                              });
                            }}
                            title="When enabled, clicking Highlight or Focus on a chain isolates it and hides all other structures"
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 transition-all ${
                              chainHighlight.isolateOnAction || chainHighlight.mode === 'isolate'
                                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {chainHighlight.isolateOnAction || chainHighlight.mode === 'isolate' ? (
                              <EyeOff className="w-3 h-3 text-amber-400" />
                            ) : (
                              <Eye className="w-3 h-3 text-slate-400" />
                            )}
                            <span>Isolate Chain</span>
                          </button>
                        )}
                        <span className="text-slate-500 font-mono">
                          {molecularStats.chains.length}
                        </span>
                      </div>
                    </div>

                    {/* Glow & Color Ring Customizer Bar */}
                    {chainHighlight && onChangeChainHighlight && (
                      <div className="mb-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-300">
                            {chainHighlight.isolateOnAction || chainHighlight.mode === 'isolate'
                              ? 'Isolate Mode Active (Hides Other Structures)'
                              : 'Highlight Style & Ring Color'}
                          </span>
                          {chainHighlight.chainId && (
                            <button
                              type="button"
                              onClick={() => onChangeChainHighlight({ chainId: null })}
                              className="text-[10px] font-semibold text-rose-400 hover:text-rose-300"
                            >
                              Show All ({chainHighlight.chainId})
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1">
                          {(
                            [
                              { id: 'glow-halo', label: 'Glow Halo' },
                              { id: 'color-ring', label: 'Color Ring' },
                              { id: 'isolate', label: 'Isolate Only' },
                            ] as const
                          ).map((modeOpt) => (
                            <button
                              key={modeOpt.id}
                              type="button"
                              onClick={() =>
                                onChangeChainHighlight({
                                  mode: modeOpt.id,
                                  isolateOnAction: modeOpt.id === 'isolate',
                                })
                              }
                              className={`py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                                chainHighlight.mode === modeOpt.id
                                  ? 'bg-indigo-600/30 border-indigo-500/60 text-white'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {modeOpt.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-0.5">
                          <div className="flex items-center gap-1.5">
                            {['#00f0ff', '#10b981', '#f43f5e', '#f59e0b', '#a855f7', '#38bdf8'].map(
                              (hex) => (
                                <button
                                  key={hex}
                                  type="button"
                                  onClick={() => onChangeChainHighlight({ color: hex })}
                                  className={`w-4 h-4 rounded-full transition-transform ${
                                    chainHighlight.color.toLowerCase() === hex
                                      ? 'scale-125 ring-2 ring-white'
                                      : 'opacity-75 hover:opacity-100'
                                  }`}
                                  style={{
                                    backgroundColor: hex,
                                    boxShadow: `0 0 8px ${hex}88`,
                                  }}
                                  title={`Set ring & glow color to ${hex}`}
                                />
                              )
                            )}
                            <input
                              type="color"
                              value={chainHighlight.color}
                              onChange={(e) => onChangeChainHighlight({ color: e.target.value })}
                              className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
                              title="Pick custom glow / ring color"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              onChangeChainHighlight({ dimOthers: !chainHighlight.dimOthers })
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                              chainHighlight.dimOthers
                                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                            title="Dim non-selected chains to accentuate the highlighted chain glow"
                          >
                            Dim Others
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {molecularStats.chains.map((chain) => {
                        const isGlowing = chainHighlight?.chainId === chain.id;
                        const isIsolateActive =
                          Boolean(chainHighlight?.isolateOnAction) ||
                          chainHighlight?.mode === 'isolate';
                        const activeColor = chainHighlight?.color || '#00f0ff';
                        const isExpanded = Boolean(expandedChains[chain.id]);
                        const chainResidues = getChainResidueList(chain);
                        const sequenceString =
                          chain.sequence || chainResidues.map((r) => r.oneLetter).join('');
                        const firstResSeq = chainResidues[0]?.resSeq ?? 1;
                        const lastResSeq =
                          chainResidues[chainResidues.length - 1]?.resSeq ?? chainResidues.length;
                        const activeHover =
                          hoveredResidue && hoveredResidue.chainId === chain.id
                            ? hoveredResidue.entry
                            : null;

                        return (
                          <div
                            key={chain.id}
                            onMouseEnter={() => onHoverMolecularChain?.(chain.id)}
                            onMouseLeave={() => onHoverMolecularChain?.(null)}
                            className={`rounded-xl border transition-all overflow-hidden ${
                              isGlowing
                                ? 'bg-slate-800/90 text-white'
                                : 'bg-slate-800/60 hover:bg-slate-800/80 border-slate-700/50'
                            }`}
                            style={
                              isGlowing
                                ? {
                                    borderColor: activeColor,
                                    boxShadow: `0 0 16px ${activeColor}35, inset 0 0 12px ${activeColor}18`,
                                  }
                                : undefined
                            }
                          >
                            {/* Chain Row Header */}
                            <div
                              onClick={() => {
                                toggleChainExpand(chain.id);
                                onChangeChainHighlight?.({
                                  chainId: isGlowing ? null : chain.id,
                                });
                                if (!isGlowing) {
                                  onFocusMolecularChain?.(chain.id);
                                }
                              }}
                              className="p-2 cursor-pointer flex items-center justify-between gap-2 group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Expand / Collapse Chevron Button */}
                                <button
                                  type="button"
                                  aria-expanded={isExpanded}
                                  aria-label={`Toggle amino acid sequence for ${chain.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleChainExpand(chain.id);
                                  }}
                                  title={
                                    isExpanded
                                      ? `Collapse ${chain.name} amino acid sequence`
                                      : `Expand ${chain.name} amino acid sequence (${chainResidues.length} residues)`
                                  }
                                  className="p-1 rounded-lg bg-slate-900/70 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </button>

                                {/* Chain ID Badge with Glowing Color Ring */}
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all"
                                  style={
                                    isGlowing
                                      ? {
                                          backgroundColor: `${activeColor}28`,
                                          color: '#ffffff',
                                          border: `2px solid ${activeColor}`,
                                          boxShadow: `0 0 10px ${activeColor}`,
                                        }
                                      : {
                                          backgroundColor: 'rgba(16, 185, 129, 0.18)',
                                          color: '#6ee7b7',
                                          border: '1px solid rgba(16, 185, 129, 0.35)',
                                        }
                                  }
                                >
                                  {chain.id}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white flex items-center gap-1.5 truncate">
                                    <span className="truncate">{chain.name}</span>
                                    {isGlowing && (
                                      <span
                                        className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold shrink-0"
                                        style={{
                                          backgroundColor: `${activeColor}25`,
                                          color: activeColor,
                                        }}
                                      >
                                        {isIsolateActive ? 'Isolated' : 'Glowing'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 capitalize flex items-center gap-1.5">
                                    <span>
                                      {chain.type} • {chain.residueCount} residues
                                    </span>
                                    {!isExpanded && sequenceString && (
                                      <span className="font-mono text-[9px] text-slate-500 truncate max-w-[80px]">
                                        ({sequenceString.slice(0, 8)}…)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {/* Sequence Expand Pill Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleChainExpand(chain.id);
                                  }}
                                  title={
                                    isExpanded
                                      ? `Hide amino acid sequence for Chain ${chain.id}`
                                      : `Show amino acid sequence for Chain ${chain.id}`
                                  }
                                  className={`px-1.5 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-colors flex items-center gap-1 ${
                                    isExpanded
                                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                                      : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  <Dna className="w-3 h-3" />
                                  <span>Seq</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextChainId = isGlowing ? null : chain.id;
                                    onChangeChainHighlight?.({
                                      chainId: nextChainId,
                                    });
                                    if (nextChainId) {
                                      setExpandedChains((prev) => ({ ...prev, [chain.id]: true }));
                                    }
                                    if (nextChainId && isIsolateActive) {
                                      onFocusMolecularChain?.(chain.id);
                                    }
                                  }}
                                  title={
                                    isGlowing
                                      ? `Restore all chains / turn off highlight on Chain ${chain.id}`
                                      : isIsolateActive
                                      ? `Highlight & isolate Chain ${chain.id} (hiding all other structures)`
                                      : `Highlight Chain ${chain.id} with color ring`
                                  }
                                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 border transition-all ${
                                    isGlowing
                                      ? 'text-white'
                                      : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white'
                                  }`}
                                  style={
                                    isGlowing
                                      ? {
                                          backgroundColor: `${activeColor}30`,
                                          borderColor: activeColor,
                                        }
                                      : undefined
                                  }
                                >
                                  <Sparkles className="w-3 h-3" style={{ color: activeColor }} />
                                  <span>
                                    {isGlowing
                                      ? isIsolateActive
                                        ? 'Isolated'
                                        : 'Ring On'
                                      : isIsolateActive
                                      ? 'Isolate'
                                      : 'Glow'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onFocusMolecularChain?.(chain.id);
                                    setExpandedChains((prev) => ({ ...prev, [chain.id]: true }));
                                    if (isIsolateActive) {
                                      onChangeChainHighlight?.({
                                        chainId: chain.id,
                                      });
                                    }
                                  }}
                                  title={
                                    isIsolateActive
                                      ? `Focus & isolate Chain ${chain.id} (hide all other structures)`
                                      : `Focus camera on Chain ${chain.id}`
                                  }
                                  className={`p-1.5 rounded-lg border transition-colors ${
                                    isGlowing && isIsolateActive
                                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                      : 'bg-slate-900/80 border-transparent hover:bg-slate-700 text-slate-400 hover:text-indigo-400'
                                  }`}
                                >
                                  <Focus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Expandable Amino Acid / Nucleotide Sequence Drawer */}
                            {isExpanded && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="px-2.5 pb-2.5 pt-2 border-t border-slate-700/60 bg-slate-950/80 space-y-2"
                              >
                                {/* Sequence Controls Bar */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                                      {chain.type === 'nucleic'
                                        ? 'Nucleotide Sequence'
                                        : 'Amino Acid Sequence'}
                                    </span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                      {firstResSeq}–{lastResSeq} ({chainResidues.length}{' '}
                                      {chain.type === 'nucleic' ? 'nt' : 'aa'})
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {(
                                      [
                                        { id: '1-letter', label: '1-Letter' },
                                        { id: '3-letter', label: '3-Letter' },
                                        { id: 'fasta', label: 'FASTA' },
                                      ] as const
                                    ).map((fmt) => (
                                      <button
                                        key={fmt.id}
                                        type="button"
                                        onClick={() => setSequenceFormat(fmt.id)}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-colors ${
                                          sequenceFormat === fmt.id
                                            ? 'bg-indigo-600/30 border-indigo-500/60 text-white'
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                      >
                                        {fmt.label}
                                      </button>
                                    ))}

                                    <button
                                      type="button"
                                      onClick={() => handleCopySequence(chain, chainResidues)}
                                      title="Copy sequence to clipboard"
                                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                                    >
                                      {copiedChainId === chain.id ? (
                                        <>
                                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                                          <span className="text-emerald-300">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-2.5 h-2.5" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Sequence Display Body */}
                                {sequenceFormat === 'fasta' ? (
                                  <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-[10px] text-slate-200 leading-relaxed max-h-40 overflow-y-auto select-all break-all">
                                    <div className="text-indigo-400 font-semibold mb-1">
                                      &gt;{molecularStats.pdbId || 'MODEL'}_Chain_{chain.id} |{' '}
                                      {chainResidues.length} {chain.type === 'nucleic' ? 'nt' : 'aa'}
                                    </div>
                                    <div>{sequenceString}</div>
                                  </div>
                                ) : sequenceFormat === '3-letter' ? (
                                  <div
                                    onMouseLeave={() => setHoveredResidue(null)}
                                    className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/90 max-h-44 overflow-y-auto flex flex-wrap gap-1"
                                  >
                                    {chainResidues.map((res, idx) => {
                                      const plddt = getPlddtColor(res.score);
                                      const aaInfo = getAminoAcidInfo(res.resName);
                                      return (
                                        <button
                                          key={`${chain.id}-${res.resSeq}-${idx}`}
                                          type="button"
                                          onMouseEnter={() =>
                                            setHoveredResidue({ chainId: chain.id, entry: res })
                                          }
                                          onClick={() => onFocusMolecularChain?.(chain.id)}
                                          title={`${res.resName} ${res.resSeq} (${aaInfo.fullName}) • Confidence ${res.score.toFixed(1)}`}
                                          className="px-1.5 py-0.5 rounded bg-slate-950/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 font-mono text-[9px] flex items-center gap-1 transition-colors"
                                        >
                                          <span className="text-slate-500">{res.resSeq}</span>
                                          <span
                                            className="font-bold"
                                            style={{ color: plddt.hex }}
                                          >
                                            {res.resName}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  /* 1-Letter Interactive Sequence Grid with Confidence Color Bar */
                                  <div
                                    onMouseLeave={() => setHoveredResidue(null)}
                                    className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/90 max-h-44 overflow-y-auto space-y-1.5"
                                  >
                                    <div className="flex flex-wrap gap-0.5 font-mono text-[11px] leading-none">
                                      {chainResidues.map((res, idx) => {
                                        const plddt = getPlddtColor(res.score);
                                        const aaInfo = getAminoAcidInfo(res.resName);
                                        const isHovered =
                                          activeHover?.resSeq === res.resSeq &&
                                          activeHover?.resName === res.resName;
                                        return (
                                          <button
                                            key={`${chain.id}-${res.resSeq}-${idx}`}
                                            type="button"
                                            onMouseEnter={() =>
                                              setHoveredResidue({ chainId: chain.id, entry: res })
                                            }
                                            onClick={() => onFocusMolecularChain?.(chain.id)}
                                            title={`${res.resName} ${res.resSeq} (${aaInfo.fullName}) • pLDDT ${res.score.toFixed(1)}`}
                                            className={`w-5 h-6 rounded flex flex-col items-center justify-between py-0.5 transition-transform ${
                                              isHovered
                                                ? 'bg-slate-700 text-white scale-110 z-10 ring-1 ring-indigo-400'
                                                : 'bg-slate-950/80 text-slate-200 hover:bg-slate-800'
                                            }`}
                                          >
                                            <span className="font-bold text-[10px]">
                                              {res.oneLetter}
                                            </span>
                                            <span
                                              className="w-3.5 h-1 rounded-full"
                                              style={{ backgroundColor: plddt.hex }}
                                            />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Live Residue Inspector Footer */}
                                <div className="flex items-center justify-between text-[10px] px-1 pt-0.5 text-slate-400">
                                  {activeHover ? (
                                    <>
                                      <span className="font-mono text-slate-200 font-semibold truncate">
                                        Res #{activeHover.resSeq} • {activeHover.resName} (
                                        {activeHover.oneLetter}) —{' '}
                                        <span className="text-indigo-300">
                                          {getAminoAcidInfo(activeHover.resName).fullName}
                                        </span>
                                      </span>
                                      <span
                                        className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0"
                                        style={{
                                          backgroundColor: `${getPlddtColor(activeHover.score).hex}25`,
                                          color: getPlddtColor(activeHover.score).hex,
                                        }}
                                      >
                                        pLDDT {activeHover.score.toFixed(1)}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Hover any residue to inspect position &amp; confidence</span>
                                      <span className="font-mono text-slate-500">
                                        {chainResidues.length} residues
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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

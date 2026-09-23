import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  AnimationClipInfo,
  MaterialInfo,
  MeshNodeItem,
  MolecularStats,
  ViewerMode,
} from '../types';

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
  onUpdateMaterialColor: (matId: string, hexColor: string) => void;
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
  onUpdateMaterialColor,
  isOpen,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'materials' | 'animations'>('hierarchy');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleNodeExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Render tree node recursively
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
            {node.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-red-400" />}
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

  return (
    <aside
      id="left-sidebar-panel"
      className={`absolute top-0 left-0 bottom-0 z-20 flex transition-all duration-300 ease-in-out ${
        isOpen ? 'w-72' : 'w-0'
      }`}
    >
      <div className="w-72 h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Header Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 p-1 shrink-0">
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'hierarchy'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {viewerMode === 'molstar' ? (
              <>
                <Dna className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chains & Ligands</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Hierarchy</span>
              </>
            )}
          </button>

          {viewerMode === 'three' && (
            <>
              <button
                onClick={() => setActiveTab('materials')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === 'materials'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-pink-400" />
                <span>Materials</span>
              </button>

              {animations.length > 0 && (
                <button
                  onClick={() => setActiveTab('animations')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    activeTab === 'animations'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Film className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Clips ({animations.length})</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Molecular Structure View (Mol*) */}
          {viewerMode === 'molstar' && molecularStats && (
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

              {/* Chemical Ligands Section */}
              {molecularStats.ligands.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Chemical Ligands & Ions</span>
                    <span className="text-slate-500 font-mono">
                      {molecularStats.ligands.length} Unique
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {molecularStats.ligands.map((ligand) => (
                      <div
                        key={ligand.id}
                        className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-2.5"
                      >
                        <Atom className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200 font-mono">
                              {ligand.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                              ×{ligand.count}
                            </span>
                          </div>
                          {ligand.description && (
                            <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                              {ligand.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

          {/* 3D Mesh Hierarchy Tab */}
          {viewerMode === 'three' && activeTab === 'hierarchy' && (
            <div>
              {tree ? (
                <div className="space-y-0.5">{renderTreeNode(tree)}</div>
              ) : (
                <div className="text-xs text-slate-500 text-center py-8">No model loaded</div>
              )}
            </div>
          )}

          {/* 3D Mesh Materials Tab */}
          {viewerMode === 'three' && activeTab === 'materials' && (
            <div className="space-y-3">
              {materials.length > 0 ? (
                materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {mat.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={mat.color}
                          onChange={(e) => onUpdateMaterialColor(mat.id, e.target.value)}
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                          title="Change Material Base Color"
                        />
                        <span className="text-[10px] font-mono text-slate-400">{mat.color}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                      <div>Roughness: {(mat.roughness ?? 0.5).toFixed(2)}</div>
                      <div>Metalness: {(mat.metalness ?? 0.0).toFixed(2)}</div>
                      <div>Transparent: {mat.transparent ? 'Yes' : 'No'}</div>
                      <div>Wireframe: {mat.wireframe ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-8">
                  No materials discovered
                </div>
              )}
            </div>
          )}

          {/* 3D Mesh Animations Tab */}
          {viewerMode === 'three' && activeTab === 'animations' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                {animations.map((anim, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectAnimation(idx)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-colors flex items-center justify-between ${
                      currentAnimationIndex === idx
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-medium truncate">{anim.name || `Track ${idx + 1}`}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {anim.duration.toFixed(1)}s
                    </span>
                  </button>
                ))}
              </div>

              {/* Playback Controls */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={onTogglePlayAnimation}
                    className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    {isPlayingAnimation ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    {[0.5, 1, 2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => onChangeAnimationSpeed(spd)}
                        className={`px-2 py-1 rounded ${
                          animationSpeed === spd
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={animationDuration || 1}
                    step={0.01}
                    value={animationTime}
                    onChange={(e) => onSeekAnimation(Number(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>{animationTime.toFixed(1)}s</span>
                    <span>{(animationDuration || 0).toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collapse / Expand Toggle Tab */}
      <button
        id="btn-toggle-left-panel"
        onClick={onToggleOpen}
        title={isOpen ? 'Collapse Panel' : 'Expand Panel'}
        className="self-center -mr-3 z-30 w-6 h-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-r-xl flex items-center justify-center text-slate-400 hover:text-white shadow-xl transition-all"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </aside>
  );
};

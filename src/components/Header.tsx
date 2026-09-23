import React, { useState } from 'react';
import {
  FolderOpen,
  Globe,
  Camera,
  Download,
  Maximize2,
  Minimize2,
  Info,
  Box,
  Dna,
  ChevronDown,
  Sparkles,
  Share2,
} from 'lucide-react';
import { ModelStats, MolecularStats, ViewerMode } from '../types';
import { SAMPLE_PDB_STRUCTURES } from '../utils/molecularHelpers';

interface HeaderProps {
  viewerMode: ViewerMode;
  modelName: string;
  threeStats: ModelStats | null;
  molecularStats: MolecularStats | null;
  onOpenFileClick: () => void;
  onOpenUrlClick: () => void;
  onOpenSnapshotClick: () => void;
  onOpenShareClick: () => void;
  onExport: (format: 'obj' | 'stl' | 'ply' | 'gltf' | 'glb') => void;
  onExportMolecule?: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onOpenAboutClick: () => void;
  onLoadSamplePdb: (pdbId: string) => void;
  onLoadSample3D: (type: 'torus' | 'gear' | 'crystal') => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewerMode,
  modelName,
  threeStats,
  molecularStats,
  onOpenFileClick,
  onOpenUrlClick,
  onOpenSnapshotClick,
  onOpenShareClick,
  onExport,
  onExportMolecule,
  onToggleFullscreen,
  isFullscreen,
  onOpenAboutClick,
  onLoadSamplePdb,
  onLoadSample3D,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSamplesMenu, setShowSamplesMenu] = useState(false);

  const displayFormat =
    viewerMode === 'molstar'
      ? molecularStats?.fileFormat || 'PDB'
      : threeStats?.fileFormat || '3D';

  return (
    <header
      id="app-main-header"
      className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none shrink-0"
    >
      {/* Brand & Active Model Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            {viewerMode === 'molstar' ? (
              <Dna className="w-4 h-4 text-white" />
            ) : (
              <Box className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">El-Roi</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {viewerMode === 'molstar' ? 'Mol* Molecular' : 'Three.js 3D'}
              </span>
            </div>
          </div>
        </div>

        {modelName && (
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800 max-w-sm">
            <span
              className="text-xs text-slate-300 font-medium truncate max-w-[220px]"
              title={modelName}
            >
              {modelName}
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {displayFormat}
            </span>
          </div>
        )}
      </div>

      {/* Main Actions */}
      <div className="flex items-center gap-1.5">
        {/* Open Local File */}
        <button
          id="header-btn-open-file"
          onClick={onOpenFileClick}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 active:scale-95"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Open File</span>
        </button>

        {/* Fetch from PDB / URL */}
        <button
          id="header-btn-open-url"
          onClick={onOpenUrlClick}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Fetch PDB / URL</span>
        </button>

        {/* Sample Library Dropdown */}
        <div className="relative">
          <button
            id="header-btn-samples"
            onClick={() => {
              setShowSamplesMenu(!showSamplesMenu);
              setShowExportMenu(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
              showSamplesMenu
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Samples</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {showSamplesMenu && (
            <div
              id="header-dropdown-samples"
              className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 max-h-96 overflow-y-auto"
            >
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Dna className="w-3 h-3 text-emerald-400" />
                <span>Molecular Structures (Mol*)</span>
              </div>
              {SAMPLE_PDB_STRUCTURES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => {
                    onLoadSamplePdb(sample.id);
                    setShowSamplesMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors flex flex-col"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{sample.name}</span>
                    <span className="font-mono text-[10px] px-1 py-0.2 bg-indigo-500/20 text-indigo-300 rounded">
                      {sample.id}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate">{sample.description}</span>
                </button>
              ))}

              <div className="my-1 border-t border-slate-800" />

              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Box className="w-3 h-3 text-cyan-400" />
                <span>3D CAD / Mesh Models (Three.js)</span>
              </div>
              <button
                onClick={() => {
                  onLoadSample3D('gear');
                  setShowSamplesMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors flex flex-col"
              >
                <span className="text-xs font-semibold">Mechanical Spur Gear</span>
                <span className="text-[10px] text-slate-400">Precision titanium gear assembly with bore</span>
              </button>
              <button
                onClick={() => {
                  onLoadSample3D('torus');
                  setShowSamplesMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors flex flex-col"
              >
                <span className="text-xs font-semibold">Complex Torus Knot</span>
                <span className="text-[10px] text-slate-400">Mathematical 3D parametric curve mesh</span>
              </button>
              <button
                onClick={() => {
                  onLoadSample3D('crystal');
                  setShowSamplesMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors flex flex-col"
              >
                <span className="text-xs font-semibold">Bismuth Crystal & Gimbal</span>
                <span className="text-[10px] text-slate-400">Faceted mineral geometry with orbital rings</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-[1px] h-5 bg-slate-800 mx-1 hidden sm:block" />

        {/* Snapshot Capture */}
        <button
          id="header-btn-snapshot"
          onClick={onOpenSnapshotClick}
          title="Take High-Resolution Snapshot"
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center justify-center"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            id="header-btn-export"
            onClick={() => {
              if (viewerMode === 'molstar' && onExportMolecule) {
                onExportMolecule();
              } else {
                setShowExportMenu(!showExportMenu);
                setShowSamplesMenu(false);
              }
            }}
            title="Download / Export"
            className={`p-2 rounded-xl transition-colors flex items-center justify-center ${
              showExportMenu ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Download className="w-4 h-4" />
          </button>

          {showExportMenu && viewerMode === 'three' && (
            <div
              id="header-dropdown-export"
              className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1"
            >
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Export 3D Format
              </div>
              <button
                onClick={() => {
                  onExport('obj');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-800 text-slate-200 transition-colors"
              >
                Wavefront (.OBJ)
              </button>
              <button
                onClick={() => {
                  onExport('stl');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-800 text-slate-200 transition-colors"
              >
                Stereolithography (.STL)
              </button>
              <button
                onClick={() => {
                  onExport('ply');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-800 text-slate-200 transition-colors"
              >
                Polygon File (.PLY)
              </button>
              <button
                onClick={() => {
                  onExport('glb');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-800 text-slate-200 transition-colors"
              >
                Binary GLTF (.GLB)
              </button>
            </div>
          )}
        </div>

        {/* Share Link */}
        <button
          id="header-btn-share"
          onClick={onOpenShareClick}
          title="Share Viewer"
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center justify-center"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Fullscreen */}
        <button
          id="header-btn-fullscreen"
          onClick={onToggleFullscreen}
          title="Toggle Fullscreen"
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center justify-center"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* About App */}
        <button
          id="header-btn-about"
          onClick={onOpenAboutClick}
          title="About El-Roi 3D & Mol* Viewer"
          className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center justify-center"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

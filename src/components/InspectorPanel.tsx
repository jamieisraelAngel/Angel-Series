import React, { useState } from 'react';
import {
  Sliders,
  BarChart2,
  Sun,
  Grid,
  ChevronRight,
  ChevronLeft,
  Box,
  Dna,
  Calendar,
  Microscope,
  Sparkles,
} from 'lucide-react';
import {
  BackgroundTheme,
  ModelStats,
  MolecularStats,
  MolstarSettings,
  RenderSettings,
  ViewerMode,
} from '../types';

interface InspectorPanelProps {
  viewerMode: ViewerMode;
  stats: ModelStats | null;
  molecularStats: MolecularStats | null;
  settings: RenderSettings;
  molstarSettings: MolstarSettings;
  onChangeSettings: (updated: Partial<RenderSettings>) => void;
  onChangeMolstarSettings: (updated: Partial<MolstarSettings>) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  viewerMode,
  stats,
  molecularStats,
  settings,
  molstarSettings,
  onChangeSettings,
  onChangeMolstarSettings,
  isOpen,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'render'>('stats');

  const backgroundThemes: { id: BackgroundTheme; label: string }[] = [
    { id: 'dark', label: 'Dark Slate' },
    { id: 'midnight', label: 'Midnight Black' },
    { id: 'studio', label: 'Studio Gray' },
    { id: 'light', label: 'Clean Light' },
    { id: 'custom', label: 'Custom Hex' },
  ];

  return (
    <aside
      id="right-sidebar-panel"
      className={`absolute top-0 right-0 bottom-0 z-20 flex transition-all duration-300 ease-in-out ${
        isOpen ? 'w-80' : 'w-0'
      }`}
    >
      {/* Collapse / Expand Toggle Tab */}
      <button
        id="btn-toggle-right-panel"
        onClick={onToggleOpen}
        title={isOpen ? 'Collapse Inspector' : 'Expand Inspector'}
        className="self-center -ml-3 z-30 w-6 h-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-l-xl flex items-center justify-center text-slate-400 hover:text-white shadow-xl transition-all"
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className="w-80 h-full bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 flex flex-col overflow-hidden shadow-2xl">
        {/* Header Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 p-1 shrink-0">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'stats'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {viewerMode === 'molstar' ? (
              <>
                <Dna className="w-3.5 h-3.5 text-emerald-400" />
                <span>Structure Info</span>
              </>
            ) : (
              <>
                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Model Stats</span>
              </>
            )}
          </button>

          <button
            onClick={() => setActiveTab('render')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'render'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Environment</span>
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* MOLECULAR STATS TAB */}
          {viewerMode === 'molstar' && activeTab === 'stats' && (
            <div className="space-y-4">
              {molecularStats ? (
                <>
                  {/* Title & Entry Card */}
                  <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                        PDB ID Entry
                      </span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-600 text-white shadow">
                        {molecularStats.pdbId}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white leading-tight">
                      {molecularStats.title}
                    </div>
                    {molecularStats.classification && (
                      <div className="text-[11px] text-slate-300">
                        {molecularStats.classification}
                      </div>
                    )}
                  </div>

                  {/* Scientific Experimental Metadata */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Experimental Details
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Microscope className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Method</span>
                        </span>
                        <span className="font-medium text-slate-200">
                          {molecularStats.experimentalMethod || 'X-Ray / Cryo-EM'}
                        </span>
                      </div>

                      {molecularStats.resolution && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Resolution</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {typeof molecularStats.resolution === 'number'
                              ? `${molecularStats.resolution.toFixed(2)} Å`
                              : `${molecularStats.resolution} Å`}
                          </span>
                        </div>
                      )}

                      {molecularStats.depositionDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            <span>Deposition</span>
                          </span>
                          <span className="font-mono text-slate-300">
                            {molecularStats.depositionDate}
                          </span>
                        </div>
                      )}

                      {molecularStats.organism && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Organism</span>
                          <span className="text-slate-300 truncate max-w-[140px]" title={molecularStats.organism}>
                            {molecularStats.organism}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantitative Composition */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Molecular Composition
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col">
                        <span className="text-[10px] text-slate-400">Total Atoms</span>
                        <span className="text-base font-bold text-white font-mono">
                          {molecularStats.atomCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col">
                        <span className="text-[10px] text-slate-400">Total Residues</span>
                        <span className="text-base font-bold text-indigo-300 font-mono">
                          {molecularStats.residueCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col">
                        <span className="text-[10px] text-slate-400">Polymer Chains</span>
                        <span className="text-base font-bold text-emerald-400 font-mono">
                          {molecularStats.chains.length}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col">
                        <span className="text-[10px] text-slate-400">Ligands & Ions</span>
                        <span className="text-base font-bold text-cyan-400 font-mono">
                          {molecularStats.ligands.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-center py-10">No molecule loaded</div>
              )}
            </div>
          )}

          {/* 3D MESH STATS TAB */}
          {viewerMode === 'three' && activeTab === 'stats' && (
            <div className="space-y-4">
              {stats ? (
                <>
                  {/* File Metadata */}
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Format</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {stats.fileFormat || '3D Model'}
                      </span>
                    </div>
                    {stats.fileSize && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">File Size</span>
                        <span className="font-mono text-slate-300">
                          {(stats.fileSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Geometry Stats */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Mesh Geometry
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col">
                        <span className="text-[10px] text-slate-400">Triangles</span>
                        <span className="text-base font-bold text-white font-mono">
                          {stats.triangles.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col">
                        <span className="text-[10px] text-slate-400">Vertices</span>
                        <span className="text-base font-bold text-indigo-300 font-mono">
                          {stats.vertices.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col">
                        <span className="text-[10px] text-slate-400">Meshes</span>
                        <span className="text-base font-bold text-cyan-300 font-mono">
                          {stats.meshes}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col">
                        <span className="text-[10px] text-slate-400">Materials</span>
                        <span className="text-base font-bold text-pink-300 font-mono">
                          {stats.materials}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Physical Dimensions */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Bounding Box & Volume
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Dimensions (X, Y, Z)</span>
                        <span className="font-mono text-slate-200">
                          {stats.boundingBox.size[0].toFixed(2)} × {stats.boundingBox.size[1].toFixed(2)} × {stats.boundingBox.size[2].toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Calculated Volume</span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          {stats.volume.toLocaleString()} units³
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Surface Area</span>
                        <span className="font-mono text-sky-400 font-semibold">
                          {stats.surfaceArea.toLocaleString()} units²
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-slate-500 text-center py-10">No 3D model loaded</div>
              )}
            </div>
          )}

          {/* ENVIRONMENT & RENDERING TAB */}
          {activeTab === 'render' && (
            <div className="space-y-5">
              {/* Background Theme */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Viewport Background
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {backgroundThemes.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => {
                        onChangeSettings({ backgroundTheme: bg.id });
                        onChangeMolstarSettings({ backgroundTheme: bg.id });
                      }}
                      className={`p-2 rounded-xl border text-xs text-left transition-colors ${
                        (viewerMode === 'molstar' ? molstarSettings.backgroundTheme : settings.backgroundTheme) === bg.id
                          ? 'bg-indigo-600/30 border-indigo-500 text-white font-medium'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>

                {settings.backgroundTheme === 'custom' && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="color"
                      value={settings.customBackgroundColor}
                      onChange={(e) => {
                        onChangeSettings({ customBackgroundColor: e.target.value });
                        onChangeMolstarSettings({ customBackgroundColor: e.target.value });
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={settings.customBackgroundColor}
                      onChange={(e) => {
                        onChangeSettings({ customBackgroundColor: e.target.value });
                        onChangeMolstarSettings({ customBackgroundColor: e.target.value });
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Three.js Specific Lights */}
              {viewerMode === 'three' && (
                <>
                  <div className="space-y-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Lighting & Studio Presets
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Ambient Light</span>
                          <span className="font-mono">{settings.ambientLightIntensity.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={3.0}
                          step={0.1}
                          value={settings.ambientLightIntensity}
                          onChange={(e) =>
                            onChangeSettings({ ambientLightIntensity: Number(e.target.value) })
                          }
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Key Directional Light</span>
                          <span className="font-mono">{settings.directionalLightIntensity.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={4.0}
                          step={0.1}
                          value={settings.directionalLightIntensity}
                          onChange={(e) =>
                            onChangeSettings({ directionalLightIntensity: Number(e.target.value) })
                          }
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>

                      <div className="pt-1">
                        <span className="text-[10px] text-slate-400">Lighting Mood Preset</span>
                        <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                          {(['studio', 'sunset', 'neutral', 'cyberpunk', 'high_contrast'] as const).map(
                            (preset) => (
                              <button
                                key={preset}
                                onClick={() => onChangeSettings({ lightPreset: preset })}
                                className={`p-1.5 rounded-lg border text-[11px] capitalize transition-colors ${
                                  settings.lightPreset === preset
                                    ? 'bg-indigo-600/30 border-indigo-500 text-white font-medium'
                                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {preset.replace('_', ' ')}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grid & Display Guides */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Ground & Visual Guides
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                        <span className="text-slate-300">Ground Grid</span>
                        <input
                          type="checkbox"
                          checked={settings.showGrid}
                          onChange={(e) => onChangeSettings({ showGrid: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </label>
                      <label className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                        <span className="text-slate-300">XYZ World Axes Helper</span>
                        <input
                          type="checkbox"
                          checked={settings.showAxes}
                          onChange={(e) => onChangeSettings({ showAxes: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

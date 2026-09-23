import React, { useState } from 'react';
import {
  Maximize2,
  RotateCw,
  SunMedium,
  Palette,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  ChevronDown,
  Check,
  Dna,
} from 'lucide-react';
import { MolecularRepresentation, MolecularColorScheme, MolstarSettings } from '../types';

interface ToolbarMolstarProps {
  settings: MolstarSettings;
  onChangeSettings: (updated: Partial<MolstarSettings>) => void;
  onFitView: () => void;
}

export const ToolbarMolstar: React.FC<ToolbarMolstarProps> = ({
  settings,
  onChangeSettings,
  onFitView,
}) => {
  const [showRepDropdown, setShowRepDropdown] = useState(false);
  const [showLightingDropdown, setShowLightingDropdown] = useState(false);

  const representations: { id: MolecularRepresentation; label: string; desc: string }[] = [
    { id: 'cartoon', label: 'Cartoon Ribbon', desc: 'Secondary structure helices & beta sheets' },
    { id: 'ball-and-stick', label: 'Ball & Stick', desc: 'Atoms & covalent bonds' },
    { id: 'spacefill', label: 'Spacefill / CPK', desc: 'Van der Waals packing spheres' },
    { id: 'surface', label: 'Molecular Surface', desc: 'Solvent-accessible Gaussian surface' },
    { id: 'putty', label: 'B-Factor Putty', desc: 'Ribbon thickness reflects mobility' },
    { id: 'backbone', label: 'Backbone Trace', desc: 'Cα / P polymer chain trace' },
  ];

  const lightings: { id: 'matte' | 'flat' | 'metallic'; label: string }[] = [
    { id: 'matte', label: 'Matte Shading' },
    { id: 'metallic', label: 'Metallic Specular' },
    { id: 'flat', label: 'Flat Lit' },
  ];

  return (
    <div
      id="molstar-toolbar-container"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl text-slate-200"
    >
      {/* Fit to View */}
      <button
        id="molstar-btn-fit-view"
        onClick={onFitView}
        title="Fit Structure to Screen"
        className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors flex items-center justify-center"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-6 bg-slate-700 mx-1" />

      {/* Representation Dropdown */}
      <div className="relative">
        <button
          id="molstar-btn-rep"
          onClick={() => {
            setShowRepDropdown(!showRepDropdown);
            setShowLightingDropdown(false);
          }}
          title="Molecular Representation"
          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
            showRepDropdown ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-200'
          }`}
        >
          <Dna className="w-4 h-4 text-emerald-400" />
          <span className="capitalize">{settings.representation.replace('-', ' ')}</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>

        {showRepDropdown && (
          <div
            id="molstar-dropdown-rep"
            className="absolute bottom-full mb-2 left-0 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-30"
          >
            <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Representation Style
            </div>
            {representations.map((rep) => (
              <button
                key={rep.id}
                onClick={() => {
                  onChangeSettings({ representation: rep.id });
                  setShowRepDropdown(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${
                  settings.representation === rep.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div>
                  <div className="font-medium">{rep.label}</div>
                  <div className="text-[10px] text-slate-400">{rep.desc}</div>
                </div>
                {settings.representation === rep.id && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-[1px] h-6 bg-slate-700 mx-1" />

      {/* Lighting Style Dropdown */}
      <div className="relative">
        <button
          id="molstar-btn-lighting"
          onClick={() => {
            setShowLightingDropdown(!showLightingDropdown);
            setShowRepDropdown(false);
          }}
          title="Lighting & Material Shading"
          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
            showLightingDropdown ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-200'
          }`}
        >
          <SunMedium className="w-4 h-4 text-amber-400" />
          <span className="capitalize">{settings.lighting}</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>

        {showLightingDropdown && (
          <div
            id="molstar-dropdown-lighting"
            className="absolute bottom-full mb-2 left-0 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-30"
          >
            <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Material Lighting
            </div>
            {lightings.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  onChangeSettings({ lighting: l.id });
                  setShowLightingDropdown(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${
                  settings.lighting === l.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>{l.label}</span>
                {settings.lighting === l.id && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-[1px] h-6 bg-slate-700 mx-1" />

      {/* Auto Spin Toggle */}
      <button
        id="molstar-btn-spin"
        onClick={() => onChangeSettings({ spin: !settings.spin })}
        title="Toggle Continuous Molecular Spin"
        className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
          settings.spin ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg' : 'hover:bg-slate-800 text-slate-300'
        }`}
      >
        <RotateCw className={`w-4 h-4 ${settings.spin ? 'animate-spin' : ''}`} />
      </button>

      {/* Expanded Mol* native panel toggle */}
      <button
        id="molstar-btn-expand-controls"
        onClick={() => onChangeSettings({ expandedControls: !settings.expandedControls })}
        title="Toggle Mol* Native Sequence & Tooling Panel"
        className={`px-2.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
          settings.expandedControls ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
        }`}
      >
        <Sliders className="w-4 h-4 text-cyan-400" />
        <span>Full Mol* UI</span>
      </button>
    </div>
  );
};

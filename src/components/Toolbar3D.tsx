import React from 'react';
import {
  Maximize2,
  Minimize2,
  Box,
  Eye,
  Scissors,
  Ruler,
  RotateCcw,
  Camera,
  Grid,
  Layers,
  RotateCw,
  SunMedium,
  Check,
  ChevronDown,
} from 'lucide-react';
import { ProjectionMode, ShadingMode, ViewPreset } from '../types';

interface Toolbar3DProps {
  projection: ProjectionMode;
  onToggleProjection: () => void;
  onSetViewPreset: (preset: ViewPreset) => void;
  onResetCamera: () => void;
  onFitView: () => void;
  showSectionPlane: boolean;
  onToggleSectionPlane: () => void;
  measureActive: boolean;
  onToggleMeasure: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  showWireframe: boolean;
  onToggleWireframe: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showEdges: boolean;
  onToggleEdges: () => void;
  shading: ShadingMode;
  onChangeShading: (mode: ShadingMode) => void;
}

export const Toolbar3D: React.FC<Toolbar3DProps> = ({
  projection,
  onToggleProjection,
  onSetViewPreset,
  onResetCamera,
  onFitView,
  showSectionPlane,
  onToggleSectionPlane,
  measureActive,
  onToggleMeasure,
  autoRotate,
  onToggleAutoRotate,
  showWireframe,
  onToggleWireframe,
  showGrid,
  onToggleGrid,
  showEdges,
  onToggleEdges,
  shading,
  onChangeShading,
}) => {
  const [showViewsDropdown, setShowViewsDropdown] = React.useState(false);
  const [showShadingDropdown, setShowShadingDropdown] = React.useState(false);

  const viewPresets: { id: ViewPreset; label: string }[] = [
    { id: 'iso', label: 'Isometric' },
    { id: 'front', label: 'Front (Z+)' },
    { id: 'back', label: 'Back (Z-)' },
    { id: 'top', label: 'Top (Y+)' },
    { id: 'bottom', label: 'Bottom (Y-)' },
    { id: 'left', label: 'Left (X-)' },
    { id: 'right', label: 'Right (X+)' },
  ];

  const shadingModes: { id: ShadingMode; label: string }[] = [
    { id: 'pbr', label: 'PBR / Realistic' },
    { id: 'flat', label: 'Flat Shaded' },
    { id: 'toon', label: 'Cartoon / Toon' },
    { id: 'phong', label: 'Smooth Phong' },
    { id: 'normals', label: 'Normals Colors' },
    { id: 'depth', label: 'Depth Map' },
    { id: 'wireframe', label: 'Wireframe Only' },
  ];

  return (
    <div
      id="viewport-toolbar-container"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl text-slate-200"
    >
      {/* Fit to View */}
      <button
        id="toolbar-btn-fit-view"
        onClick={onFitView}
        title="Fit Model to Screen (F)"
        className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors flex items-center justify-center"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Reset Camera */}
      <button
        id="toolbar-btn-reset-cam"
        onClick={onResetCamera}
        title="Reset Camera View (R)"
        className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors flex items-center justify-center"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-6 bg-slate-700 mx-1" />

      {/* View Presets Dropdown */}
      <div className="relative">
        <button
          id="toolbar-btn-view-presets"
          onClick={() => {
            setShowViewsDropdown(!showViewsDropdown);
            setShowShadingDropdown(false);
          }}
          title="Camera View Angles"
          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
            showViewsDropdown ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-200'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Views</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>

        {showViewsDropdown && (
          <div
            id="toolbar-dropdown-views"
            className="absolute bottom-full mb-2 left-0 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-30"
          >
            <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Standard Views
            </div>
            {viewPresets.map((vp) => (
              <button
                key={vp.id}
                id={`btn-view-${vp.id}`}
                onClick={() => {
                  onSetViewPreset(vp.id);
                  setShowViewsDropdown(false);
                }}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-800 hover:text-white text-slate-300 transition-colors flex items-center justify-between"
              >
                <span>{vp.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Perspective / Orthographic toggle */}
      <button
        id="toolbar-btn-toggle-projection"
        onClick={onToggleProjection}
        title={`Switch Projection (Current: ${projection})`}
        className={`px-2.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
          projection === 'orthographic'
            ? 'bg-indigo-600/90 text-white'
            : 'hover:bg-slate-800 text-slate-200'
        }`}
      >
        <Camera className="w-4 h-4" />
        <span className="capitalize">{projection.slice(0, 5)}.</span>
      </button>

      <div className="w-[1px] h-6 bg-slate-700 mx-1" />

      {/* Shading Mode Dropdown */}
      <div className="relative">
        <button
          id="toolbar-btn-shading"
          onClick={() => {
            setShowShadingDropdown(!showShadingDropdown);
            setShowViewsDropdown(false);
          }}
          title="Shading & Appearance"
          className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
            showShadingDropdown ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="capitalize">{shading}</span>
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>

        {showShadingDropdown && (
          <div
            id="toolbar-dropdown-shading"
            className="absolute bottom-full mb-2 left-0 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-30"
          >
            <div className="px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Shading Style
            </div>
            {shadingModes.map((sm) => (
              <button
                key={sm.id}
                id={`btn-shading-${sm.id}`}
                onClick={() => {
                  onChangeShading(sm.id);
                  setShowShadingDropdown(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${
                  shading === sm.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span>{sm.label}</span>
                {shading === sm.id && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cross Section Slice Tool */}
      <button
        id="toolbar-btn-section-plane"
        onClick={onToggleSectionPlane}
        title="Cross-Section Clipping Plane"
        className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
          showSectionPlane
            ? 'bg-amber-500 text-slate-950 font-bold shadow-lg'
            : 'hover:bg-slate-800 text-slate-200'
        }`}
      >
        <Scissors className="w-4 h-4" />
      </button>

      {/* Measurement Tool */}
      <button
        id="toolbar-btn-measure"
        onClick={onToggleMeasure}
        title="Point-to-Point Measurement Tool"
        className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
          measureActive
            ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg'
            : 'hover:bg-slate-800 text-slate-200'
        }`}
      >
        <Ruler className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-6 bg-slate-700 mx-1" />

      {/* Wireframe Toggle */}
      <button
        id="toolbar-btn-wireframe"
        onClick={onToggleWireframe}
        title="Toggle Wireframe Overlay"
        className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
          showWireframe ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
        }`}
      >
        <Eye className="w-4 h-4" />
      </button>

      {/* Edge Outlines Toggle */}
      <button
        id="toolbar-btn-edges"
        onClick={onToggleEdges}
        title="Toggle Feature Edges"
        className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
          showEdges ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
        }`}
      >
        <SunMedium className="w-4 h-4" />
      </button>

      {/* Grid Plane Toggle */}
      <button
        id="toolbar-btn-grid"
        onClick={onToggleGrid}
        title="Toggle Ground Grid"
        className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
          showGrid ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-400'
        }`}
      >
        <Grid className="w-4 h-4" />
      </button>

      {/* Auto Rotate Turntable */}
      <button
        id="toolbar-btn-auto-rotate"
        onClick={onToggleAutoRotate}
        title="Toggle Turntable Rotation (Space)"
        className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
          autoRotate ? 'bg-emerald-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300'
        }`}
      >
        <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

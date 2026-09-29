import React, { useState } from 'react';
import {
  Maximize2,
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
  Sparkles,
} from 'lucide-react';
import { ProjectionMode, ShadingMode, ViewPreset } from '../../types';

export interface ViewerToolbarProps {
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
  showBoundingBox: boolean;
  onToggleBoundingBox: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showEdges: boolean;
  onToggleEdges: () => void;
  shading: ShadingMode;
  onChangeShading: (mode: ShadingMode) => void;
  lightingPreset: 'studio' | 'sunset' | 'neutral' | 'high_contrast' | 'cyberpunk';
  onChangeLightingPreset: (preset: 'studio' | 'sunset' | 'neutral' | 'high_contrast' | 'cyberpunk') => void;
  onTakeSnapshot?: () => void;
}

export const ViewerToolbar: React.FC<ViewerToolbarProps> = ({
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
  showBoundingBox,
  onToggleBoundingBox,
  showGrid,
  onToggleGrid,
  showEdges,
  onToggleEdges,
  shading,
  onChangeShading,
  lightingPreset,
  onChangeLightingPreset,
  onTakeSnapshot,
}) => {
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showShadingDropdown, setShowShadingDropdown] = useState(false);
  const [showLightingDropdown, setShowLightingDropdown] = useState(false);

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
    { id: 'normals', label: 'Normal Map / Normals' },
    { id: 'depth', label: 'Depth Map' },
    { id: 'wireframe', label: 'Wireframe Only' },
  ];

  const lightingPresets: { id: 'studio' | 'sunset' | 'neutral' | 'high_contrast' | 'cyberpunk'; label: string }[] = [
    { id: 'studio', label: 'Studio Warm' },
    { id: 'sunset', label: 'Golden Sunset' },
    { id: 'neutral', label: 'Clean Neutral' },
    { id: 'high_contrast', label: 'High Contrast' },
    { id: 'cyberpunk', label: 'Cyberpunk Neon' },
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
        title="Reset Camera Orientation (R)"
        className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors flex items-center justify-center"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* Projection Mode */}
      <button
        id="toolbar-btn-projection"
        onClick={onToggleProjection}
        title={`Camera Mode: ${projection.toUpperCase()} (Click to toggle)`}
        className="px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 transition-colors flex items-center gap-1"
      >
        <Box className="w-3.5 h-3.5 text-indigo-400" />
        <span>{projection === 'perspective' ? 'PERSP' : 'ORTHO'}</span>
      </button>

      {/* Camera Presets Dropdown */}
      <div className="relative">
        <button
          id="toolbar-btn-views"
          onClick={() => {
            setShowViewsDropdown(!showViewsDropdown);
            setShowShadingDropdown(false);
            setShowLightingDropdown(false);
          }}
          title="Camera View Angles"
          className={`p-2.5 rounded-xl transition-colors flex items-center gap-1 ${
            showViewsDropdown ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Eye className="w-4 h-4" />
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {showViewsDropdown && (
          <div
            id="toolbar-dropdown-views"
            className="absolute bottom-12 left-0 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5"
          >
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Camera View
            </div>
            {viewPresets.map((vp) => (
              <button
                key={vp.id}
                onClick={() => {
                  onSetViewPreset(vp.id);
                  setShowViewsDropdown(false);
                }}
                className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>{vp.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-[1px] h-5 bg-slate-800 mx-0.5" />

      {/* Shading Mode Dropdown */}
      <div className="relative">
        <button
          id="toolbar-btn-shading"
          onClick={() => {
            setShowShadingDropdown(!showShadingDropdown);
            setShowViewsDropdown(false);
            setShowLightingDropdown(false);
          }}
          title="Shading & Render Mode"
          className={`p-2.5 rounded-xl transition-colors flex items-center gap-1 ${
            showShadingDropdown ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {showShadingDropdown && (
          <div
            id="toolbar-dropdown-shading"
            className="absolute bottom-12 left-0 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5"
          >
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Display Shading
            </div>
            {shadingModes.map((sm) => (
              <button
                key={sm.id}
                onClick={() => {
                  onChangeShading(sm.id);
                  setShowShadingDropdown(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${
                  shading === sm.id
                    ? 'bg-indigo-600/30 text-indigo-300 font-semibold'
                    : 'hover:bg-slate-800 text-slate-200'
                }`}
              >
                <span>{sm.label}</span>
                {shading === sm.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lighting Preset Dropdown */}
      <div className="relative">
        <button
          id="toolbar-btn-lighting"
          onClick={() => {
            setShowLightingDropdown(!showLightingDropdown);
            setShowViewsDropdown(false);
            setShowShadingDropdown(false);
          }}
          title="Lighting Preset"
          className={`p-2.5 rounded-xl transition-colors flex items-center gap-1 ${
            showLightingDropdown ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <SunMedium className="w-4 h-4 text-amber-400" />
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {showLightingDropdown && (
          <div
            id="toolbar-dropdown-lighting"
            className="absolute bottom-12 left-0 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5"
          >
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Lighting Presets
            </div>
            {lightingPresets.map((lp) => (
              <button
                key={lp.id}
                onClick={() => {
                  onChangeLightingPreset(lp.id);
                  setShowLightingDropdown(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${
                  lightingPreset === lp.id
                    ? 'bg-amber-500/20 text-amber-300 font-semibold'
                    : 'hover:bg-slate-800 text-slate-200'
                }`}
              >
                <span>{lp.label}</span>
                {lightingPreset === lp.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Wireframe Overlay Toggle */}
      <button
        id="toolbar-btn-wireframe"
        onClick={onToggleWireframe}
        title="Toggle Wireframe Overlay (W)"
        className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
          showWireframe ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
        }`}
      >
        <span className="text-[11px] font-mono font-bold">WF</span>
      </button>

      {/* Bounding Box Toggle */}
      <button
        id="toolbar-btn-bbox"
        onClick={onToggleBoundingBox}
        title="Toggle Geometric Bounding Box (B)"
        className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
          showBoundingBox ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-800 text-slate-300'
        }`}
      >
        <span className="text-[11px] font-mono font-bold">BB</span>
      </button>

      {/* Ground Grid Toggle */}
      <button
        id="toolbar-btn-grid"
        onClick={onToggleGrid}
        title="Toggle Ground Grid (G)"
        className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
          showGrid ? 'bg-slate-700 text-indigo-400' : 'hover:bg-slate-800 text-slate-400'
        }`}
      >
        <Grid className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-5 bg-slate-800 mx-0.5" />

      {/* Cross Section Cutaway Tool */}
      <button
        id="toolbar-btn-section-plane"
        onClick={onToggleSectionPlane}
        title="Cross-Section Cutaway Plane"
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
        title="Precision Measurement Tool (M)"
        className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
          measureActive
            ? 'bg-indigo-600 text-white shadow-lg'
            : 'hover:bg-slate-800 text-slate-200'
        }`}
      >
        <Ruler className="w-4 h-4" />
      </button>

      {/* Auto-Rotation Toggle */}
      <button
        id="toolbar-btn-autorotate"
        onClick={onToggleAutoRotate}
        title="Auto-Rotate Turntable (Space)"
        className={`p-2.5 rounded-xl transition-colors flex items-center justify-center ${
          autoRotate ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'
        }`}
      >
        <RotateCw className="w-4 h-4" />
      </button>

      {/* Quick High-Res Snapshot Button */}
      {onTakeSnapshot && (
        <button
          id="toolbar-btn-quick-snapshot"
          onClick={onTakeSnapshot}
          title="Capture High-Res Screenshot"
          className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition-colors flex items-center justify-center"
        >
          <Camera className="w-4 h-4 text-cyan-400" />
        </button>
      )}
    </div>
  );
};

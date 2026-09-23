import React from 'react';
import { Ruler, X, RotateCcw } from 'lucide-react';
import { MeasureState } from '../types';

interface MeasureOverlayProps {
  measure: MeasureState;
  onClear: () => void;
  onClose: () => void;
}

export const MeasureOverlay: React.FC<MeasureOverlayProps> = ({
  measure,
  onClear,
  onClose,
}) => {
  if (!measure.active) return null;

  return (
    <div
      id="measure-tool-hud"
      className="absolute top-20 left-6 z-20 w-80 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-3 select-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">Point-to-Point Measurement</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-[11px] text-slate-400 leading-snug">
        {!measure.pointA && (
          <span className="text-emerald-400">Click anywhere on the model surface to set Point A.</span>
        )}
        {measure.pointA && !measure.pointB && (
          <span className="text-cyan-400">Point A set. Click another point on the model for Point B.</span>
        )}
        {measure.pointA && measure.pointB && (
          <span className="text-slate-300">Measurement computed. Click again to start a new measurement.</span>
        )}
      </div>

      {/* Results Box */}
      <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-slate-400">Direct Distance:</span>
          <span className="text-lg font-bold font-mono text-cyan-300">
            {measure.distance !== null ? `${measure.distance.toFixed(3)} units` : '---'}
          </span>
        </div>

        {measure.distance !== null && (
          <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-800 text-[10px] font-mono text-slate-400">
            <div>ΔX: {measure.deltaX?.toFixed(2)}</div>
            <div>ΔY: {measure.deltaY?.toFixed(2)}</div>
            <div>ΔZ: {measure.deltaZ?.toFixed(2)}</div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button
          onClick={onClear}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear Points</span>
        </button>
      </div>
    </div>
  );
};

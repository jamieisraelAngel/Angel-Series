import React from 'react';
import { X, Scissors, RotateCcw } from 'lucide-react';
import { SectionPlaneState } from '../types';

interface SectionPlaneModalProps {
  section: SectionPlaneState;
  onChange: (updated: Partial<SectionPlaneState>) => void;
  onClose: () => void;
}

export const SectionPlaneModal: React.FC<SectionPlaneModalProps> = ({
  section,
  onChange,
  onClose,
}) => {
  if (!section.enabled) return null;

  return (
    <div
      id="section-plane-hud"
      className="absolute top-20 right-6 z-20 w-72 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-3.5 select-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white">Cross-Section Plane</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Axis Selection */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Cutting Axis
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {(['x', 'y', 'z'] as const).map((ax) => (
            <button
              key={ax}
              onClick={() => onChange({ axis: ax })}
              className={`py-1.5 rounded-xl border text-xs font-mono font-bold uppercase transition-colors ${
                section.axis === ax
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Axis {ax}
            </button>
          ))}
        </div>
      </div>

      {/* Position Slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-300">
          <span>Slice Offset</span>
          <span className="font-mono text-[11px] text-amber-400">
            {section.position.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={section.position}
          onChange={(e) => onChange({ position: Number(e.target.value) })}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
      </div>

      {/* Flip Normal & Reset */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={section.inverted}
            onChange={(e) => onChange({ inverted: e.target.checked })}
            className="rounded text-amber-500 focus:ring-0 cursor-pointer"
          />
          <span>Invert Normal</span>
        </label>

        <button
          onClick={() => onChange({ position: 0, inverted: false })}
          title="Reset Plane Position"
          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};

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

  const formattedPosition =
    section.position > 0
      ? `+${section.position.toFixed(2)}`
      : section.position.toFixed(2);

  return (
    <div
      id="section-plane-hud"
      className="absolute top-20 right-6 z-30 w-76 bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-4 shadow-2xl shadow-slate-950/80 space-y-4 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Scissors className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">Cross-Section Plane</h3>
            <p className="text-[10px] text-slate-400">Cutaway & slicing tool</p>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Disable cross-section tool"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Axis Selection (3-way toggle buttons for Axis X, Y, Z) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Cutting Axis
          </span>
          <span className="text-[10px] font-mono text-amber-400/90 uppercase font-semibold">
            {section.axis === 'x' ? 'Side (X)' : section.axis === 'y' ? 'Vertical (Y)' : 'Front (Z)'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
          {(['x', 'y', 'z'] as const).map((ax) => {
            const isActive = section.axis === ax;
            return (
              <button
                key={ax}
                onClick={() => onChange({ axis: ax })}
                className={`py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <span>Axis</span>
                <span className="text-sm">{ax.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Position Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium">Offset Position</span>
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-amber-400">
            {formattedPosition}
          </span>
        </div>
        <div className="relative flex items-center">
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={section.position}
            onChange={(e) => onChange({ position: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
          <span>-1.00</span>
          <span>0.00</span>
          <span>+1.00</span>
        </div>
      </div>

      {/* Invert Cut Direction & Reset to Center */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
        <label className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
          <input
            type="checkbox"
            checked={section.inverted}
            onChange={(e) => onChange({ inverted: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <span>Invert Cut Direction</span>
        </label>

        <button
          onClick={() => onChange({ position: 0, inverted: false })}
          title="Reset cutting plane to model center"
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <RotateCcw className="w-3 h-3 text-amber-400" />
          <span>Reset to Center</span>
        </button>
      </div>
    </div>
  );
};

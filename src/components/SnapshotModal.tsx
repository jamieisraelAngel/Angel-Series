import React, { useState } from 'react';
import { X, Camera, Download, Loader2 } from 'lucide-react';
import { downloadBlob } from '../utils/threeHelpers';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetCanvasBlob?: (options: {
    width: number;
    height: number;
    transparent: boolean;
    format: string;
  }) => Promise<Blob>;
  modelName: string;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  isOpen,
  onClose,
  onGetCanvasBlob,
  modelName,
}) => {
  const [resolutionScale, setResolutionScale] = useState<number>(2);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [transparent, setTransparent] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  if (!isOpen) return null;

  const handleCapture = async () => {
    if (!onGetCanvasBlob) return;
    setIsCapturing(true);

    try {
      const baseWidth = window.innerWidth;
      const baseHeight = window.innerHeight;
      const targetWidth = Math.round(baseWidth * resolutionScale);
      const targetHeight = Math.round(baseHeight * resolutionScale);

      const blob = await onGetCanvasBlob({
        width: Math.min(targetWidth, 4096),
        height: Math.min(targetHeight, 4096),
        transparent: format === 'png' ? transparent : false,
        format,
      });

      const cleanName = (modelName || 'snapshot').replace(/\.[^/.]+$/, '');
      downloadBlob(blob, `${cleanName}_${targetWidth}x${targetHeight}.${format}`);
      onClose();
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div
      id="snapshot-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Capture Snapshot</h2>
              <p className="text-xs text-slate-400">Export high-resolution publication renders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resolution Scale */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Image Resolution</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { scale: 1, label: 'Standard (1x)' },
              { scale: 2, label: 'High Res (2x)' },
              { scale: 3, label: 'Ultra 4K (3x)' },
            ].map((res) => (
              <button
                key={res.scale}
                onClick={() => setResolutionScale(res.scale)}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
                  resolutionScale === res.scale
                    ? 'bg-indigo-600/30 border-indigo-500 text-white font-semibold'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {res.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">File Format</label>
          <div className="grid grid-cols-3 gap-2">
            {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`py-2 px-3 rounded-xl border text-xs font-mono font-semibold uppercase transition-colors ${
                  format === fmt
                    ? 'bg-indigo-600/30 border-indigo-500 text-white'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                .{fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Transparent background */}
        {format === 'png' && (
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
            <div>
              <span className="text-xs font-medium text-slate-200">Transparent Background</span>
              <p className="text-[10px] text-slate-400">Strips background color for overlay and slides</p>
            </div>
            <input
              type="checkbox"
              checked={transparent}
              onChange={(e) => setTransparent(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
            />
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCapture}
            disabled={isCapturing}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-2"
          >
            {isCapturing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isCapturing ? 'Rendering...' : 'Download Image'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Globe, Dna, ArrowRight, Sparkles } from 'lucide-react';
import { SAMPLE_PDB_STRUCTURES } from '../utils/molecularHelpers';

interface OpenUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadUrl: (url: string) => void;
  onLoadPdbId: (pdbId: string) => void;
}

export const OpenUrlModal: React.FC<OpenUrlModalProps> = ({
  isOpen,
  onClose,
  onLoadUrl,
  onLoadPdbId,
}) => {
  const [activeTab, setActiveTab] = useState<'pdb' | 'url'>('pdb');
  const [pdbCode, setPdbCode] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  if (!isOpen) return null;

  const handlePdbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pdbCode.trim().toUpperCase();
    if (clean.length >= 4) {
      onLoadPdbId(clean);
      onClose();
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim()) {
      onLoadUrl(customUrl.trim());
      onClose();
    }
  };

  return (
    <div
      id="open-url-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Remote 3D or Molecular Data</h2>
              <p className="text-xs text-slate-400">Fetch directly from RCSB PDB or enter an asset URL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-950/50 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('pdb')}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'pdb' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dna className="w-4 h-4 text-emerald-300" />
            <span>RCSB PDB Database</span>
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'url' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Direct Web URL</span>
          </button>
        </div>

        {/* Tab 1: PDB Code */}
        {activeTab === 'pdb' && (
          <form onSubmit={handlePdbSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                4-Character PDB Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 4HHB, 1CBS, 6VXX, 1BNA"
                  value={pdbCode}
                  onChange={(e) => setPdbCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl text-white font-mono text-base tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-600 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={pdbCode.trim().length < 4}
                  className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <span>Fetch</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Suggestions */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Featured Biological Structures</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_PDB_STRUCTURES.slice(0, 4).map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      onLoadPdbId(sample.id);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-left transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-white">
                        {sample.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{sample.id}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Custom URL */}
        {activeTab === 'url' && (
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Model or Structure URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/model.glb or https://files.rcsb.org/download/1CBS.cif"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl text-white text-xs placeholder:text-slate-600 focus:outline-none"
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Supports GLB, GLTF, OBJ, STL, PLY, FBX, 3DS, PDB, and mmCIF. Ensure the server has CORS headers enabled.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!customUrl.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Load URL</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

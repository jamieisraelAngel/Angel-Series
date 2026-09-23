import React from 'react';
import { X, Box, Dna, CheckCircle2, ShieldCheck, Layers, Cpu } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="about-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">El-Roi 3D & Molecular Viewer</h2>
              <p className="text-xs text-slate-400">Next-generation engineering and macromolecular visualization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-3 text-xs text-slate-300">
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <Dna className="w-4 h-4 text-emerald-400" />
              <span>Mol* Macromolecular Implementation</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Integrates the state-of-the-art Mol* (PDBe Molstar) structural biology viewer to render complex macromolecular assemblies, proteins, nucleic acids, and small-molecule complexes from PDB and mmCIF formats. Supports Cartoon ribbons, Ball & Stick, Spacefill, and Gaussian molecular surfaces.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <Box className="w-4 h-4 text-cyan-400" />
              <span>Three.js Engineering & CAD Viewer</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Full-featured 3D mesh engine supporting GLTF, GLB, OBJ + MTL, STL, PLY, FBX, and 3DS. Includes physically based rendering (PBR), interactive clipping plane cross-sections, point-to-point laser measurement, skeletal animations, and automatic volume/surface calculation.
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Supported Formats
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { name: '.PDB', type: 'Protein Data Bank' },
                { name: '.CIF / .mmCIF', type: 'Crystallographic' },
                { name: '.GLB / .GLTF', type: '3D Scene' },
                { name: '.OBJ + .MTL', type: 'Wavefront' },
                { name: '.STL', type: 'Stereolithography' },
                { name: '.PLY', type: 'Polygon File' },
                { name: '.FBX', type: 'Autodesk' },
                { name: '.3DS', type: '3D Studio' },
              ].map((fmt) => (
                <div
                  key={fmt.name}
                  className="px-2.5 py-1 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center gap-1.5 font-mono text-[11px]"
                >
                  <span className="text-indigo-400 font-bold">{fmt.name}</span>
                  <span className="text-slate-500 text-[10px]">{fmt.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

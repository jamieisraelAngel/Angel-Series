import React from 'react';
import { UploadCloud, Box, Dna } from 'lucide-react';

interface DropZoneOverlayProps {
  isDragging: boolean;
}

export const DropZoneOverlay: React.FC<DropZoneOverlayProps> = ({ isDragging }) => {
  if (!isDragging) return null;

  return (
    <div
      id="drag-and-drop-active-overlay"
      className="fixed inset-0 z-50 pointer-events-none bg-indigo-950/70 backdrop-blur-md border-4 border-dashed border-indigo-400/80 m-4 rounded-3xl flex flex-col items-center justify-center gap-4 text-center animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="w-20 h-20 rounded-3xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-2xl animate-bounce">
        <UploadCloud className="w-10 h-10" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-1">Drop 3D or Molecular Files Here</h3>
        <p className="text-xs text-indigo-200">
          Supports .pdb, .cif, .mmcif, .glb, .gltf, .obj, .stl, .ply, .fbx, .3ds
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs text-indigo-300 bg-slate-900/60 px-4 py-1.5 rounded-full border border-indigo-500/30">
        <span className="flex items-center gap-1.5">
          <Dna className="w-4 h-4 text-emerald-400" />
          <span>Molecular Structures</span>
        </span>
        <span className="text-slate-600">•</span>
        <span className="flex items-center gap-1.5">
          <Box className="w-4 h-4 text-cyan-400" />
          <span>3D CAD & Meshes</span>
        </span>
      </div>
    </div>
  );
};

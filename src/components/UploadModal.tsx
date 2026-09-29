import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  Sparkles,
  FileCode,
  Box,
  Dna,
  Terminal,
  Loader2,
  CheckCircle2,
  Tag,
  Plus,
} from 'lucide-react';
import { ArchiveItem, AssetCategory, AssetTier } from '../types';
import { autofillAssetMetadata } from '../lib/gemini';
import { saveAsset } from '../lib/db';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetSaved: (asset: ArchiveItem) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onAssetSaved,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [contentSnippet, setContentSnippet] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AssetCategory>('3d-model');
  const [format, setFormat] = useState('glb');
  const [tier, setTier] = useState<AssetTier>('rare');
  const [version, setVersion] = useState('1.0.0');
  const [tagsInput, setTagsInput] = useState('');
  const [compatibilityInput, setCompatibilityInput] = useState('Blender 4.2, Three.js r160');

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    setFormat(ext);

    // Initial category estimation
    if (['py', 'ts', 'js', 'cuda', 'cpp'].includes(ext)) {
      setCategory('script');
    } else if (['hlsl', 'glsl', 'wgsl'].includes(ext)) {
      setCategory('shader');
    } else if (['pdb', 'cif', 'mmcif', 'bcif'].includes(ext)) {
      setCategory('molecular');
    } else {
      setCategory('3d-model');
    }

    // Read content snippet if text/script
    if (
      selectedFile.size < 5 * 1024 * 1024 &&
      ['py', 'ts', 'js', 'cuda', 'hlsl', 'glsl', 'json', 'txt', 'obj', 'cif', 'pdb'].includes(ext)
    ) {
      try {
        const text = await selectedFile.text();
        setContentSnippet(text.slice(0, 3000));
      } catch (e) {
        console.warn('Could not read text preview:', e);
      }
    } else {
      setContentSnippet('');
    }

    // Default title from filename
    setName(
      selectedFile.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  const handleAutofillWithAI = async () => {
    if (!file) return;
    setIsAiLoading(true);

    try {
      const result = await autofillAssetMetadata({
        name: file.name,
        size: file.size,
        contentSnippet: contentSnippet || undefined,
      });

      setName(result.title);
      setDescription(result.description);
      setCategory(result.category);
      setFormat(result.format);
      setTier(result.tier);
      setVersion(result.version);
      setTagsInput(result.tags.join(', '));
      setCompatibilityInput(result.compatibility.join(', '));
    } catch (err) {
      console.error('AI autofill failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name.trim()) return;

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const compatibility = compatibilityInput
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const id = `vault-user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Read text content if script/shader
      let codeContent: string | undefined = undefined;
      if (['script', 'shader'].includes(category) && contentSnippet) {
        codeContent = await file.text();
      }

      const newAsset: ArchiveItem = {
        id,
        name: name.trim(),
        description: description.trim() || `Asset uploaded to KEEPER Vault (${file.name})`,
        category,
        format: format.toLowerCase(),
        size: file.size,
        tier,
        version: version.trim() || '1.0.0',
        tags: tags.length > 0 ? tags : [format, category],
        compatibility: compatibility.length > 0 ? compatibility : ['Blender 4.2', 'Three.js'],
        dateAdded: new Date().toISOString(),
        author: 'User / Vault Ingestion',
        license: 'Custom Vault Asset',
        blob: file,
        codeContent,
        fileUrl: URL.createObjectURL(file),
      };

      await saveAsset(newAsset);
      onAssetSaved(newAsset);
      onClose();
    } catch (err) {
      console.error('Failed to save asset:', err);
      alert('Could not save asset to IndexedDB storage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Ingest Asset to KEEPER Vault
              </h2>
              <p className="text-xs text-slate-400">
                Persistent IndexedDB storage for 3D meshes (.glb, .obj, .stl, .cif) and pipeline scripts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* File Picker Zone */}
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-900/50 transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".gltf,.glb,.obj,.stl,.ply,.cif,.mmcif,.pdb,.py,.ts,.js,.cuda,.hlsl,.glsl"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 mx-auto mb-3 transition-colors" />
              <p className="text-sm font-semibold text-slate-200">
                Choose a 3D binary file or script to store
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports .GLB, .GLTF, .OBJ, .STL, .MMCIF, .PDB, .PY, .TS, .CUDA, .HLSL
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white truncate max-w-xs">{file.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB • {format.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutofillWithAI}
                  disabled={isAiLoading}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  title="Analyze file with Gemini to automatically generate title, description, and tags"
                >
                  {isAiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Auto-fill with AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setContentSnippet('');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Form Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Asset Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Modular Humanoid Rig"
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Technical Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the asset architecture, topology, or pipeline utility..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AssetCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="3d-model">3D Model / Mesh</option>
                  <option value="script">Script / Automation</option>
                  <option value="shader">Shader Module</option>
                  <option value="molecular">Molecular Structure</option>
                  <option value="archive">Archive Bundle</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Vault Tier
                </label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as AssetTier)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="standard">Standard</option>
                  <option value="rare">Rare</option>
                  <option value="relic">Relic</option>
                  <option value="masterwork">Masterwork</option>
                  <option value="experimental">Experimental</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Version
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Pipeline Compatibility (comma separated)
              </label>
              <input
                type="text"
                value={compatibilityInput}
                onChange={(e) => setCompatibilityInput(e.target.value)}
                placeholder="Blender 4.2, Three.js r160, PyTorch 2.4, CUDA 12.2"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="humanoid, rigging, pbr, low-poly, procedural"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !name.trim() || isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Storing to Vault...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save to Vault</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

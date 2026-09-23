import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MolstarSettings, MolecularStats } from '../types';
import { Loader2, RefreshCw, AlertCircle, Maximize2, RotateCw } from 'lucide-react';

interface MolstarViewportProps {
  source: {
    type: 'file' | 'url' | 'pdbId';
    data: File | string;
    format?: 'pdb' | 'cif' | 'bcif';
  } | null;
  settings: MolstarSettings;
  stats: MolecularStats | null;
  onSetCameraFitRef?: (fn: () => void) => void;
  onGetCanvasBlobRef?: (fn: () => Promise<Blob>) => void;
  focusChainId?: string | null;
}

export const MolstarViewport: React.FC<MolstarViewportProps> = ({
  source,
  settings,
  stats,
  onSetCameraFitRef,
  onGetCanvasBlobRef,
  focusChainId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isScriptReady, setIsScriptReady] = useState<boolean>(false);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Check or wait for PDBeMolstarPlugin to become available
  useEffect(() => {
    const checkPluginAvailable = () => {
      if ((window as any).PDBeMolstarPlugin) {
        setIsScriptReady(true);
        return true;
      }
      return false;
    };

    if (checkPluginAvailable()) return;

    // Check periodically for script load or inject if missing
    const interval = setInterval(() => {
      if (checkPluginAvailable()) {
        clearInterval(interval);
      }
    }, 200);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!checkPluginAvailable()) {
        // Try fallback dynamic script injection from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdbe-molstar@3.3.0/build/pdbe-molstar-plugin.js';
        script.async = true;
        script.onload = () => {
          if ((window as any).PDBeMolstarPlugin) {
            setIsScriptReady(true);
          }
        };
        script.onerror = () => {
          setLoadError('Failed to load Mol* viewer engine. Please check internet connection.');
        };
        document.head.appendChild(script);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  // Map background theme to Mol* RGB color
  const getMolstarBgColor = useCallback(() => {
    switch (settings.backgroundTheme) {
      case 'dark':
        return { r: 15, g: 23, b: 42 };
      case 'studio':
        return { r: 30, g: 41, b: 59 };
      case 'midnight':
        return { r: 5, g: 8, b: 20 };
      case 'light':
        return { r: 248, g: 250, b: 252 };
      case 'custom': {
        const hex = settings.customBackgroundColor || '#0f172a';
        const num = parseInt(hex.replace('#', ''), 16);
        return {
          r: (num >> 16) & 255,
          g: (num >> 8) & 255,
          b: num & 255,
        };
      }
      default:
        return { r: 15, g: 23, b: 42 };
    }
  }, [settings.backgroundTheme, settings.customBackgroundColor]);

  // Map visual representation to PDBe Mol* visualStyle
  const getVisualRepresentation = useCallback((rep: string) => {
    switch (rep) {
      case 'cartoon':
        return 'cartoon';
      case 'ball-and-stick':
        return 'ball-and-stick';
      case 'spacefill':
        return 'spacefill';
      case 'surface':
        return 'surface';
      case 'putty':
        return 'putty';
      case 'backbone':
        return 'backbone';
      default:
        return 'cartoon';
    }
  }, []);

  // Initialize and load structure in Mol*
  const renderMolstar = useCallback(async () => {
    if (!containerRef.current || !isScriptReady || !source) return;

    setIsLoading(true);
    setLoadError(null);

    // Clean up previous blob URL
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }

    try {
      // Clear container DOM
      containerRef.current.innerHTML = '';

      // Create target div
      const targetDiv = document.createElement('div');
      targetDiv.id = `molstar-inner-${Date.now()}`;
      targetDiv.style.width = '100%';
      targetDiv.style.height = '100%';
      targetDiv.style.position = 'relative';
      containerRef.current.appendChild(targetDiv);

      const PDBeMolstarPlugin = (window as any).PDBeMolstarPlugin;
      const viewerInstance = new PDBeMolstarPlugin();
      pluginInstanceRef.current = viewerInstance;

      const bgColor = getMolstarBgColor();

      // Configure rendering options
      const renderOptions: any = {
        bgColor,
        hideControls: !settings.expandedControls,
        hideCanvasControls: ['snapshotControls', 'snapshotDescription'],
        visualStyle: getVisualRepresentation(settings.representation),
        lighting: settings.lighting || 'matte',
        spin: settings.spin,
        loadMaps: false,
        expanded: false,
      };

      if (source.type === 'pdbId') {
        const id = typeof source.data === 'string' ? source.data.trim().toLowerCase() : '';
        renderOptions.moleculeId = id;
      } else if (source.type === 'file') {
        const file = source.data as File;
        const blobUrl = URL.createObjectURL(file);
        activeBlobUrlRef.current = blobUrl;

        const ext = file.name.split('.').pop()?.toLowerCase();
        const format = ext === 'cif' || ext === 'mmcif' ? 'cif' : ext === 'bcif' ? 'bcif' : 'pdb';

        renderOptions.customData = {
          url: blobUrl,
          format,
          binary: format === 'bcif',
        };
      } else if (source.type === 'url') {
        const url = source.data as string;
        const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
        const format = ext === 'cif' || ext === 'mmcif' ? 'cif' : ext === 'bcif' ? 'bcif' : 'pdb';

        renderOptions.customData = {
          url,
          format,
          binary: format === 'bcif',
        };
      }

      await viewerInstance.render(targetDiv, renderOptions);

      // Register camera fit and screenshot callbacks
      if (onSetCameraFitRef) {
        onSetCameraFitRef(() => () => {
          try {
            viewerInstance.visual.reset({ camera: true });
          } catch (e) {
            console.warn('Camera fit error in Mol*:', e);
          }
        });
      }

      if (onGetCanvasBlobRef) {
        onGetCanvasBlobRef(async () => {
          // Find canvas inside Mol* container
          const canvas = targetDiv.querySelector('canvas');
          if (!canvas) throw new Error('Mol* Canvas not found');

          return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Snapshot failed'));
              },
              'image/png',
              0.95
            );
          });
        });
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Mol* rendering error:', err);
      setLoadError(err?.message || 'Failed to render molecular structure.');
      setIsLoading(false);
    }
  }, [
    isScriptReady,
    source,
    settings.representation,
    settings.lighting,
    settings.expandedControls,
    settings.spin,
    getMolstarBgColor,
    getVisualRepresentation,
    onSetCameraFitRef,
    onGetCanvasBlobRef,
  ]);

  // Trigger render on source or core settings changes
  useEffect(() => {
    if (isScriptReady && source) {
      renderMolstar();
    }

    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
    };
  }, [isScriptReady, source, renderMolstar]);

  // Handle focus on specific chain
  useEffect(() => {
    if (!pluginInstanceRef.current || !focusChainId) return;
    try {
      pluginInstanceRef.current.visual.select({
        data: [{ struct_asym_id: focusChainId, color: { r: 59, g: 130, b: 246 }, focus: true }],
      });
    } catch (e) {
      console.warn('Could not focus chain:', focusChainId, e);
    }
  }, [focusChainId]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* Target Container for Mol* Canvas */}
      <div
        ref={containerRef}
        id="molstar-viewer-wrapper"
        className="w-full h-full relative"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <div className="p-4 bg-indigo-600/20 border border-indigo-500/40 rounded-2xl shadow-2xl animate-pulse">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
          <div className="text-sm font-semibold text-white tracking-wide">
            Rendering Molecular Structure in Mol*...
          </div>
          <div className="text-xs text-slate-400">
            Parsing coordinates, secondary structure, and molecular bonds
          </div>
        </div>
      )}

      {/* Error State */}
      {loadError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/50 rounded-2xl p-6 text-center shadow-2xl">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-2">Molecular Render Error</h3>
            <p className="text-xs text-red-300 mb-4">{loadError}</p>
            <button
              onClick={() => renderMolstar()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 mx-auto transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Rendering</span>
            </button>
          </div>
        </div>
      )}

      {/* Mol* Status Badge / Watermark */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] font-bold text-slate-200 tracking-wide">Mol* 3D Viewer</span>
        {stats?.pdbId && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
            {stats.pdbId}
          </span>
        )}
      </div>
    </div>
  );
};

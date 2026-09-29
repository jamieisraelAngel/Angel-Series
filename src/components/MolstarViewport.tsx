import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MolstarSettings, MolecularStats, MolecularLigandInfo, MolecularColorScheme } from '../types';
import { getPlddtColor, getBFactorColor } from '../utils/molecularHelpers';
import { Loader2, RefreshCw, AlertCircle, ShieldCheck, Palette } from 'lucide-react';

interface MolstarViewportProps {
  source: {
    type: 'file' | 'url' | 'pdbId';
    data: File | string;
    format?: 'pdb' | 'cif' | 'bcif';
  } | null;
  settings: MolstarSettings;
  stats: MolecularStats | null;
  onChangeSettings?: (updated: Partial<MolstarSettings>) => void;
  onSetCameraFitRef?: (fn: () => void) => void;
  onGetCanvasBlobRef?: (fn: () => Promise<Blob>) => void;
  focusChainId?: string | null;
  ligands?: MolecularLigandInfo[];
  focusedLigand?: MolecularLigandInfo | null;
  hoveredLigand?: MolecularLigandInfo | null;
}

export const MolstarViewport: React.FC<MolstarViewportProps> = ({
  source,
  settings,
  stats,
  onChangeSettings,
  onSetCameraFitRef,
  onGetCanvasBlobRef,
  focusChainId,
  ligands,
  focusedLigand,
  hoveredLigand,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pluginInstanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStructureLoaded, setIsStructureLoaded] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isScriptReady, setIsScriptReady] = useState<boolean>(false);
  const activeBlobUrlRef = useRef<string | null>(null);

  // Helper to safely check if Mol* plugin hierarchy is ready for visual operations
  const isMolstarReady = useCallback((viewer: any): boolean => {
    try {
      return Boolean(
        viewer &&
        viewer.plugin &&
        viewer.plugin.managers &&
        viewer.plugin.managers.structure &&
        viewer.plugin.managers.structure.hierarchy &&
        viewer.plugin.managers.structure.hierarchy.current &&
        viewer.plugin.managers.structure.hierarchy.current.structures &&
        viewer.plugin.managers.structure.hierarchy.current.structures.length > 0
      );
    } catch {
      return false;
    }
  }, []);

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

  // Build contiguous residue color spans from stats.residueConfidences for fast Mol* selection coloring
  const buildResidueColorSelections = useCallback(
    (scheme: MolecularColorScheme) => {
      const residues = stats?.residueConfidences || [];
      if (residues.length === 0) return [];

      const minB = stats?.minBFactor ?? 5;
      const maxB = stats?.maxBFactor ?? 60;

      // Group contiguous residues with identical RGB color on the same chain
      const spans: Array<{
        chainId: string;
        startRes: number;
        endRes: number;
        color: { r: number; g: number; b: number };
        hex: string;
      }> = [];

      for (let i = 0; i < residues.length; i++) {
        const r = residues[i];
        const c =
          scheme === 'confidence'
            ? getPlddtColor(r.score)
            : getBFactorColor(r.rawBFactor, minB, maxB);

        const prev = spans[spans.length - 1];
        if (
          prev &&
          prev.chainId === r.chainId &&
          prev.hex === c.hex &&
          r.resSeq >= prev.endRes &&
          r.resSeq <= prev.endRes + 2
        ) {
          prev.endRes = r.resSeq;
        } else {
          spans.push({
            chainId: r.chainId,
            startRes: r.resSeq,
            endRes: r.resSeq,
            color: { r: c.r, g: c.g, b: c.b },
            hex: c.hex,
          });
        }
      }

      // Emit descriptors compatible with both auth_residue_number and label residue_number in PDBe-Mol*
      const selectionData: any[] = [];
      for (const span of spans) {
        selectionData.push({
          auth_asym_id: span.chainId,
          start_auth_residue_number: span.startRes,
          end_auth_residue_number: span.endRes,
          color: span.color,
        });
        selectionData.push({
          struct_asym_id: span.chainId,
          start_residue_number: span.startRes,
          end_residue_number: span.endRes,
          color: span.color,
        });
      }

      return selectionData;
    },
    [stats]
  );

  // Apply color scheme to loaded Mol* structure
  const applyColorSchemeToViewer = useCallback(
    async (viewer: any, scheme: MolecularColorScheme) => {
      if (!isMolstarReady(viewer)) return;

      try {
        // 1. First attempt native Mol* representation color theme update
        const themeMap: Record<MolecularColorScheme, string> = {
          'confidence': stats?.isPredictedModel ? 'plddt-confidence' : 'uncertainty',
          'b-factor': 'uncertainty',
          'secondary-structure': 'secondary-structure-type',
          'chain-id': 'chain-id',
          'element': 'element-symbol',
          'residue-type': 'residue-name',
        };
        const targetTheme = themeMap[scheme] || 'chain-id';

        const structures = viewer.plugin?.managers?.structure?.hierarchy?.current?.structures || [];
        for (const s of structures) {
          if (s.components && s.components.length > 0) {
            await viewer.plugin.managers.structure.component.updateRepresentationsTheme(
              s.components,
              { color: targetTheme as any }
            );
          }
        }

        // 2. For 'confidence' or 'b-factor', also apply explicit per-residue confidence / B-factor RGB spans
        // so PDB and custom mmCIF files without _ma_qa_metric_local still render exact pLDDT / B-factor colors
        if (scheme === 'confidence' || scheme === 'b-factor') {
          const selectionData = buildResidueColorSelections(scheme);
          if (selectionData.length > 0) {
            await viewer.visual?.select?.({
              data: selectionData,
              nonSelectedColor: scheme === 'confidence' ? { r: 101, g: 203, b: 243 } : undefined,
            });
          }
        } else {
          // Clear any custom residue color selection when switching back to standard themes
          await viewer.visual?.clearSelection?.();
        }
      } catch (err) {
        console.warn('Could not apply Mol* color scheme:', err);
      }
    },
    [isMolstarReady, stats, buildResidueColorSelections]
  );

  // Initialize and load structure in Mol*
  const renderMolstar = useCallback(async () => {
    if (!containerRef.current || !isScriptReady || !source) return;

    setIsLoading(true);
    setIsStructureLoaded(false);
    setLoadError(null);
    pluginInstanceRef.current = null;

    // Clean up previous blob URL
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }

    let readinessPoll: ReturnType<typeof setInterval> | null = null;

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

      const bgColor = getMolstarBgColor();

      // Configure rendering options
      const renderOptions: any = {
        bgColor,
        hideControls: !settings.expandedControls,
        hideCanvasControls: ['snapshotControls', 'snapshotDescription'],
        visualStyle: getVisualRepresentation(settings.representation),
        lighting: settings.lighting || 'matte',
        spin: settings.spin,
        alphafoldView: settings.colorScheme === 'confidence' && Boolean(stats?.isPredictedModel),
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

      const markLoaded = () => {
        if (readinessPoll) {
          clearInterval(readinessPoll);
          readinessPoll = null;
        }
        pluginInstanceRef.current = viewerInstance;
        setIsStructureLoaded(true);
        setLoadVersion((v) => v + 1);
        setIsLoading(false);
      };

      if (viewerInstance.events?.loadComplete) {
        viewerInstance.events.loadComplete.subscribe(() => {
          markLoaded();
        });
      }

      await viewerInstance.render(targetDiv, renderOptions);
      pluginInstanceRef.current = viewerInstance;

      // Poll until Mol* structure hierarchy is populated (handles cases where loadComplete fires early or late)
      let attempts = 0;
      readinessPoll = setInterval(() => {
        attempts++;
        if (isMolstarReady(viewerInstance)) {
          markLoaded();
        } else if (attempts > 60) {
          // After 12s stop spinner even if hierarchy is empty
          if (readinessPoll) clearInterval(readinessPoll);
          setIsLoading(false);
        }
      }, 200);

      // Register camera fit and screenshot callbacks
      if (onSetCameraFitRef) {
        onSetCameraFitRef(() => () => {
          try {
            if (isMolstarReady(viewerInstance)) {
              viewerInstance.visual.reset({ camera: true });
            }
          } catch (e) {
            console.warn('Camera fit error in Mol*:', e);
          }
        });
      }

      if (onGetCanvasBlobRef) {
        onGetCanvasBlobRef(async () => {
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
    } catch (err: any) {
      if (readinessPoll) clearInterval(readinessPoll);
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
    isMolstarReady,
    onSetCameraFitRef,
    onGetCanvasBlobRef,
  ]);

  // Trigger render on source or core representation changes
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

  // Apply color scheme whenever structure finishes loading, stats update, or colorScheme changes
  useEffect(() => {
    if (!isStructureLoaded || !pluginInstanceRef.current) return;
    const viewer = pluginInstanceRef.current;
    if (!isMolstarReady(viewer)) return;

    applyColorSchemeToViewer(viewer, settings.colorScheme);
  }, [isStructureLoaded, loadVersion, settings.colorScheme, stats, applyColorSchemeToViewer, isMolstarReady]);

  // Handle focus on specific chain
  useEffect(() => {
    if (!isStructureLoaded || !pluginInstanceRef.current || !focusChainId) return;
    const viewer = pluginInstanceRef.current;
    if (!isMolstarReady(viewer)) return;

    try {
      viewer.visual
        ?.focus([{ auth_asym_id: focusChainId }])
        ?.catch(() => {
          viewer.visual
            ?.select({
              data: [{ struct_asym_id: focusChainId, focus: true }],
              keepColors: true,
              keepRepresentations: true,
            })
            ?.catch((e: any) => console.warn('Could not focus chain:', focusChainId, e));
        });
    } catch (e) {
      console.warn('Could not focus chain:', focusChainId, e);
    }
  }, [focusChainId, isStructureLoaded, isMolstarReady]);

  // Apply ligand individual visibility states in Mol*
  useEffect(() => {
    if (!isStructureLoaded || !pluginInstanceRef.current || !ligands || ligands.length === 0) return;
    const viewer = pluginInstanceRef.current;
    if (!isMolstarReady(viewer)) return;

    try {
      const hiddenLigands = ligands.filter((l) => !l.visible);

      if (hiddenLigands.length > 0) {
        viewer.visual
          ?.select({
            data: hiddenLigands.map((l) => ({
              struct_asym_id: l.chainId,
              auth_asym_id: l.chainId,
              auth_seq_id: l.resSeq,
              auth_comp_id: l.chemId,
              label_comp_id: l.chemId,
              opacity: 0,
            })),
            keepColors: true,
            keepRepresentations: true,
          })
          ?.catch((err: any) => console.warn('Could not update ligand visibility in Mol*:', err));
      } else if (settings.colorScheme !== 'confidence' && settings.colorScheme !== 'b-factor') {
        viewer.visual
          ?.clearSelection(undefined, { keepColors: true, keepRepresentations: true })
          ?.catch((err: any) => console.warn('Could not clear selection in Mol*:', err));
      } else {
        // Re-apply confidence / B-factor colors when all ligands are shown again
        applyColorSchemeToViewer(viewer, settings.colorScheme);
      }
    } catch (err) {
      console.warn('Could not update ligand visibility in Mol*:', err);
    }
  }, [ligands, isStructureLoaded, settings.colorScheme, applyColorSchemeToViewer, isMolstarReady]);

  // Focus / zoom on selected ligand in Mol*
  useEffect(() => {
    if (!isStructureLoaded || !pluginInstanceRef.current || !focusedLigand) return;
    const viewer = pluginInstanceRef.current;
    if (!isMolstarReady(viewer)) return;

    try {
      viewer.visual
        ?.focus([
          {
            struct_asym_id: focusedLigand.chainId,
            auth_asym_id: focusedLigand.chainId,
            auth_seq_id: focusedLigand.resSeq,
            auth_comp_id: focusedLigand.chemId,
          },
        ])
        ?.catch((e: any) => console.warn('Could not focus ligand:', focusedLigand, e));
    } catch (e) {
      console.warn('Could not focus ligand:', focusedLigand, e);
    }
  }, [focusedLigand, isStructureLoaded, isMolstarReady]);

  // Highlight ligand on hover
  useEffect(() => {
    if (!isStructureLoaded || !pluginInstanceRef.current) return;
    const viewer = pluginInstanceRef.current;
    if (!isMolstarReady(viewer)) return;

    try {
      if (hoveredLigand) {
        viewer.visual
          ?.highlight({
            data: [
              {
                struct_asym_id: hoveredLigand.chainId,
                auth_asym_id: hoveredLigand.chainId,
                auth_seq_id: hoveredLigand.resSeq,
                auth_comp_id: hoveredLigand.chemId,
              },
            ],
            focus: false,
          })
          ?.catch(() => {});
      } else {
        viewer.visual?.clearHighlight?.()?.catch?.(() => {});
      }
    } catch (e) {
      // ignore
    }
  }, [hoveredLigand, isStructureLoaded, isMolstarReady]);

  const dist = stats?.confidenceDistribution;

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
            Parsing coordinates, secondary structure, and model confidence (pLDDT / B-factor)
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

      {/* Mol* Status Badge & Model Confidence HUD */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-xs">
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-200 tracking-wide">Mol* 3D Viewer</span>
          {stats?.pdbId && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded">
              {stats.pdbId}
            </span>
          )}
          {onChangeSettings && (
            <button
              onClick={() =>
                onChangeSettings({
                  colorScheme:
                    settings.colorScheme === 'confidence' ? 'secondary-structure' : 'confidence',
                })
              }
              title="Toggle Model Confidence (pLDDT) Colors"
              className={`ml-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 border transition-colors ${
                settings.colorScheme === 'confidence'
                  ? 'bg-blue-600/30 border-blue-500/60 text-blue-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-sky-400" />
              <span>pLDDT</span>
            </button>
          )}
        </div>

        {/* Model Confidence (pLDDT) Legend Overlay */}
        {settings.colorScheme === 'confidence' && (
          <div
            id="molstar-confidence-legend"
            className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3 shadow-2xl space-y-2 text-[11px]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>Model Confidence</span>
              </span>
              {stats?.avgConfidence !== undefined && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                  Mean: {stats.avgConfidence.toFixed(1)}
                </span>
              )}
            </div>

            {/* Stacked Distribution Bar */}
            {dist && (
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800">
                <div
                  style={{ width: `${dist.veryHigh}%`, backgroundColor: '#0053D6' }}
                  title={`Very High (>90): ${dist.veryHigh}%`}
                />
                <div
                  style={{ width: `${dist.confident}%`, backgroundColor: '#65CBF3' }}
                  title={`Confident (70-90): ${dist.confident}%`}
                />
                <div
                  style={{ width: `${dist.low}%`, backgroundColor: '#FFDB13' }}
                  title={`Low (50-70): ${dist.low}%`}
                />
                <div
                  style={{ width: `${dist.veryLow}%`, backgroundColor: '#FF7D45' }}
                  title={`Very Low (<50): ${dist.veryLow}%`}
                />
              </div>
            )}

            {/* 4-Band Color Scale */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#0053D6' }} />
                  <span>Very high (&gt;90)</span>
                </span>
                {dist && <span className="font-mono text-slate-400">{dist.veryHigh}%</span>}
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#65CBF3' }} />
                  <span>Confident (70–90)</span>
                </span>
                {dist && <span className="font-mono text-slate-400">{dist.confident}%</span>}
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#FFDB13' }} />
                  <span>Low (50–70)</span>
                </span>
                {dist && <span className="font-mono text-slate-400">{dist.low}%</span>}
              </div>
              <div className="flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#FF7D45' }} />
                  <span>Very low (&lt;50)</span>
                </span>
                {dist && <span className="font-mono text-slate-400">{dist.veryLow}%</span>}
              </div>
            </div>

            <div className="text-[9px] text-slate-400 pt-0.5 border-t border-slate-800/80">
              {stats?.isPredictedModel
                ? 'Colored by per-residue pLDDT confidence score (0–100).'
                : 'Colored by atomic coordinate certainty derived from B-factors.'}
            </div>
          </div>
        )}

        {/* B-Factor Thermal Legend Overlay */}
        {settings.colorScheme === 'b-factor' && (
          <div
            id="molstar-bfactor-legend"
            className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3 shadow-2xl space-y-1.5 text-[11px]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>B-Factor / Mobility</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {stats?.minBFactor ?? 5}–{stats?.maxBFactor ?? 60} Å²
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #1e64eb 0%, #50dcd7 35%, #ffc832 70%, #ff371e 100%)',
              }}
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>Rigid (Low B)</span>
              <span>Flexible (High B)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

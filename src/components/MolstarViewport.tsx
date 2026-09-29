import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MolstarSettings,
  MolecularStats,
  MolecularLigandInfo,
  MolecularColorScheme,
  ChainHighlightConfig,
} from '../types';
import { getPlddtColor, getBFactorColor } from '../utils/molecularHelpers';
import { Loader2, RefreshCw, AlertCircle, ShieldCheck, Palette, Sparkles, CircleDot, X } from 'lucide-react';

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
  chainHighlight?: ChainHighlightConfig;
  onChangeChainHighlight?: (updated: Partial<ChainHighlightConfig>) => void;
  hoveredChainId?: string | null;
  ligands?: MolecularLigandInfo[];
  focusedLigand?: MolecularLigandInfo | null;
  hoveredLigand?: MolecularLigandInfo | null;
}

const GLOW_COLOR_PRESETS = [
  { hex: '#00f0ff', label: 'Cyan Glow' },
  { hex: '#10b981', label: 'Emerald Ring' },
  { hex: '#f43f5e', label: 'Rose Pulse' },
  { hex: '#f59e0b', label: 'Amber Halo' },
  { hex: '#a855f7', label: 'Violet Aura' },
  { hex: '#38bdf8', label: 'Sky Beacon' },
];

function hexToRgbObj(hex: string): { r: number; g: number; b: number; packed: number } {
  const clean = (hex || '#00f0ff').replace('#', '');
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) {
    return { r: 0, g: 240, b: 255, packed: 0x00f0ff };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    packed: num,
  };
}

export const MolstarViewport: React.FC<MolstarViewportProps> = ({
  source,
  settings,
  stats,
  onChangeSettings,
  onSetCameraFitRef,
  onGetCanvasBlobRef,
  focusChainId,
  chainHighlight,
  onChangeChainHighlight,
  hoveredChainId,
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
  const onSetCameraFitRefProp = useRef(onSetCameraFitRef);
  const onGetCanvasBlobRefProp = useRef(onGetCanvasBlobRef);
  const statsRef = useRef(stats);
  const settingsRef = useRef(settings);

  useEffect(() => {
    onSetCameraFitRefProp.current = onSetCameraFitRef;
    onGetCanvasBlobRefProp.current = onGetCanvasBlobRef;
    statsRef.current = stats;
    settingsRef.current = settings;
  }, [onSetCameraFitRef, onGetCanvasBlobRef, stats, settings]);

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
      const curStats = statsRef.current;
      const residues = curStats?.residueConfidences || [];
      if (residues.length === 0) return [];

      const minB = curStats?.minBFactor ?? 5;
      const maxB = curStats?.maxBFactor ?? 60;

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
    []
  );

  // Apply color scheme to loaded Mol* structure
  const applyColorSchemeToViewer = useCallback(
    async (viewer: any, scheme: MolecularColorScheme) => {
      if (!isMolstarReady(viewer)) return;

      try {
        const curStats = statsRef.current;
        // 1. First attempt native Mol* representation color theme update
        const themeMap: Record<MolecularColorScheme, string> = {
          'confidence': curStats?.isPredictedModel ? 'plddt-confidence' : 'uncertainty',
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
    [isMolstarReady, buildResidueColorSelections]
  );

  // Initialize and load structure in Mol*
  const renderMolstar = useCallback(async () => {
    if (!containerRef.current || !isScriptReady || !source) return;

    setIsLoading(true);
    setIsStructureLoaded(false);
    setLoadError(null);

    if (pluginInstanceRef.current) {
      try {
        pluginInstanceRef.current.plugin?.dispose?.();
      } catch {
        // ignore
      }
      pluginInstanceRef.current = null;
    }

    // Delay revoking previous blob URL so any in-flight Mol* worker never hits a revoked URL
    if (activeBlobUrlRef.current) {
      const oldUrl = activeBlobUrlRef.current;
      activeBlobUrlRef.current = null;
      setTimeout(() => {
        try {
          URL.revokeObjectURL(oldUrl);
        } catch {
          // ignore
        }
      }, 15000);
    }

    let readinessPoll: ReturnType<typeof setInterval> | null = null;
    let loadSub: any = null;
    let hasMarkedLoaded = false;

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

      const curSettings = settingsRef.current;
      const curStats = statsRef.current;
      const bgColor = getMolstarBgColor();

      // Configure rendering options
      const renderOptions: any = {
        bgColor,
        hideControls: !curSettings.expandedControls,
        hideCanvasControls: ['snapshotControls', 'snapshotDescription'],
        visualStyle: getVisualRepresentation(curSettings.representation),
        lighting: curSettings.lighting || 'matte',
        spin: curSettings.spin,
        alphafoldView: curSettings.colorScheme === 'confidence' && Boolean(curStats?.isPredictedModel),
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

      const markLoadedOnce = () => {
        if (hasMarkedLoaded) return;
        hasMarkedLoaded = true;

        if (readinessPoll) {
          clearInterval(readinessPoll);
          readinessPoll = null;
        }
        if (loadSub && typeof loadSub.unsubscribe === 'function') {
          try {
            loadSub.unsubscribe();
          } catch {
            // ignore
          }
          loadSub = null;
        }
        pluginInstanceRef.current = viewerInstance;
        setIsStructureLoaded(true);
        setLoadVersion((v) => v + 1);
        setIsLoading(false);
      };

      if (viewerInstance.events?.loadComplete) {
        loadSub = viewerInstance.events.loadComplete.subscribe(() => {
          markLoadedOnce();
        });
      }

      await viewerInstance.render(targetDiv, renderOptions);
      pluginInstanceRef.current = viewerInstance;

      // Poll until Mol* structure hierarchy is populated (handles cases where loadComplete fires early or late)
      let attempts = 0;
      readinessPoll = setInterval(() => {
        attempts++;
        if (isMolstarReady(viewerInstance)) {
          markLoadedOnce();
        } else if (attempts > 60) {
          // After 12s stop spinner even if hierarchy is empty
          if (readinessPoll) clearInterval(readinessPoll);
          setIsLoading(false);
        }
      }, 200);

      // Register camera fit and screenshot callbacks
      if (onSetCameraFitRefProp.current) {
        onSetCameraFitRefProp.current(() => {
          try {
            if (isMolstarReady(viewerInstance)) {
              viewerInstance.visual.reset({ camera: true });
            }
          } catch (e) {
            console.warn('Camera fit error in Mol*:', e);
          }
        });
      }

      if (onGetCanvasBlobRefProp.current) {
        onGetCanvasBlobRefProp.current(async () => {
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
      if (loadSub && typeof loadSub.unsubscribe === 'function') {
        try {
          loadSub.unsubscribe();
        } catch {
          // ignore
        }
      }
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
    getVisualRepresentation,
    isMolstarReady,
  ]);

  // Trigger render on source or core representation changes
  useEffect(() => {
    if (isScriptReady && source) {
      renderMolstar();
    }
  }, [isScriptReady, source, renderMolstar]);

  // Update background color in-place without re-mounting Mol*
  useEffect(() => {
    if (!isStructureLoaded || !pluginInstanceRef.current) return;
    const viewer = pluginInstanceRef.current;
    try {
      const bgColor = getMolstarBgColor();
      viewer.canvas?.setBgColor?.(bgColor);
    } catch {
      // ignore
    }
  }, [isStructureLoaded, getMolstarBgColor]);

  // Update spin state in-place without re-mounting Mol*
  useEffect(() => {
    if (!isStructureLoaded || !pluginInstanceRef.current) return;
    const viewer = pluginInstanceRef.current;
    try {
      viewer.visual?.toggleSpin?.(settings.spin);
    } catch {
      // ignore
    }
  }, [isStructureLoaded, settings.spin]);

  // Apply color scheme whenever structure finishes loading or colorScheme changes
  useEffect(() => {
    if (!isStructureLoaded || !pluginInstanceRef.current) return;
    const viewer = pluginInstanceRef.current;
    if (!isMolstarReady(viewer)) return;

    applyColorSchemeToViewer(viewer, settings.colorScheme);
  }, [isStructureLoaded, loadVersion, settings.colorScheme, applyColorSchemeToViewer, isMolstarReady]);

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

  // Highlight ligand or chain on hover, and apply persistent Chain Glow / Color Ring
  useEffect(() => {
    if (!isStructureLoaded || !pluginInstanceRef.current) return;
    const viewer = pluginInstanceRef.current;
    if (!isMolstarReady(viewer)) return;

    const activeChainId = hoveredChainId || chainHighlight?.chainId || null;
    const glowHex = chainHighlight?.color || '#00f0ff';
    const rgb = hexToRgbObj(glowHex);
    const dimOthers = chainHighlight?.dimOthers ?? true;
    const mode = chainHighlight?.mode || 'glow-halo';

    try {
      // Configure Mol* 3D canvas edge-marking silhouette halo / ring around highlighted/selected chain
      const canvas3d = viewer.plugin?.canvas3d;
      if (canvas3d && typeof canvas3d.setProps === 'function') {
        canvas3d.setProps({
          renderer: {
            selectColor: rgb.packed,
            highlightColor: rgb.packed,
          },
          marking: {
            enabled: true,
            highlightEdgeColor: rgb.packed,
            selectEdgeColor: rgb.packed,
            edgeScale: mode === 'color-ring' ? 3.0 : 2.2,
            highlightEdgeStrength: 1.0,
            selectEdgeStrength: 1.0,
            ghostEdgeStrength: 1.0,
            innerEdgeFactor: mode === 'color-ring' ? 2.2 : 1.5,
          },
        });
      }
    } catch {
      // ignore if canvas3d.setProps structure differs
    }

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
      } else if (activeChainId) {
        // Apply 3D silhouette edge-ring highlight on the chain
        viewer.visual
          ?.highlight({
            data: [
              { struct_asym_id: activeChainId, color: { r: rgb.r, g: rgb.g, b: rgb.b } },
              { auth_asym_id: activeChainId, color: { r: rgb.r, g: rgb.g, b: rgb.b } },
            ],
            focus: false,
          })
          ?.catch(() => {});
      } else {
        viewer.visual?.clearHighlight?.()?.catch?.(() => {});
      }
    } catch {
      // ignore
    }

    // Apply persistent luminous color selection or full chain isolation on chainHighlight.chainId
    try {
      const isIsolate =
        Boolean(chainHighlight?.isolateOnAction) || mode === 'isolate';

      if (chainHighlight?.chainId) {
        const targetChain = chainHighlight.chainId;
        const curChains = statsRef.current?.chains || [];

        // Always clear previous opacity/selection state first so switching chains or modes cleanly resets visibility
        viewer.visual
          ?.clearSelection(undefined, { keepColors: true, keepRepresentations: true })
          ?.catch(() => {});

        if (isIsolate) {
          // Build selection array that hides all other chains and non-target ligands (opacity: 0)
          const isolateData: any[] = [
            {
              struct_asym_id: targetChain,
              color: { r: rgb.r, g: rgb.g, b: rgb.b },
              opacity: 1,
            },
            {
              auth_asym_id: targetChain,
              color: { r: rgb.r, g: rgb.g, b: rgb.b },
              opacity: 1,
            },
          ];

          curChains.forEach((ch) => {
            if (ch.id !== targetChain) {
              isolateData.push({ struct_asym_id: ch.id, opacity: 0 });
              isolateData.push({ auth_asym_id: ch.id, opacity: 0 });
            }
          });

          (ligands || []).forEach((l) => {
            if (l.chainId !== targetChain || !l.visible) {
              isolateData.push({
                struct_asym_id: l.chainId,
                auth_asym_id: l.chainId,
                auth_seq_id: l.resSeq,
                auth_comp_id: l.chemId,
                label_comp_id: l.chemId,
                opacity: 0,
              });
            }
          });

          viewer.visual
            ?.select({
              data: isolateData,
              keepColors: true,
              keepRepresentations: true,
            })
            ?.catch(() => {});
        } else {
          const nonSelected = dimOthers
            ? settings.backgroundTheme === 'light'
              ? { r: 203, g: 213, b: 225 }
              : { r: 30, g: 41, b: 59 }
            : undefined;

          viewer.visual
            ?.select({
              data: [
                {
                  struct_asym_id: targetChain,
                  color: { r: rgb.r, g: rgb.g, b: rgb.b },
                  opacity: 1,
                },
                {
                  auth_asym_id: targetChain,
                  color: { r: rgb.r, g: rgb.g, b: rgb.b },
                  opacity: 1,
                },
              ],
              nonSelectedColor: nonSelected,
            })
            ?.catch(() => {});
        }
      } else {
        // Restore visibility of all chains first
        viewer.visual
          ?.clearSelection(undefined, { keepColors: false, keepRepresentations: true })
          ?.catch(() => {});

        const hiddenLigands = (ligands || []).filter((l) => !l.visible);
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
            ?.catch(() => {});
        } else {
          // Restore active color scheme when chain highlight/isolation is cleared
          applyColorSchemeToViewer(viewer, settings.colorScheme);
        }
      }
    } catch {
      // ignore
    }
  }, [
    hoveredLigand,
    hoveredChainId,
    chainHighlight?.chainId,
    chainHighlight?.color,
    chainHighlight?.mode,
    chainHighlight?.dimOthers,
    chainHighlight?.isolateOnAction,
    isStructureLoaded,
    isMolstarReady,
    settings.backgroundTheme,
    settings.colorScheme,
    applyColorSchemeToViewer,
    ligands,
  ]);

  const dist = stats?.confidenceDistribution;

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* Target Container for Mol* Canvas */}
      <div
        ref={containerRef}
        id="molstar-viewer-wrapper"
        className="w-full h-full relative"
      />

      {/* Luminous Color Ring / Halo Overlay around Highlighted Chain */}
      {chainHighlight?.chainId && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
        >
          {/* Outer atmospheric glow aura */}
          <div
            className={`rounded-full transition-all duration-500 ${
              chainHighlight.pulse ? 'animate-pulse' : ''
            }`}
            style={{
              width: chainHighlight.mode === 'color-ring' ? '440px' : '480px',
              height: chainHighlight.mode === 'color-ring' ? '440px' : '480px',
              boxShadow:
                chainHighlight.mode === 'color-ring'
                  ? `0 0 65px 8px ${chainHighlight.color}55, inset 0 0 55px 8px ${chainHighlight.color}44`
                  : `0 0 95px 24px ${chainHighlight.color}40, inset 0 0 70px 18px ${chainHighlight.color}30`,
              border:
                chainHighlight.mode === 'color-ring'
                  ? `3px solid ${chainHighlight.color}`
                  : `1.5px solid ${chainHighlight.color}88`,
              background: `radial-gradient(circle, ${chainHighlight.color}14 0%, transparent 70%)`,
            }}
          />

          {/* Secondary precision ring when in Color Ring mode */}
          {chainHighlight.mode === 'color-ring' && (
            <div
              className="absolute rounded-full border border-dashed transition-all duration-500"
              style={{
                width: '380px',
                height: '380px',
                borderColor: `${chainHighlight.color}aa`,
                boxShadow: `0 0 28px ${chainHighlight.color}66`,
              }}
            />
          )}

          {/* Top Chain Glow Beacon Pill */}
          <div
            className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border flex items-center gap-2.5 shadow-2xl text-xs"
            style={{
              borderColor: `${chainHighlight.color}99`,
              boxShadow: `0 0 24px ${chainHighlight.color}40`,
            }}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${chainHighlight.pulse ? 'animate-ping' : ''}`}
              style={{ backgroundColor: chainHighlight.color }}
            />
            <span
              className="w-2.5 h-2.5 rounded-full -ml-5"
              style={{ backgroundColor: chainHighlight.color }}
            />
            <span className="font-bold text-white tracking-wide">
              Chain {chainHighlight.chainId}
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
              {chainHighlight.mode === 'color-ring'
                ? 'Color Ring'
                : chainHighlight.mode === 'isolate'
                ? 'Isolated Glow'
                : 'Glow Halo'}
            </span>
            {onChangeChainHighlight && (
              <button
                type="button"
                onClick={() => onChangeChainHighlight({ chainId: null })}
                title="Clear Chain Glow / Ring"
                className="p-0.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

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

        {/* Quick Chain Glow & Color Ring Selector Card */}
        {stats && stats.chains.length > 0 && onChangeChainHighlight && chainHighlight && (
          <div
            id="molstar-chain-glow-card"
            className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-2xl p-3 shadow-2xl space-y-2.5 text-[11px]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CircleDot
                  className="w-3.5 h-3.5"
                  style={{ color: chainHighlight.color || '#00f0ff' }}
                />
                <span>Chain Glow & Color Ring</span>
              </span>
              {chainHighlight.chainId && (
                <button
                  type="button"
                  onClick={() => onChangeChainHighlight({ chainId: null })}
                  className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" />
                  <span>Off</span>
                </button>
              )}
            </div>

            {/* Chain Selector Pills */}
            <div className="flex flex-wrap items-center gap-1">
              {stats.chains.map((ch) => {
                const isSelected = chainHighlight.chainId === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() =>
                      onChangeChainHighlight({
                        chainId: isSelected ? null : ch.id,
                      })
                    }
                    className={`px-2 py-1 rounded-lg font-mono text-[10px] font-bold border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'text-white shadow-md'
                        : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: `${chainHighlight.color}30`,
                            borderColor: chainHighlight.color,
                            boxShadow: `0 0 12px ${chainHighlight.color}55`,
                          }
                        : undefined
                    }
                    title={`${ch.name} (${ch.residueCount} residues) — Click to toggle glow / ring`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: isSelected ? chainHighlight.color : '#64748b',
                      }}
                    />
                    <span>Chain {ch.id}</span>
                  </button>
                );
              })}
            </div>

            {/* Glow Mode & Color Swatches (shown when a chain is active or always accessible) */}
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'glow-halo', label: 'Glow Halo' },
                    { id: 'color-ring', label: 'Color Ring' },
                    { id: 'isolate', label: 'Isolate' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeChainHighlight({ mode: m.id })}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${
                      chainHighlight.mode === m.id
                        ? 'bg-indigo-600/30 border-indigo-500/60 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {GLOW_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => onChangeChainHighlight({ color: preset.hex })}
                      title={preset.label}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        chainHighlight.color.toLowerCase() === preset.hex.toLowerCase()
                          ? 'scale-125 ring-2 ring-white'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: preset.hex,
                        boxShadow: `0 0 8px ${preset.hex}88`,
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={chainHighlight.color}
                    onChange={(e) => onChangeChainHighlight({ color: e.target.value })}
                    title="Custom Glow / Ring Color"
                    className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => onChangeChainHighlight({ pulse: !chainHighlight.pulse })}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                    chainHighlight.pulse
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Pulse
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

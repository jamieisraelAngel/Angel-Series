/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  AnimationClipInfo,
  MaterialInfo,
  MeshNodeItem,
  ModelStats,
  MolecularStats,
  MolstarSettings,
  ProjectionMode,
  RenderSettings,
  SectionPlaneState,
  MeasureState,
  ShadingMode,
  ViewerMode,
  ViewPreset,
} from './types';
import {
  buildMeshHierarchy,
  createSampleModel,
  exportModelAs,
  extractMaterials,
  extractModelStats,
  loadModelFromFiles,
  loadModelFromUrl,
  normalizeModelScaleAndPosition,
  downloadBlob,
} from './utils/threeHelpers';
import {
  parseCifMetadata,
  parsePdbMetadata,
  SAMPLE_PDB_STRUCTURES,
} from './utils/molecularHelpers';

import { Header } from './components/Header';
import { Viewport3D } from './components/Viewport3D';
import { Toolbar3D } from './components/Toolbar3D';
import { MolstarViewport } from './components/MolstarViewport';
import { ToolbarMolstar } from './components/ToolbarMolstar';
import { ModelTreePanel } from './components/ModelTreePanel';
import { InspectorPanel } from './components/InspectorPanel';
import { SectionPlaneModal } from './components/SectionPlaneModal';
import { MeasureOverlay } from './components/MeasureOverlay';
import { OpenUrlModal } from './components/OpenUrlModal';
import { SnapshotModal } from './components/SnapshotModal';
import { ShareModal } from './components/ShareModal';
import { AboutModal } from './components/AboutModal';
import { DropZoneOverlay } from './components/DropZoneOverlay';
import { Loader2, Dna, Box, Sparkles, FolderOpen, Globe } from 'lucide-react';

export default function App() {
  // Viewer Mode: Three.js for CAD/mesh, Mol* for PDB/mmCIF
  const [viewerMode, setViewerMode] = useState<ViewerMode>('molstar');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Model Name
  const [modelName, setModelName] = useState<string>('4HHB (Hemoglobin)');

  // Drag and Drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // --- 3D Three.js State ---
  const [threeModel, setThreeModel] = useState<THREE.Group | null>(null);
  const [threeStats, setThreeStats] = useState<ModelStats | null>(null);
  const [meshTree, setMeshTree] = useState<MeshNodeItem | null>(null);
  const [materials, setMaterials] = useState<MaterialInfo[]>([]);
  const [animations, setAnimations] = useState<THREE.AnimationClip[]>([]);
  const [currentAnimIndex, setCurrentAnimIndex] = useState<number>(0);
  const [isPlayingAnim, setIsPlayingAnim] = useState<boolean>(false);
  const [animSpeed, setAnimSpeed] = useState<number>(1);
  const [animTime, setAnimTime] = useState<number>(0);
  const [animDuration, setAnimDuration] = useState<number>(0);
  const [seekTime, setSeekTime] = useState<number | null>(null);

  const [projection, setProjection] = useState<ProjectionMode>('perspective');
  const [renderSettings, setRenderSettings] = useState<RenderSettings>({
    shading: 'pbr',
    showEdges: false,
    edgeColor: '#000000',
    edgeThresholdAngle: 1,
    showWireframe: false,
    wireframeColor: '#818cf8',
    showGrid: true,
    gridSize: 20,
    gridDivisions: 20,
    showAxes: false,
    showShadows: true,
    autoRotate: false,
    autoRotateSpeed: 2.0,
    backgroundTheme: 'dark',
    customBackgroundColor: '#0f172a',
    ambientLightIntensity: 0.8,
    directionalLightIntensity: 1.5,
    lightPreset: 'studio',
    environmentReflection: true,
    toneMappingExposure: 1.0,
  });

  const [sectionPlane, setSectionPlane] = useState<SectionPlaneState>({
    enabled: false,
    axis: 'y',
    position: 0,
    inverted: false,
    showCap: false,
  });

  const [measureState, setMeasureState] = useState<MeasureState>({
    active: false,
    pointA: null,
    pointB: null,
    distance: null,
    deltaX: null,
    deltaY: null,
    deltaZ: null,
  });

  // --- Mol* Molecular State ---
  const [molecularSource, setMolecularSource] = useState<{
    type: 'file' | 'url' | 'pdbId';
    data: File | string;
    format?: 'pdb' | 'cif' | 'bcif';
  } | null>({
    type: 'pdbId',
    data: '4hhb',
  });

  const [molecularStats, setMolecularStats] = useState<MolecularStats | null>(null);
  const [molstarSettings, setMolstarSettings] = useState<MolstarSettings>({
    representation: 'cartoon',
    colorScheme: 'secondary-structure',
    spin: false,
    lighting: 'matte',
    backgroundTheme: 'dark',
    customBackgroundColor: '#0f172a',
    expandedControls: false,
  });
  const [focusChainId, setFocusChainId] = useState<string | null>(null);
  const rawMolecularBlobRef = useRef<{ blob: Blob; fileName: string } | null>(null);

  // Panels visibility
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  // Modals
  const [isOpenUrlModal, setIsOpenUrlModal] = useState<boolean>(false);
  const [isOpenSnapshotModal, setIsOpenSnapshotModal] = useState<boolean>(false);
  const [isOpenShareModal, setIsOpenShareModal] = useState<boolean>(false);
  const [isOpenAboutModal, setIsOpenAboutModal] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Viewport action refs
  const cameraFitRef = useRef<(() => void) | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);
  const viewPresetRef = useRef<((preset: ViewPreset) => void) | null>(null);
  const canvasBlobGetterRef = useRef<
    ((options: { width: number; height: number; transparent: boolean; format: string }) => Promise<Blob>) | null
  >(null);

  // Load default sample on initial mount
  useEffect(() => {
    loadMolecularPdbId('4HHB');
  }, []);

  // --- Molecular Loading Functions ---
  const loadMolecularPdbId = async (pdbId: string) => {
    setIsLoading(true);
    setLoadingMessage(`Fetching structure ${pdbId.toUpperCase()} from RCSB Protein Data Bank...`);
    setErrorMessage(null);

    try {
      const id = pdbId.trim().toUpperCase();
      // Fetch text to parse metadata for researchers
      const res = await fetch(`https://files.rcsb.org/download/${id}.pdb`);
      if (!res.ok) {
        throw new Error(`Failed to download PDB entry ${id}. Status: ${res.statusText}`);
      }
      const text = await res.text();
      const stats = parsePdbMetadata(text, `${id}.pdb`);

      setMolecularStats(stats);
      setModelName(`${id} - ${stats.title}`);
      setMolecularSource({
        type: 'pdbId',
        data: id.toLowerCase(),
      });
      rawMolecularBlobRef.current = {
        blob: new Blob([text], { type: 'text/plain' }),
        fileName: `${id}.pdb`,
      };
      setViewerMode('molstar');
    } catch (err: any) {
      console.error('Error fetching PDB:', err);
      // Fallback: still pass pdbId to Mol* directly
      setMolecularSource({
        type: 'pdbId',
        data: pdbId.toLowerCase(),
      });
      setModelName(`Structure ${pdbId.toUpperCase()}`);
      setViewerMode('molstar');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMolecularFile = async (file: File) => {
    setIsLoading(true);
    setLoadingMessage(`Parsing molecular coordinates from ${file.name}...`);
    setErrorMessage(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const text = await file.text();
      let stats: MolecularStats;

      if (ext === 'cif' || ext === 'mmcif') {
        stats = parseCifMetadata(text, file.name, file.size);
      } else {
        stats = parsePdbMetadata(text, file.name, file.size);
      }

      setMolecularStats(stats);
      setModelName(file.name);
      setMolecularSource({
        type: 'file',
        data: file,
        format: ext === 'cif' || ext === 'mmcif' ? 'cif' : 'pdb',
      });
      rawMolecularBlobRef.current = {
        blob: file,
        fileName: file.name,
      };
      setViewerMode('molstar');
    } catch (err: any) {
      console.error('Error parsing molecular file:', err);
      setErrorMessage(`Failed to parse ${file.name}: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3D Mesh Loading Functions ---
  const loadThreeModelFromFiles = async (files: FileList | File[]) => {
    setIsLoading(true);
    setLoadingMessage('Loading and processing 3D mesh...');
    setErrorMessage(null);

    try {
      const result = await loadModelFromFiles(files);
      normalizeModelScaleAndPosition(result.object, 6.0);

      const stats = extractModelStats(result.object, {
        name: result.name,
        size: result.size,
        format: result.format,
      });

      const hierarchy = buildMeshHierarchy(result.object);
      const mats = extractMaterials(result.object);

      setThreeModel(result.object);
      setThreeStats(stats);
      setMeshTree(hierarchy);
      setMaterials(mats);
      setAnimations(result.animations);
      setCurrentAnimIndex(0);
      setIsPlayingAnim(result.animations.length > 0);
      setModelName(result.name);
      setViewerMode('three');
    } catch (err: any) {
      console.error('Error loading 3D model:', err);
      setErrorMessage(err.message || 'Failed to load 3D file.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSample3D = (type: 'torus' | 'gear' | 'crystal') => {
    setIsLoading(true);
    setLoadingMessage('Generating procedural 3D model...');
    setTimeout(() => {
      try {
        const group = createSampleModel(type);
        normalizeModelScaleAndPosition(group, 6.0);
        const stats = extractModelStats(group, {
          name: group.name,
          format: 'OBJ',
        });
        const hierarchy = buildMeshHierarchy(group);
        const mats = extractMaterials(group);

        setThreeModel(group);
        setThreeStats(stats);
        setMeshTree(hierarchy);
        setMaterials(mats);
        setAnimations([]);
        setModelName(group.name);
        setViewerMode('three');
      } catch (e: any) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  // Unified File Handler (Detects PDB / CIF vs CAD / Mesh)
  const handleIncomingFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const molecularFile = fileArray.find((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ['pdb', 'ent', 'cif', 'mmcif', 'bcif'].includes(ext || '');
    });

    if (molecularFile) {
      loadMolecularFile(molecularFile);
    } else {
      loadThreeModelFromFiles(files);
    }
  };

  // Drag and Drop listeners
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleIncomingFiles(e.dataTransfer.files);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'f' || e.key === 'F') {
        cameraFitRef.current?.();
      } else if (e.key === 'r' || e.key === 'R') {
        resetCameraRef.current?.();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (viewerMode === 'molstar') {
          setMolstarSettings((prev) => ({ ...prev, spin: !prev.spin }));
        } else {
          setRenderSettings((prev) => ({ ...prev, autoRotate: !prev.autoRotate }));
        }
      } else if (e.key === 'w' || e.key === 'W') {
        if (viewerMode === 'three') {
          setRenderSettings((prev) => ({ ...prev, showWireframe: !prev.showWireframe }));
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (viewerMode === 'three') {
          setMeasureState((prev) => ({ ...prev, active: !prev.active }));
        }
      } else if (e.key === 'c' || e.key === 'C') {
        if (viewerMode === 'three') {
          setSectionPlane((prev) => ({ ...prev, enabled: !prev.enabled }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerMode]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Node focus in Three.js
  const handleFocusNode = (nodeId: string) => {
    if (!threeModel) return;
    const targetObj = threeModel.getObjectByProperty('uuid', nodeId);
    if (targetObj) {
      const box = new THREE.Box3().setFromObject(targetObj);
      if (!box.isEmpty()) {
        cameraFitRef.current?.();
      }
    }
  };

  // Update Material Color live
  const handleUpdateMaterialColor = (matId: string, hexColor: string) => {
    if (!threeModel) return;
    threeModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m.uuid === matId && 'color' in m) {
            (m as any).color.set(hexColor);
          }
        });
      }
    });

    setMaterials((prev) =>
      prev.map((m) => (m.id === matId ? { ...m, color: hexColor } : m))
    );
  };

  // Download molecule file
  const handleExportMolecule = () => {
    if (rawMolecularBlobRef.current) {
      downloadBlob(
        rawMolecularBlobRef.current.blob,
        rawMolecularBlobRef.current.fileName
      );
    } else if (molecularStats?.pdbId) {
      window.open(`https://files.rcsb.org/download/${molecularStats.pdbId}.pdb`, '_blank');
    }
  };

  return (
    <div
      id="app-root-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none"
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".glb,.gltf,.obj,.stl,.ply,.fbx,.3ds,.mtl,.pdb,.cif,.mmcif,.bcif"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleIncomingFiles(e.target.files);
          }
        }}
        className="hidden"
      />

      {/* Top Header */}
      <Header
        viewerMode={viewerMode}
        modelName={modelName}
        threeStats={threeStats}
        molecularStats={molecularStats}
        onOpenFileClick={() => fileInputRef.current?.click()}
        onOpenUrlClick={() => setIsOpenUrlModal(true)}
        onOpenSnapshotClick={() => setIsOpenSnapshotModal(true)}
        onOpenShareClick={() => setIsOpenShareModal(true)}
        onExport={(fmt) => threeModel && exportModelAs(threeModel, fmt, modelName.replace(/\.[^/.]+$/, ''))}
        onExportMolecule={handleExportMolecule}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        onOpenAboutClick={() => setIsOpenAboutModal(true)}
        onLoadSamplePdb={loadMolecularPdbId}
        onLoadSample3D={loadSample3D}
      />

      {/* Main Workspace (Viewport + Overlays + Sidebars) */}
      <main className="relative flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left Hierarchy / Chains Panel */}
        <ModelTreePanel
          viewerMode={viewerMode}
          tree={meshTree}
          materials={materials}
          molecularStats={molecularStats}
          animations={animations.map((a) => ({ name: a.name, duration: a.duration }))}
          currentAnimationIndex={currentAnimIndex}
          onSelectAnimation={(idx) => setCurrentAnimIndex(idx)}
          isPlayingAnimation={isPlayingAnim}
          onTogglePlayAnimation={() => setIsPlayingAnim(!isPlayingAnim)}
          animationTime={animTime}
          animationDuration={animDuration}
          onSeekAnimation={(time) => setSeekTime(time)}
          animationSpeed={animSpeed}
          onChangeAnimationSpeed={(spd) => setAnimSpeed(spd)}
          onToggleNodeVisibility={(id, vis) => {
            const obj = threeModel?.getObjectByProperty('uuid', id);
            if (obj) obj.visible = vis;
          }}
          onFocusNode={handleFocusNode}
          onFocusMolecularChain={(chainId) => setFocusChainId(chainId)}
          onUpdateMaterialColor={handleUpdateMaterialColor}
          isOpen={isLeftPanelOpen}
          onToggleOpen={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        />

        {/* Viewport Center Area */}
        <div className="w-full h-full relative">
          {viewerMode === 'molstar' ? (
            <MolstarViewport
              source={molecularSource}
              settings={molstarSettings}
              stats={molecularStats}
              onSetCameraFitRef={(fn) => {
                cameraFitRef.current = fn;
              }}
              onGetCanvasBlobRef={(fn) => {
                canvasBlobGetterRef.current = async () => fn();
              }}
              focusChainId={focusChainId}
            />
          ) : (
            <Viewport3D
              model={threeModel}
              settings={renderSettings}
              sectionPlane={sectionPlane}
              measureState={measureState}
              projection={projection}
              onUpdateMeasure={(upd) => setMeasureState((prev) => ({ ...prev, ...upd }))}
              onSetCameraFitRef={(fn) => {
                cameraFitRef.current = fn;
              }}
              onSetResetCameraRef={(fn) => {
                resetCameraRef.current = fn;
              }}
              onSetViewPresetRef={(fn) => {
                viewPresetRef.current = fn;
              }}
              onGetCanvasBlobRef={(fn) => {
                canvasBlobGetterRef.current = fn;
              }}
              animations={animations}
              currentAnimationIndex={currentAnimIndex}
              isPlayingAnimation={isPlayingAnim}
              animationSpeed={animSpeed}
              onAnimationProgress={(t, d) => {
                setAnimTime(t);
                setAnimDuration(d);
              }}
              seekAnimationTime={seekTime}
            />
          )}

          {/* Mode Switcher Banner / Quick Toggle */}
          <div className="absolute top-4 right-4 z-10 flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-2xl shadow-xl">
            <button
              onClick={() => {
                if (threeModel) {
                  setViewerMode('three');
                } else {
                  loadSample3D('gear');
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewerMode === 'three'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Mesh</span>
            </button>
            <button
              onClick={() => {
                if (molecularSource) {
                  setViewerMode('molstar');
                } else {
                  loadMolecularPdbId('4HHB');
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewerMode === 'molstar'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Dna className="w-3.5 h-3.5 text-emerald-200" />
              <span>Mol* Viewer</span>
            </button>
          </div>

          {/* Bottom Toolbars */}
          {viewerMode === 'molstar' ? (
            <ToolbarMolstar
              settings={molstarSettings}
              onChangeSettings={(upd) => setMolstarSettings((prev) => ({ ...prev, ...upd }))}
              onFitView={() => cameraFitRef.current?.()}
            />
          ) : (
            <Toolbar3D
              projection={projection}
              onToggleProjection={() =>
                setProjection((prev) => (prev === 'perspective' ? 'orthographic' : 'perspective'))
              }
              onSetViewPreset={(vp) => viewPresetRef.current?.(vp)}
              onResetCamera={() => resetCameraRef.current?.()}
              onFitView={() => cameraFitRef.current?.()}
              showSectionPlane={sectionPlane.enabled}
              onToggleSectionPlane={() =>
                setSectionPlane((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
              measureActive={measureState.active}
              onToggleMeasure={() =>
                setMeasureState((prev) => ({ ...prev, active: !prev.active }))
              }
              autoRotate={renderSettings.autoRotate}
              onToggleAutoRotate={() =>
                setRenderSettings((prev) => ({ ...prev, autoRotate: !prev.autoRotate }))
              }
              showWireframe={renderSettings.showWireframe}
              onToggleWireframe={() =>
                setRenderSettings((prev) => ({ ...prev, showWireframe: !prev.showWireframe }))
              }
              showGrid={renderSettings.showGrid}
              onToggleGrid={() =>
                setRenderSettings((prev) => ({ ...prev, showGrid: !prev.showGrid }))
              }
              showEdges={renderSettings.showEdges}
              onToggleEdges={() =>
                setRenderSettings((prev) => ({ ...prev, showEdges: !prev.showEdges }))
              }
              shading={renderSettings.shading}
              onChangeShading={(shading) => setRenderSettings((prev) => ({ ...prev, shading }))}
            />
          )}

          {/* Section Plane HUD */}
          <SectionPlaneModal
            section={sectionPlane}
            onChange={(upd) => setSectionPlane((prev) => ({ ...prev, ...upd }))}
            onClose={() => setSectionPlane((prev) => ({ ...prev, enabled: false }))}
          />

          {/* Measurement Overlay HUD */}
          <MeasureOverlay
            measure={measureState}
            onClear={() =>
              setMeasureState({
                active: true,
                pointA: null,
                pointB: null,
                distance: null,
                deltaX: null,
                deltaY: null,
                deltaZ: null,
              })
            }
            onClose={() => setMeasureState((prev) => ({ ...prev, active: false }))}
          />
        </div>

        {/* Right Inspector Panel */}
        <InspectorPanel
          viewerMode={viewerMode}
          stats={threeStats}
          molecularStats={molecularStats}
          settings={renderSettings}
          molstarSettings={molstarSettings}
          onChangeSettings={(upd) => setRenderSettings((prev) => ({ ...prev, ...upd }))}
          onChangeMolstarSettings={(upd) => setMolstarSettings((prev) => ({ ...prev, ...upd }))}
          isOpen={isRightPanelOpen}
          onToggleOpen={() => setIsRightPanelOpen(!isRightPanelOpen)}
        />
      </main>

      {/* Loading Modal / Notification */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
          <div className="p-4 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl shadow-2xl">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-white tracking-wide">{loadingMessage}</p>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-950/90 border border-red-500/50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <p className="text-xs text-red-200">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-red-300 hover:text-white px-2 py-1 bg-red-900/60 rounded-lg"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      <DropZoneOverlay isDragging={isDragging} />

      {/* Fetch PDB / URL Modal */}
      <OpenUrlModal
        isOpen={isOpenUrlModal}
        onClose={() => setIsOpenUrlModal(false)}
        onLoadPdbId={(id) => loadMolecularPdbId(id)}
        onLoadUrl={async (url) => {
          setIsLoading(true);
          setLoadingMessage('Fetching remote resource...');
          try {
            const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
            if (['pdb', 'cif', 'mmcif'].includes(ext || '')) {
              const res = await fetch(url);
              const text = await res.text();
              const fileName = url.split('/').pop()?.split('?')[0] || 'remote.pdb';
              const stats = ext === 'pdb' ? parsePdbMetadata(text, fileName) : parseCifMetadata(text, fileName);
              setMolecularStats(stats);
              setModelName(fileName);
              setMolecularSource({
                type: 'url',
                data: url,
              });
              rawMolecularBlobRef.current = {
                blob: new Blob([text], { type: 'text/plain' }),
                fileName,
              };
              setViewerMode('molstar');
            } else {
              const result = await loadModelFromUrl(url);
              normalizeModelScaleAndPosition(result.object, 6.0);
              const stats = extractModelStats(result.object, {
                name: result.name,
                size: result.size,
                format: result.format,
              });
              setThreeModel(result.object);
              setThreeStats(stats);
              setMeshTree(buildMeshHierarchy(result.object));
              setMaterials(extractMaterials(result.object));
              setModelName(result.name);
              setViewerMode('three');
            }
          } catch (e: any) {
            setErrorMessage(e.message || 'Failed to load URL');
          } finally {
            setIsLoading(false);
          }
        }}
      />

      {/* Snapshot Modal */}
      <SnapshotModal
        isOpen={isOpenSnapshotModal}
        onClose={() => setIsOpenSnapshotModal(false)}
        onGetCanvasBlob={(opts) => {
          if (canvasBlobGetterRef.current) {
            return canvasBlobGetterRef.current(opts);
          }
          throw new Error('Canvas not ready');
        }}
        modelName={modelName}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isOpenShareModal}
        onClose={() => setIsOpenShareModal(false)}
        modelName={modelName}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={isOpenAboutModal}
        onClose={() => setIsOpenAboutModal(false)}
      />
    </div>
  );
}

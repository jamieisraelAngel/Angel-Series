export type ShadingMode = 'pbr' | 'flat' | 'toon' | 'phong' | 'wireframe' | 'normals' | 'depth';

export type BackgroundTheme = 'dark' | 'studio' | 'light' | 'midnight' | 'gradient' | 'transparent' | 'custom';

export type ProjectionMode = 'perspective' | 'orthographic';

export type ViewPreset = 'iso' | 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right';

export type ViewerMode = 'three' | 'molstar';

export type MolecularRepresentation = 'cartoon' | 'ball-and-stick' | 'spacefill' | 'surface' | 'putty' | 'backbone';

export type MolecularColorScheme =
  | 'confidence'
  | 'b-factor'
  | 'secondary-structure'
  | 'chain-id'
  | 'element'
  | 'residue-type';

export interface ResidueConfidence {
  chainId: string;
  resSeq: number;
  resName: string;
  score: number; // 0-100 pLDDT confidence score
  rawBFactor: number; // raw B-factor / tempFactor from file
}

export interface ModelStats {
  vertices: number;
  triangles: number;
  meshes: number;
  materials: number;
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
    center: [number, number, number];
  };
  volume: number; // in unit^3
  surfaceArea: number; // in unit^2
  fileSize?: number;
  fileName?: string;
  fileFormat?: string;
}

export interface MeshNodeItem {
  id: string;
  name: string;
  type: 'mesh' | 'group' | 'object';
  visible: boolean;
  triangleCount: number;
  vertexCount: number;
  materialName?: string;
  children?: MeshNodeItem[];
}

export interface MaterialInfo {
  id: string;
  name: string;
  type?: string;
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  transparent: boolean;
  wireframe: boolean;
  hasMap: boolean;
  hasNormalMap: boolean;
}

export interface RenderSettings {
  shading: ShadingMode;
  showEdges: boolean;
  edgeColor: string;
  edgeThresholdAngle: number;
  showWireframe: boolean;
  wireframeColor: string;
  showBoundingBox?: boolean;
  showGrid: boolean;
  gridSize: number;
  gridDivisions: number;
  showAxes: boolean;
  showShadows: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
  backgroundTheme: BackgroundTheme;
  customBackgroundColor: string;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  lightPreset: 'studio' | 'sunset' | 'neutral' | 'high_contrast' | 'cyberpunk';
  environmentReflection: boolean;
  toneMappingExposure: number;
}

export interface SectionPlaneState {
  enabled: boolean;
  axis: 'x' | 'y' | 'z';
  position: number;
  inverted: boolean;
  showCap?: boolean;
}

export interface MeasurePoint {
  x: number;
  y: number;
  z: number;
}

export interface MeasureState {
  active: boolean;
  pointA: MeasurePoint | null;
  pointB: MeasurePoint | null;
  distance: number | null;
  deltaX: number | null;
  deltaY: number | null;
  deltaZ: number | null;
}

export interface AnimationClipInfo {
  name: string;
  duration: number;
}

export interface SceneSettings {
  background: string;
  intensity: number;
  ambient: boolean;
}

export interface MolecularChainInfo {
  id: string;
  name: string;
  residueCount: number;
  type: 'protein' | 'nucleic' | 'other';
}

export interface ChainHighlightConfig {
  chainId: string | null;
  color: string; // Hex color for glow / halo ring
  mode: 'glow-halo' | 'color-ring' | 'isolate';
  pulse: boolean;
  dimOthers: boolean;
  isolateOnAction?: boolean; // Hide all other chains/structures when clicking highlight or focus
}

export interface MolecularLigandInfo {
  id: string;
  chemId: string;
  name: string;
  chainId: string;
  resSeq: number;
  count: number;
  formula?: string;
  description?: string;
  visible: boolean;
}

export interface MolecularStats {
  pdbId?: string;
  title: string;
  classification?: string;
  experimentalMethod?: string;
  resolution?: number | string;
  depositionDate?: string;
  organism?: string;
  chains: MolecularChainInfo[];
  ligands: MolecularLigandInfo[];
  atomCount: number;
  residueCount: number;
  helixCount?: number;
  sheetCount?: number;
  fileFormat: 'PDB' | 'mmCIF' | 'BCIF';
  fileSize?: number;
  fileName: string;
  residueConfidences?: ResidueConfidence[];
  avgConfidence?: number;
  minBFactor?: number;
  maxBFactor?: number;
  isPredictedModel?: boolean;
  confidenceDistribution?: {
    veryHigh: number; // > 90
    confident: number; // 70 - 90
    low: number; // 50 - 70
    veryLow: number; // <= 50
  };
}

export interface MolstarSettings {
  representation: MolecularRepresentation;
  colorScheme: MolecularColorScheme;
  spin: boolean;
  lighting: 'flat' | 'matte' | 'metallic';
  backgroundTheme: BackgroundTheme;
  customBackgroundColor: string;
  expandedControls: boolean;
}

export type AssetCategory = '3d-model' | 'script' | 'shader' | 'molecular' | 'archive';
export type AssetTier = 'standard' | 'rare' | 'relic' | 'masterwork' | 'experimental';

export interface AIAnalysisResult {
  summary: string;
  topologyOrQuality: string;
  documentation: string;
  performanceTips: string[];
  suggestedTags: string[];
  compatibilityNotes?: string;
  complexityScore?: number;
  timestamp?: string;
}

export interface ArchiveItem {
  id: string;
  name: string;
  description: string;
  category: AssetCategory;
  format: string; // 'glb' | 'gltf' | 'obj' | 'stl' | 'mmcif' | 'pdb' | 'py' | 'ts' | 'cuda' | 'hlsl'
  size: number;
  tier: AssetTier;
  tags: string[];
  dateAdded: string;
  author?: string;
  license?: string;
  version?: string;
  compatibility?: string[]; // e.g. ['Blender 4.2', 'Three.js r160', 'PyTorch 2.4']
  fileUrl?: string; // transient Object URL
  blob?: Blob; // stored in IndexedDB
  codeContent?: string; // for scripts and shaders
  thumbnailUrl?: string;
  aiAnalysis?: AIAnalysisResult;
  stats?: ModelStats | MolecularStats;
  sampleType?: 'torus' | 'gear' | 'crystal' | 'pdb';
  pdbId?: string;
}

export type ArchiveSortField = 'dateAdded' | 'name' | 'size' | 'tier';
export type SortOrder = 'asc' | 'desc';


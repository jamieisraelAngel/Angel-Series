export type ShadingMode = 'pbr' | 'flat' | 'toon' | 'phong' | 'wireframe' | 'normals' | 'depth';

export type BackgroundTheme = 'dark' | 'studio' | 'light' | 'midnight' | 'gradient' | 'transparent' | 'custom';

export type ProjectionMode = 'perspective' | 'orthographic';

export type ViewPreset = 'iso' | 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right';

export type ViewerMode = 'three' | 'molstar';

export type MolecularRepresentation = 'cartoon' | 'ball-and-stick' | 'spacefill' | 'surface' | 'putty' | 'backbone';

export type MolecularColorScheme = 'secondary-structure' | 'chain-id' | 'b-factor' | 'element' | 'residue-type';

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
  showCap: boolean;
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

export interface MolecularLigandInfo {
  id: string;
  name: string;
  count: number;
  description?: string;
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

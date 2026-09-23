import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js';
import { MaterialInfo, MeshNodeItem, ModelStats } from '../types';

// Calculate volume using signed tetrahedron algorithm
export function calculateVolume(object: THREE.Object3D): number {
  let totalVolume = 0;
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();

  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geometry = child.geometry;
      const index = geometry.index;
      const position = geometry.attributes.position;

      if (!position) return;

      const matrixWorld = child.matrixWorld;

      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          const i1 = index.getX(i);
          const i2 = index.getX(i + 1);
          const i3 = index.getX(i + 2);

          p1.fromBufferAttribute(position, i1).applyMatrix4(matrixWorld);
          p2.fromBufferAttribute(position, i2).applyMatrix4(matrixWorld);
          p3.fromBufferAttribute(position, i3).applyMatrix4(matrixWorld);

          // Signed volume of tetrahedron formed by (0,0,0) and the 3 triangle points
          const v321 = p3.x * p2.y * p1.z;
          const v231 = p2.x * p3.y * p1.z;
          const v312 = p3.x * p1.y * p2.z;
          const v132 = p1.x * p3.y * p2.z;
          const v213 = p2.x * p1.y * p3.z;
          const v123 = p1.x * p2.y * p3.z;

          totalVolume += (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
        }
      } else {
        for (let i = 0; i < position.count; i += 3) {
          p1.fromBufferAttribute(position, i).applyMatrix4(matrixWorld);
          p2.fromBufferAttribute(position, i + 1).applyMatrix4(matrixWorld);
          p3.fromBufferAttribute(position, i + 2).applyMatrix4(matrixWorld);

          const v321 = p3.x * p2.y * p1.z;
          const v231 = p2.x * p3.y * p1.z;
          const v312 = p3.x * p1.y * p2.z;
          const v132 = p1.x * p3.y * p2.z;
          const v213 = p2.x * p1.y * p3.z;
          const v123 = p1.x * p2.y * p3.z;

          totalVolume += (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
        }
      }
    }
  });

  return Math.abs(totalVolume);
}

// Calculate total surface area
export function calculateSurfaceArea(object: THREE.Object3D): number {
  let totalArea = 0;
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const cross = new THREE.Vector3();

  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geometry = child.geometry;
      const index = geometry.index;
      const position = geometry.attributes.position;
      if (!position) return;

      const matrixWorld = child.matrixWorld;

      if (index) {
        for (let i = 0; i < index.count; i += 3) {
          const i1 = index.getX(i);
          const i2 = index.getX(i + 1);
          const i3 = index.getX(i + 2);

          p1.fromBufferAttribute(position, i1).applyMatrix4(matrixWorld);
          p2.fromBufferAttribute(position, i2).applyMatrix4(matrixWorld);
          p3.fromBufferAttribute(position, i3).applyMatrix4(matrixWorld);

          edge1.subVectors(p2, p1);
          edge2.subVectors(p3, p1);
          cross.crossVectors(edge1, edge2);
          totalArea += cross.length() * 0.5;
        }
      } else {
        for (let i = 0; i < position.count; i += 3) {
          p1.fromBufferAttribute(position, i).applyMatrix4(matrixWorld);
          p2.fromBufferAttribute(position, i + 1).applyMatrix4(matrixWorld);
          p3.fromBufferAttribute(position, i + 2).applyMatrix4(matrixWorld);

          edge1.subVectors(p2, p1);
          edge2.subVectors(p3, p1);
          cross.crossVectors(edge1, edge2);
          totalArea += cross.length() * 0.5;
        }
      }
    }
  });

  return totalArea;
}

// Extract comprehensive statistics from a 3D model object
export function extractModelStats(
  object: THREE.Object3D,
  fileMeta?: { name?: string; size?: number; format?: string }
): ModelStats {
  let vertices = 0;
  let triangles = 0;
  let meshes = 0;
  const materialsSet = new Set<string>();

  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshes++;
      if (child.geometry) {
        const geo = child.geometry;
        if (geo.attributes.position) {
          vertices += geo.attributes.position.count;
        }
        if (geo.index) {
          triangles += geo.index.count / 3;
        } else if (geo.attributes.position) {
          triangles += geo.attributes.position.count / 3;
        }
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => materialsSet.add(m.uuid || m.name));
        } else {
          materialsSet.add(child.material.uuid || child.material.name);
        }
      }
    }
  });

  const volume = calculateVolume(object);
  const surfaceArea = calculateSurfaceArea(object);

  return {
    vertices: Math.round(vertices),
    triangles: Math.round(triangles),
    meshes,
    materials: Math.max(materialsSet.size, 1),
    boundingBox: {
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
      size: [size.x, size.y, size.z],
      center: [center.x, center.y, center.z],
    },
    volume: Number(volume.toFixed(2)),
    surfaceArea: Number(surfaceArea.toFixed(2)),
    fileName: fileMeta?.name || object.name || 'Model.obj',
    fileSize: fileMeta?.size,
    fileFormat: fileMeta?.format || '3D Model',
  };
}

// Build hierarchy tree for sidebar
export function buildMeshHierarchy(object: THREE.Object3D): MeshNodeItem {
  function parseNode(obj: THREE.Object3D, index = 0): MeshNodeItem {
    let triCount = 0;
    let vertCount = 0;
    let materialName: string | undefined;

    const isMesh = obj instanceof THREE.Mesh;
    if (isMesh && obj.geometry) {
      const geo = obj.geometry;
      vertCount = geo.attributes.position ? geo.attributes.position.count : 0;
      triCount = geo.index ? geo.index.count / 3 : vertCount / 3;

      if (obj.material) {
        if (Array.isArray(obj.material)) {
          materialName = obj.material.map((m) => m.name || 'Material').join(', ');
        } else {
          materialName = obj.material.name || 'Material';
        }
      }
    }

    const children: MeshNodeItem[] = [];
    obj.children.forEach((c, idx) => {
      // Don't include helper meshes like edges or bounding boxes
      if (!c.name.startsWith('__helper_') && !c.name.startsWith('__edge_')) {
        children.push(parseNode(c, idx));
      }
    });

    return {
      id: obj.uuid || `node-${index}-${obj.name}`,
      name: obj.name || (isMesh ? `Mesh_${index + 1}` : `Group_${index + 1}`),
      type: isMesh ? 'mesh' : obj.children.length > 0 ? 'group' : 'object',
      visible: obj.visible,
      triangleCount: Math.round(triCount),
      vertexCount: Math.round(vertCount),
      materialName,
      children: children.length > 0 ? children : undefined,
    };
  }

  return parseNode(object);
}

// Extract distinct materials from model
export function extractMaterials(object: THREE.Object3D): MaterialInfo[] {
  const materialsMap = new Map<string, MaterialInfo>();

  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        if (!materialsMap.has(m.uuid)) {
          let hexColor = '#888888';
          if ('color' in m && m.color instanceof THREE.Color) {
            hexColor = '#' + m.color.getHexString();
          }

          const roughness = 'roughness' in m ? (m as THREE.MeshStandardMaterial).roughness : 0.5;
          const metalness = 'metalness' in m ? (m as THREE.MeshStandardMaterial).metalness : 0.0;
          const hasMap = 'map' in m && !!(m as THREE.MeshStandardMaterial).map;
          const hasNormalMap = 'normalMap' in m && !!(m as THREE.MeshStandardMaterial).normalMap;

          materialsMap.set(m.uuid, {
            id: m.uuid,
            name: m.name || `Material_${materialsMap.size + 1}`,
            color: hexColor,
            roughness,
            metalness,
            opacity: m.opacity,
            transparent: m.transparent,
            wireframe: 'wireframe' in m ? Boolean((m as THREE.MeshBasicMaterial).wireframe) : false,
            hasMap,
            hasNormalMap,
          });
        }
      });
    }
  });

  return Array.from(materialsMap.values());
}

// Center and normalize model size to fit nicely in standard viewport (target size ~ 6 units)
export function normalizeModelScaleAndPosition(object: THREE.Object3D, targetDimension = 6.0): void {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0.0001) {
    const scale = targetDimension / maxDim;
    object.scale.set(scale, scale, scale);
  }

  // Recalculate after scale
  object.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(object);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  // Position on ground (min Y = 0) and centered in X and Z
  object.position.x = -scaledCenter.x;
  object.position.z = -scaledCenter.z;
  object.position.y = -scaledBox.min.y;
}

// Format Exporters
export async function exportModelAs(
  object: THREE.Object3D,
  format: 'obj' | 'stl' | 'ply' | 'gltf' | 'glb',
  fileName = 'model'
): Promise<void> {
  const cleanObject = object.clone();
  // Strip helper objects before export
  const toRemove: THREE.Object3D[] = [];
  cleanObject.traverse((child) => {
    if (child.name.startsWith('__helper_') || child.name.startsWith('__edge_')) {
      toRemove.push(child);
    }
  });
  toRemove.forEach((c) => c.removeFromParent());

  if (format === 'obj') {
    const exporter = new OBJExporter();
    const result = exporter.parse(cleanObject);
    downloadBlob(new Blob([result], { type: 'text/plain' }), `${fileName}.obj`);
  } else if (format === 'stl') {
    const exporter = new STLExporter();
    const result = exporter.parse(cleanObject, { binary: true });
    downloadBlob(new Blob([result], { type: 'application/octet-stream' }), `${fileName}.stl`);
  } else if (format === 'ply') {
    const exporter = new PLYExporter();
    exporter.parse(
      cleanObject,
      (result) => {
        if (result instanceof ArrayBuffer) {
          downloadBlob(new Blob([result], { type: 'application/octet-stream' }), `${fileName}.ply`);
        } else {
          downloadBlob(new Blob([result], { type: 'text/plain' }), `${fileName}.ply`);
        }
      },
      { binary: true }
    );
  } else if (format === 'gltf' || format === 'glb') {
    const exporter = new GLTFExporter();
    const binary = format === 'glb';
    exporter.parse(
      cleanObject,
      (gltf) => {
        if (gltf instanceof ArrayBuffer) {
          downloadBlob(new Blob([gltf], { type: 'application/octet-stream' }), `${fileName}.glb`);
        } else {
          const output = JSON.stringify(gltf, null, 2);
          downloadBlob(new Blob([output], { type: 'application/json' }), `${fileName}.gltf`);
        }
      },
      (error) => {
        console.error('Error exporting GLTF:', error);
      },
      { binary }
    );
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Load 3D files from File objects
export async function loadModelFromFiles(files: FileList | File[]): Promise<{
  object: THREE.Group;
  animations: THREE.AnimationClip[];
  name: string;
  size: number;
  format: string;
}> {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) throw new Error('No files provided');

  let totalSize = 0;
  fileArray.forEach((f) => (totalSize += f.size));

  // Determine main file
  const mainFile =
    fileArray.find((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ['gltf', 'glb', 'obj', 'stl', 'ply', 'fbx', '3ds', 'dae'].includes(ext || '');
    }) || fileArray[0];

  const ext = mainFile.name.split('.').pop()?.toLowerCase() || '';

  // Create Object URLs mapping for relative file assets
  const blobUrls = new Map<string, string>();
  fileArray.forEach((f) => {
    blobUrls.set(f.name, URL.createObjectURL(f));
    blobUrls.set(f.name.toLowerCase(), URL.createObjectURL(f));
  });

  const loadingManager = new THREE.LoadingManager();
  loadingManager.setURLModifier((url) => {
    const filename = url.split('/').pop()?.split('?')[0] || '';
    if (blobUrls.has(filename)) {
      return blobUrls.get(filename)!;
    }
    if (blobUrls.has(filename.toLowerCase())) {
      return blobUrls.get(filename.toLowerCase())!;
    }
    return url;
  });

  try {
    if (ext === 'glb' || ext === 'gltf') {
      const loader = new GLTFLoader(loadingManager);
      const buffer = await mainFile.arrayBuffer();
      const gltf = await loader.parseAsync(buffer, '');
      const group = new THREE.Group();
      group.name = mainFile.name;
      group.add(gltf.scene);
      return {
        object: group,
        animations: gltf.animations || [],
        name: mainFile.name,
        size: totalSize,
        format: ext.toUpperCase(),
      };
    }

    if (ext === 'obj') {
      const mtlFile = fileArray.find((f) => f.name.toLowerCase().endsWith('.mtl'));
      const objLoader = new OBJLoader(loadingManager);

      if (mtlFile) {
        const mtlLoader = new MTLLoader(loadingManager);
        const mtlText = await mtlFile.text();
        const materials = mtlLoader.parse(mtlText, '');
        materials.preload();
        objLoader.setMaterials(materials);
      }

      const objText = await mainFile.text();
      const obj = objLoader.parse(objText);
      obj.name = mainFile.name;

      // Ensure default materials if none provided
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && !child.material) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x90caf9,
            roughness: 0.4,
            metalness: 0.2,
          });
        }
      });

      const group = new THREE.Group();
      group.add(obj);
      return {
        object: group,
        animations: [],
        name: mainFile.name,
        size: totalSize,
        format: 'OBJ',
      };
    }

    if (ext === 'stl') {
      const loader = new STLLoader(loadingManager);
      const buffer = await mainFile.arrayBuffer();
      const geometry = loader.parse(buffer);
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        color: 0x4fc3f7,
        roughness: 0.35,
        metalness: 0.2,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = mainFile.name;

      const group = new THREE.Group();
      group.name = mainFile.name;
      group.add(mesh);
      return {
        object: group,
        animations: [],
        name: mainFile.name,
        size: totalSize,
        format: 'STL',
      };
    }

    if (ext === 'ply') {
      const loader = new PLYLoader(loadingManager);
      const buffer = await mainFile.arrayBuffer();
      const geometry = loader.parse(buffer);
      geometry.computeVertexNormals();

      const hasVertexColors = !!geometry.attributes.color;
      const material = new THREE.MeshStandardMaterial({
        color: hasVertexColors ? 0xffffff : 0x81c784,
        vertexColors: hasVertexColors,
        roughness: 0.4,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = mainFile.name;

      const group = new THREE.Group();
      group.name = mainFile.name;
      group.add(mesh);
      return {
        object: group,
        animations: [],
        name: mainFile.name,
        size: totalSize,
        format: 'PLY',
      };
    }

    if (ext === 'fbx') {
      const loader = new FBXLoader(loadingManager);
      const buffer = await mainFile.arrayBuffer();
      const fbx = loader.parse(buffer, '');
      fbx.name = mainFile.name;
      const group = new THREE.Group();
      group.add(fbx);
      return {
        object: group,
        animations: fbx.animations || [],
        name: mainFile.name,
        size: totalSize,
        format: 'FBX',
      };
    }

    if (ext === '3ds') {
      const loader = new TDSLoader(loadingManager);
      const buffer = await mainFile.arrayBuffer();
      const tds = loader.parse(buffer, '');
      tds.name = mainFile.name;
      const group = new THREE.Group();
      group.add(tds);
      return {
        object: group,
        animations: [],
        name: mainFile.name,
        size: totalSize,
        format: '3DS',
      };
    }

    throw new Error(`Unsupported file extension .${ext}`);
  } finally {
    // Revoke temporary blob URLs
    blobUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}

// Load model from URL directly
export async function loadModelFromUrl(url: string): Promise<{
  object: THREE.Group;
  animations: THREE.AnimationClip[];
  name: string;
  size: number;
  format: string;
}> {
  const filename = url.split('/').pop()?.split('?')[0] || 'remote-model';

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch model from URL: ${response.statusText}`);
  }

  const blob = await response.blob();
  const file = new File([blob], filename, { type: blob.type });
  return loadModelFromFiles([file]);
}

// Create sample 3D geometric models for instant testing
export function createSampleModel(type: 'torus' | 'gear' | 'crystal' | 'capsule'): THREE.Group {
  const group = new THREE.Group();

  if (type === 'gear') {
    group.name = 'Mechanical_Spur_Gear.obj';
    const teeth = 18;
    const innerRadius = 1.2;
    const outerRadius = 2.4;
    const toothDepth = 0.5;
    const thickness = 0.8;

    const shape = new THREE.Shape();
    for (let i = 0; i < teeth; i++) {
      const angle1 = (i / teeth) * Math.PI * 2;
      const angle2 = ((i + 0.3) / teeth) * Math.PI * 2;
      const angle3 = ((i + 0.5) / teeth) * Math.PI * 2;
      const angle4 = ((i + 0.8) / teeth) * Math.PI * 2;

      const rOuter = outerRadius + toothDepth;
      if (i === 0) {
        shape.moveTo(Math.cos(angle1) * outerRadius, Math.sin(angle1) * outerRadius);
      } else {
        shape.lineTo(Math.cos(angle1) * outerRadius, Math.sin(angle1) * outerRadius);
      }
      shape.lineTo(Math.cos(angle2) * rOuter, Math.sin(angle2) * rOuter);
      shape.lineTo(Math.cos(angle3) * rOuter, Math.sin(angle3) * rOuter);
      shape.lineTo(Math.cos(angle4) * outerRadius, Math.sin(angle4) * outerRadius);
    }
    shape.closePath();

    // Central bore hole
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    const extrudeSettings = {
      depth: thickness,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.1,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();

    const gearMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.8,
      roughness: 0.25,
      name: 'Titanium_Alloy',
    });
    const gearMesh = new THREE.Mesh(geometry, gearMat);
    gearMesh.name = 'Gear_Body';
    gearMesh.castShadow = true;
    gearMesh.receiveShadow = true;
    group.add(gearMesh);

    // Center axle shaft
    const axleGeo = new THREE.CylinderGeometry(0.8, 0.8, thickness * 2.2, 32);
    const axleMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.15,
      name: 'Chrome_Shaft',
    });
    const axleMesh = new THREE.Mesh(axleGeo, axleMat);
    axleMesh.rotation.x = Math.PI / 2;
    axleMesh.name = 'Central_Axle';
    group.add(axleMesh);

  } else if (type === 'crystal') {
    group.name = 'Bismuth_Crystal.obj';
    const icosaGeo = new THREE.IcosahedronGeometry(2.5, 1);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.5,
      roughness: 0.1,
      flatShading: true,
      name: 'Crystal_Faceted',
    });
    const crystalMesh = new THREE.Mesh(icosaGeo, crystalMat);
    crystalMesh.name = 'Core_Cluster';
    group.add(crystalMesh);

    // Orbiting rings
    const ringGeo = new THREE.TorusGeometry(3.5, 0.12, 16, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.85,
      roughness: 0.2,
      name: 'Orbital_Gimbal',
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.name = 'Gimbal_Ring_X';
    group.add(ring1);

    const ring2 = ring1.clone();
    ring2.rotation.x = Math.PI / 2;
    ring2.name = 'Gimbal_Ring_Y';
    group.add(ring2);

  } else {
    // Torus Knot
    group.name = 'Complex_Torus_Knot.glb';
    const knotGeo = new THREE.TorusKnotGeometry(2.2, 0.65, 150, 24, 2, 5);
    const knotMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      metalness: 0.7,
      roughness: 0.3,
      name: 'Anodized_Indigo',
    });
    const knotMesh = new THREE.Mesh(knotGeo, knotMat);
    knotMesh.name = 'Torus_Curve_Mesh';
    knotMesh.castShadow = true;
    knotMesh.receiveShadow = true;
    group.add(knotMesh);
  }

  return group;
}

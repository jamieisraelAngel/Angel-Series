import { ArchiveItem } from '../types';

const DB_NAME = 'keeper_vault_indexed_db';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

function openVaultDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('tier', 'tier', { unique: false });
        store.createIndex('dateAdded', 'dateAdded', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Retrieves all stored assets from IndexedDB.
 * Generates fresh Object URLs for binary Blobs so they can be rendered in Three.js or Mol*.
 */
export async function getAllAssets(): Promise<ArchiveItem[]> {
  try {
    const db = await openVaultDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items: ArchiveItem[] = request.result || [];
        // Attach valid Object URLs for stored blobs
        const hydratedItems = items.map((item) => {
          if (item.blob && !item.fileUrl) {
            try {
              return {
                ...item,
                fileUrl: URL.createObjectURL(item.blob),
              };
            } catch (e) {
              console.warn('Could not create ObjectURL for blob:', e);
            }
          }
          return item;
        });
        resolve(hydratedItems);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB read error, falling back to empty array:', err);
    return [];
  }
}

/**
 * Gets a single asset by ID with its binary blob hydrated.
 */
export async function getAssetById(id: string): Promise<ArchiveItem | undefined> {
  try {
    const db = await openVaultDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const item: ArchiveItem | undefined = request.result;
        if (item && item.blob && !item.fileUrl) {
          item.fileUrl = URL.createObjectURL(item.blob);
        }
        resolve(item);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`Failed to get asset ${id}:`, err);
    return undefined;
  }
}

/**
 * Stores or updates an asset in IndexedDB.
 * Retains binary Blob and all metadata.
 */
export async function saveAsset(asset: ArchiveItem): Promise<void> {
  const db = await openVaultDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Create a copy without transient fileUrl to avoid storing dead URLs
    const toStore: ArchiveItem = {
      ...asset,
    };
    if (toStore.fileUrl && !toStore.fileUrl.startsWith('data:') && !toStore.fileUrl.startsWith('http')) {
      delete toStore.fileUrl;
    }

    const request = store.put(toStore);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes an asset from IndexedDB.
 */
export async function deleteAsset(id: string): Promise<void> {
  const db = await openVaultDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Default Seed Vault Data with rich metadata, sample models, and scripts
export const DEFAULT_VAULT_ITEMS: ArchiveItem[] = [
  {
    id: 'vault-model-gear',
    name: 'Planetary Spur Gear Assembly',
    description: 'Precision mechanical transmission gear with central keyed bore and involute tooth profile.',
    category: '3d-model',
    format: 'obj',
    size: 245760,
    tier: 'masterwork',
    tags: ['mechanical', 'cad', 'gear', 'engineering', 'transmission', 'blender 4.2'],
    dateAdded: '2026-03-10T12:00:00.000Z',
    author: 'KEEPER Foundry',
    license: 'MIT / CC0',
    version: '2.4.0',
    compatibility: ['Blender 4.2', 'Three.js r160', 'FreeCAD 0.22'],
    sampleType: 'gear',
  },
  {
    id: 'vault-model-torus',
    name: 'Cybernetic Torus Engine Core',
    description: 'High-density mathematical torus knot mesh with interlinked thermal cooling vents and manifold geometry.',
    category: '3d-model',
    format: 'obj',
    size: 512000,
    tier: 'relic',
    tags: ['hard-surface', 'engine', 'parametric', 'geometry', 'cyberpunk', 'blender 4.2'],
    dateAdded: '2026-03-12T14:30:00.000Z',
    author: 'El-Roi Synthetics',
    license: 'Apache-2.0',
    version: '1.8.1',
    compatibility: ['Blender 4.2', 'Unreal Engine 5.4', 'Three.js r160'],
    sampleType: 'torus',
  },
  {
    id: 'vault-model-crystal',
    name: 'Bismuth Quantum Lattice',
    description: 'Faceted stepped crystal mineral formation with nested orbital gimbal rings for optical simulations.',
    category: '3d-model',
    format: 'obj',
    size: 198400,
    tier: 'rare',
    tags: ['mineral', 'crystal', 'lattice', 'optics', 'gemstone'],
    dateAdded: '2026-03-14T09:15:00.000Z',
    author: 'KEEPER Crystal Labs',
    license: 'CC-BY-4.0',
    version: '1.0.0',
    compatibility: ['Three.js', 'Blender 4.2', 'Unity 6'],
    sampleType: 'crystal',
  },
  {
    id: 'vault-mol-4hhb',
    name: 'Human Deoxyhemoglobin (4HHB)',
    description: 'X-ray crystallography coordinate structure of human deoxyhemoglobin at 1.74 Å resolution with 4 heme prosthetic groups.',
    category: 'molecular',
    format: 'pdb',
    size: 442368,
    tier: 'relic',
    tags: ['protein', 'macromolecule', 'rcsb', 'hemoglobin', 'crystallography', 'biology'],
    dateAdded: '2026-03-15T16:00:00.000Z',
    author: 'Fermi, G., Perutz, M.F. et al.',
    license: 'RCSB Open Data',
    version: '1.74Å',
    compatibility: ['Mol* Viewer', 'PyMOL 3.0', 'ChimeraX 1.8'],
    pdbId: '4hhb',
  },
  {
    id: 'vault-script-blender-rig',
    name: 'Blender 4.2 Humanoid Auto-Rig Pro Automation',
    description: 'Automated Python pipeline script to parse bone hierarchies, map humanoid vertex groups, and configure inverse kinematics in Blender 4.2.',
    category: 'script',
    format: 'py',
    size: 4210,
    tier: 'masterwork',
    tags: ['blender', 'python', 'rigging', 'humanoid', 'automation', 'blender 4.2', 'ik'],
    dateAdded: '2026-03-18T10:20:00.000Z',
    author: 'KEEPER Pipeline Team',
    license: 'GPL-3.0',
    version: '4.2.0',
    compatibility: ['Blender 4.2', 'Python 3.11', 'Auto-Rig Pro'],
    codeContent: `"""
Blender 4.2 - Humanoid Armature Auto-Rigging & IK Pipeline
Author: KEEPER Pipeline Tools
Compatibility: Blender 4.2 LTS / Python 3.11+
"""
import bpy
import mathutils

def configure_humanoid_ik(armature_name: str = "Humanoid_Rig"):
    armature = bpy.data.objects.get(armature_name)
    if not armature or armature.type != 'ARMATURE':
        print(f"[KEEPER] Armature '{armature_name}' not found.")
        return False

    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode='POSE')

    # Target standard humanoid leg bones
    ik_chains = [
        {"bone": "shin.L", "target": armature, "subtarget": "foot_ik.L", "pole": "knee_pole.L", "pole_angle": -90},
        {"bone": "shin.R", "target": armature, "subtarget": "foot_ik.R", "pole": "knee_pole.R", "pole_angle": 90},
        {"bone": "forearm.L", "target": armature, "subtarget": "hand_ik.L", "pole": "elbow_pole.L", "pole_angle": -90},
        {"bone": "forearm.R", "target": armature, "subtarget": "hand_ik.R", "pole": "elbow_pole.R", "pole_angle": 90},
    ]

    for chain in ik_chains:
        pbone = armature.pose.bones.get(chain["bone"])
        if not pbone:
            continue
        ik_const = pbone.constraints.new(type='IK')
        ik_const.name = "KEEPER_AutoIK"
        ik_const.target = chain["target"]
        ik_const.subtarget = chain["subtarget"]
        ik_const.chain_count = 2
        ik_const.pole_target = chain["target"]
        ik_const.pole_subtarget = chain["pole"]
        ik_const.pole_angle = mathutils.radians(chain["pole_angle"])
        print(f"[KEEPER] Successfully bound IK constraint to {chain['bone']}")

    bpy.ops.object.mode_set(mode='OBJECT')
    return True

if __name__ == "__main__":
    configure_humanoid_ik()
`,
  },
  {
    id: 'vault-shader-pbr',
    name: 'ACES Filmic PBR & Normal Distortion Shader',
    description: 'High-performance WebGL/Three.js shader module featuring ACES Filmic tone-mapping, microfacet GGX roughness, and normal map detail blending.',
    category: 'shader',
    format: 'ts',
    size: 5820,
    tier: 'rare',
    tags: ['three.js', 'glsl', 'shader', 'pbr', 'tonemapping', 'realtime'],
    dateAdded: '2026-03-19T17:45:00.000Z',
    author: 'ShaderForge Research',
    license: 'MIT',
    version: '1.4.0',
    compatibility: ['Three.js r160+', 'WebGL 2.0', 'WebGPU'],
    codeContent: `/**
 * KEEPER Real-Time PBR Shader Chunk with ACES Filmic Mapping
 * Written for Three.js CustomShaderMaterial / RawShaderMaterial
 */
import * as THREE from 'three';

export const PBR_TONEMAPPING_FRAGMENT_GLSL = /* glsl */ \`
vec3 RRTAndODTFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}

vec3 ACESFilmicToneMapping(vec3 color, float exposure) {
  // ACES input matrix transform
  mat3 m1 = mat3(
    0.59719, 0.07600, 0.02840,
    0.35458, 0.90834, 0.13383,
    0.04823, 0.01566, 0.83777
  );
  // ACES output matrix transform
  mat3 m2 = mat3(
    1.60475, -0.10208, -0.00327,
    -0.53108,  1.10813, -0.07276,
    -0.07367, -0.00605,  1.07602
  );
  vec3 v = m1 * (color * exposure);
  vec3 a = RRTAndODTFit(v);
  vec3 b = m2 * a;
  return clamp(b, 0.0, 1.0);
}

void main() {
  vec3 linearColor = texture2D(tDiffuse, vUv).rgb;
  vec3 mapped = ACESFilmicToneMapping(linearColor, 1.2);
  gl_FragColor = vec4(mapped, 1.0);
}
\`;
`,
  },
  {
    id: 'vault-script-cuda-voxels',
    name: 'CUDA 12.2 Fast Ray-Voxel Intersector',
    description: 'High-throughput CUDA kernel for sparse voxel octree traversal, ray-AABB intersection, and DDA marching for volumetric rendering.',
    category: 'script',
    format: 'cuda',
    size: 7340,
    tier: 'experimental',
    tags: ['cuda', 'gpu', 'voxel', 'raytracing', 'gpgpu', 'c++'],
    dateAdded: '2026-03-20T11:00:00.000Z',
    author: 'KEEPER HPC Division',
    license: 'BSD-3-Clause',
    version: '12.2-r1',
    compatibility: ['CUDA 12.2+', 'NVIDIA RTX', 'C++17'],
    codeContent: `/**
 * KEEPER High-Throughput Ray-Voxel DDA Intersector
 * CUDA 12.2 Kernel for Sparse Voxel Octrees (SVO)
 */
#include <cuda_runtime.h>
#include <device_launch_parameters.h>

struct Ray {
    float3 origin;
    float3 dir;
    float3 invDir;
    int3 sign;
};

__device__ bool intersectAABB(const Ray& r, const float3& bmin, const float3& bmax, float& tmin, float& tmax) {
    float tx1 = (bmin.x - r.origin.x) * r.invDir.x;
    float tx2 = (bmax.x - r.origin.x) * r.invDir.x;
    tmin = fminf(tx1, tx2);
    tmax = fmaxf(tx1, tx2);

    float ty1 = (bmin.y - r.origin.y) * r.invDir.y;
    float ty2 = (bmax.y - r.origin.y) * r.invDir.y;
    tmin = fmaxf(tmin, fminf(ty1, ty2));
    tmax = fminf(tmax, fmaxf(ty1, ty2));

    float tz1 = (bmin.z - r.origin.z) * r.invDir.z;
    float tz2 = (bmax.z - r.origin.z) * r.invDir.z;
    tmin = fmaxf(tmin, fminf(tz1, tz2));
    tmax = fminf(tmax, fmaxf(tz1, tz2));

    return tmax >= tmin && tmax > 0.0f;
}

__global__ void rayVoxelTraversalKernel(const Ray* rays, uint32_t* hitBuffer, int numRays) {
    int idx = blockIdx.x * blockDim.x + threadIdx.x;
    if (idx >= numRays) return;

    Ray ray = rays[idx];
    float tNear, tFar;
    float3 boxMin = make_float3(-10.0f, -10.0f, -10.0f);
    float3 boxMax = make_float3( 10.0f,  10.0f,  10.0f);

    if (intersectAABB(ray, boxMin, boxMax, tNear, tFar)) {
        hitBuffer[idx] = 1; // Hit confirmed
    } else {
        hitBuffer[idx] = 0;
    }
}
`,
  },
];

/**
 * Initializes the vault database with defaults if empty.
 */
export async function initVaultStorage(): Promise<ArchiveItem[]> {
  try {
    const existing = await getAllAssets();
    if (existing.length === 0) {
      for (const item of DEFAULT_VAULT_ITEMS) {
        await saveAsset(item);
      }
      return await getAllAssets();
    }
    return existing;
  } catch (err) {
    console.warn('Could not initialize vault storage:', err);
    return DEFAULT_VAULT_ITEMS;
  }
}

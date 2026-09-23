import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  MeasureState,
  ProjectionMode,
  RenderSettings,
  SectionPlaneState,
  ViewPreset,
} from '../types';

interface Viewport3DProps {
  model: THREE.Group | null;
  settings: RenderSettings;
  sectionPlane: SectionPlaneState;
  measureState: MeasureState;
  projection: ProjectionMode;
  onUpdateMeasure: (state: Partial<MeasureState>) => void;
  onSetCameraFitRef?: (fn: () => void) => void;
  onSetResetCameraRef?: (fn: () => void) => void;
  onSetViewPresetRef?: (fn: (preset: ViewPreset) => void) => void;
  onGetCanvasBlobRef?: (
    fn: (options: { width: number; height: number; transparent: boolean; format: string }) => Promise<Blob>
  ) => void;
  animations: THREE.AnimationClip[];
  currentAnimationIndex: number;
  isPlayingAnimation: boolean;
  animationSpeed: number;
  onAnimationProgress?: (time: number, duration: number) => void;
  seekAnimationTime?: number | null;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  model,
  settings,
  sectionPlane,
  measureState,
  projection,
  onUpdateMeasure,
  onSetCameraFitRef,
  onSetResetCameraRef,
  onSetViewPresetRef,
  onGetCanvasBlobRef,
  animations,
  currentAnimationIndex,
  isPlayingAnimation,
  animationSpeed,
  onAnimationProgress,
  seekAnimationTime,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const persCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const modelGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambLightRef = useRef<THREE.AmbientLight | null>(null);

  // Animation mixer
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);

  // Clipping plane
  const localPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  // Measurement objects
  const measureGroupRef = useRef<THREE.Group>(new THREE.Group());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Store original materials for shading toggles
  const originalMaterialsMap = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  // Animation frame ID
  const animFrameRef = useRef<number | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Fit camera to model
  const fitCameraToModel = useCallback(() => {
    if (!modelGroupRef.current) return;
    const box = new THREE.Box3().setFromObject(modelGroupRef.current);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = persCameraRef.current ? persCameraRef.current.fov * (Math.PI / 180) : Math.PI / 4;
    let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2)) * 1.6;
    cameraZ = Math.max(cameraZ, 4);

    if (persCameraRef.current) {
      persCameraRef.current.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.6, center.z + cameraZ * 0.8);
      persCameraRef.current.lookAt(center);
      persCameraRef.current.updateProjectionMatrix();
    }

    if (orthoCameraRef.current) {
      const aspect = (mountRef.current?.clientWidth || 800) / (mountRef.current?.clientHeight || 600);
      const orthoSize = maxDim * 1.4;
      orthoCameraRef.current.left = (-orthoSize * aspect) / 2;
      orthoCameraRef.current.right = (orthoSize * aspect) / 2;
      orthoCameraRef.current.top = orthoSize / 2;
      orthoCameraRef.current.bottom = -orthoSize / 2;
      orthoCameraRef.current.position.set(center.x + cameraZ * 0.7, center.y + cameraZ * 0.6, center.z + cameraZ * 0.8);
      orthoCameraRef.current.lookAt(center);
      orthoCameraRef.current.updateProjectionMatrix();
    }

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, []);

  // Reset Camera View
  const resetCamera = useCallback(() => {
    fitCameraToModel();
  }, [fitCameraToModel]);

  // Set View Preset (front, top, iso, etc.)
  const setViewPreset = useCallback((preset: ViewPreset) => {
    if (!modelGroupRef.current) return;
    const box = new THREE.Box3().setFromObject(modelGroupRef.current);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 2.2;

    const camera = projection === 'orthographic' ? orthoCameraRef.current : persCameraRef.current;
    if (!camera) return;

    switch (preset) {
      case 'iso':
        camera.position.set(center.x + dist * 0.7, center.y + dist * 0.7, center.z + dist * 0.7);
        break;
      case 'front':
        camera.position.set(center.x, center.y, center.z + dist);
        break;
      case 'back':
        camera.position.set(center.x, center.y, center.z - dist);
        break;
      case 'top':
        camera.position.set(center.x, center.y + dist, center.z + 0.0001);
        break;
      case 'bottom':
        camera.position.set(center.x, center.y - dist, center.z + 0.0001);
        break;
      case 'left':
        camera.position.set(center.x - dist, center.y, center.z);
        break;
      case 'right':
        camera.position.set(center.x + dist, center.y, center.z);
        break;
    }

    camera.lookAt(center);
    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [projection]);

  // Expose camera controls to parent
  useEffect(() => {
    onSetCameraFitRef?.(() => fitCameraToModel);
    onSetResetCameraRef?.(() => resetCamera);
    onSetViewPresetRef?.(() => setViewPreset);
  }, [onSetCameraFitRef, onSetResetCameraRef, onSetViewPresetRef, fitCameraToModel, resetCamera, setViewPreset]);

  // High-Resolution Snapshot Generator
  useEffect(() => {
    if (!onGetCanvasBlobRef) return;

    onGetCanvasBlobRef(async ({ width, height, transparent, format }: { width: number; height: number; transparent: boolean; format: string }) => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const activeCam = projection === 'orthographic' ? orthoCameraRef.current : persCameraRef.current;

      if (!renderer || !scene || !activeCam) throw new Error('Scene not initialized');

      // Preserve original size and background
      const origSize = new THREE.Vector2();
      renderer.getSize(origSize);
      const origPixelRatio = renderer.getPixelRatio();
      const origBg = scene.background;

      if (transparent) {
        scene.background = null;
      }

      renderer.setSize(width, height, false);
      renderer.setPixelRatio(1);

      if (activeCam instanceof THREE.PerspectiveCamera) {
        activeCam.aspect = width / height;
        activeCam.updateProjectionMatrix();
      }

      renderer.render(scene, activeCam);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const dataUrl = renderer.domElement.toDataURL(mimeType, 0.95);

      // Restore original renderer settings
      renderer.setSize(origSize.x, origSize.y, false);
      renderer.setPixelRatio(origPixelRatio);
      scene.background = origBg;

      if (activeCam instanceof THREE.PerspectiveCamera) {
        activeCam.aspect = origSize.x / origSize.y;
        activeCam.updateProjectionMatrix();
      }

      const res = await fetch(dataUrl);
      return await res.blob();
    });
  }, [onGetCanvasBlobRef, projection]);

  // Initialize Scene, Renderer, and Cameras
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const persCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    persCamera.position.set(6, 6, 8);
    persCameraRef.current = persCamera;

    const aspect = width / height;
    const d = 5;
    const orthoCamera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
    orthoCamera.position.set(6, 6, 8);
    orthoCameraRef.current = orthoCamera;

    const activeCam = projection === 'orthographic' ? orthoCamera : persCamera;
    const controls = new OrbitControls(activeCam, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 500;
    controls.minDistance = 0.1;
    controlsRef.current = controls;

    // Lights
    const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambLight);
    ambLightRef.current = ambLight;

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    const fillLight = new THREE.DirectionalLight(0x90caf9, 0.6);
    fillLight.position.set(-10, -10, -10);
    scene.add(fillLight);

    // Helpers
    const grid = new THREE.GridHelper(20, 20, 0x4f46e5, 0x334155);
    grid.position.y = -0.01;
    scene.add(grid);
    gridHelperRef.current = grid;

    const axes = new THREE.AxesHelper(3);
    scene.add(axes);
    axesHelperRef.current = axes;

    // Model Group Container
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Measurement Group
    scene.add(measureGroupRef.current);

    // Animation Loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      if (mixerRef.current && isPlayingAnimation) {
        mixerRef.current.update(delta * animationSpeed);
        if (activeActionRef.current && onAnimationProgress) {
          const time = activeActionRef.current.time;
          const dur = activeActionRef.current.getClip().duration;
          onAnimationProgress(time, dur);
        }
      }

      if (settings.autoRotate && controlsRef.current) {
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = settings.autoRotateSpeed || 2.0;
      } else if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }

      controlsRef.current?.update();

      const currentCam = projection === 'orthographic' ? orthoCameraRef.current : persCameraRef.current;
      if (currentCam && rendererRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, currentCam);
      }
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;

      rendererRef.current.setSize(w, h);

      if (persCameraRef.current) {
        persCameraRef.current.aspect = w / h;
        persCameraRef.current.updateProjectionMatrix();
      }

      if (orthoCameraRef.current) {
        const asp = w / h;
        const curD = 5;
        orthoCameraRef.current.left = -curD * asp;
        orthoCameraRef.current.right = curD * asp;
        orthoCameraRef.current.top = curD;
        orthoCameraRef.current.bottom = -curD;
        orthoCameraRef.current.updateProjectionMatrix();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Update Projection Mode Camera switch
  useEffect(() => {
    if (!controlsRef.current) return;
    const currentCam = projection === 'orthographic' ? orthoCameraRef.current : persCameraRef.current;
    if (currentCam) {
      controlsRef.current.object = currentCam;
      controlsRef.current.update();
    }
  }, [projection]);

  // Mount/Update Model
  useEffect(() => {
    if (!modelGroupRef.current || !sceneRef.current) return;
    const group = modelGroupRef.current;

    // Clear old children
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    originalMaterialsMap.current.clear();

    if (model) {
      group.add(model);

      // Cache original materials
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = settings.showShadows;
          child.receiveShadow = settings.showShadows;
          if (child.material) {
            originalMaterialsMap.current.set(child, Array.isArray(child.material) ? [...child.material] : child.material);
          }
        }
      });

      fitCameraToModel();
    }
  }, [model, fitCameraToModel]);

  // Update Animation Mixer
  useEffect(() => {
    if (!model || animations.length === 0) {
      mixerRef.current = null;
      activeActionRef.current = null;
      return;
    }

    const mixer = new THREE.AnimationMixer(model);
    mixerRef.current = mixer;

    const clip = animations[currentAnimationIndex] || animations[0];
    if (clip) {
      const action = mixer.clipAction(clip);
      action.play();
      activeActionRef.current = action;
    }

    return () => {
      mixer.stopAllAction();
    };
  }, [model, animations, currentAnimationIndex]);

  // Seek animation manual scrub
  useEffect(() => {
    if (seekAnimationTime !== null && seekAnimationTime !== undefined && activeActionRef.current) {
      activeActionRef.current.time = seekAnimationTime;
      mixerRef.current?.update(0);
    }
  }, [seekAnimationTime]);

  // Update Background Theme
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    switch (settings.backgroundTheme) {
      case 'dark':
        scene.background = new THREE.Color(0x0a0f1d);
        break;
      case 'midnight':
        scene.background = new THREE.Color(0x030712);
        break;
      case 'studio':
        scene.background = new THREE.Color(0x1e293b);
        break;
      case 'light':
        scene.background = new THREE.Color(0xf1f5f9);
        break;
      case 'custom':
        scene.background = new THREE.Color(settings.customBackgroundColor || '#0f172a');
        break;
      case 'transparent':
        scene.background = null;
        break;
      default:
        scene.background = new THREE.Color(0x0a0f1d);
    }
  }, [settings.backgroundTheme, settings.customBackgroundColor]);

  // Update Lights & Presets
  useEffect(() => {
    if (!ambLightRef.current || !dirLightRef.current) return;
    ambLightRef.current.intensity = settings.ambientLightIntensity;
    dirLightRef.current.intensity = settings.directionalLightIntensity;

    if (settings.lightPreset === 'sunset') {
      dirLightRef.current.color.setHex(0xff7043);
      dirLightRef.current.position.set(15, 8, 12);
    } else if (settings.lightPreset === 'cyberpunk') {
      dirLightRef.current.color.setHex(0x00f0ff);
      dirLightRef.current.position.set(10, 15, 15);
    } else if (settings.lightPreset === 'high_contrast') {
      dirLightRef.current.color.setHex(0xffffff);
      dirLightRef.current.position.set(5, 25, 5);
    } else {
      dirLightRef.current.color.setHex(0xffffff);
      dirLightRef.current.position.set(10, 20, 15);
    }
  }, [settings.ambientLightIntensity, settings.directionalLightIntensity, settings.lightPreset]);

  // Update Grid and Axes
  useEffect(() => {
    if (gridHelperRef.current) gridHelperRef.current.visible = settings.showGrid;
    if (axesHelperRef.current) axesHelperRef.current.visible = settings.showAxes;
  }, [settings.showGrid, settings.showAxes]);

  // Update Shading Mode
  useEffect(() => {
    if (!modelGroupRef.current) return;

    modelGroupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const orig = originalMaterialsMap.current.get(child);
        if (!orig) return;

        if (settings.shading === 'pbr') {
          child.material = orig;
        } else if (settings.shading === 'wireframe') {
          child.material = new THREE.MeshBasicMaterial({
            wireframe: true,
            color: 0x818cf8,
          });
        } else if (settings.shading === 'normals') {
          child.material = new THREE.MeshNormalMaterial();
        } else if (settings.shading === 'depth') {
          child.material = new THREE.MeshDepthMaterial();
        } else if (settings.shading === 'flat') {
          child.material = new THREE.MeshLambertMaterial({
            color: 0x94a3b8,
            flatShading: true,
          });
        } else if (settings.shading === 'phong') {
          child.material = new THREE.MeshPhongMaterial({
            color: 0x60a5fa,
            shininess: 60,
          });
        } else if (settings.shading === 'toon') {
          child.material = new THREE.MeshToonMaterial({
            color: 0x38bdf8,
          });
        }

        // Apply global wireframe toggle overlay
        if (settings.showWireframe && Array.isArray(child.material)) {
          child.material.forEach((m) => (m.wireframe = true));
        } else if (settings.showWireframe && child.material) {
          child.material.wireframe = true;
        }

        // Clipping planes
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            m.clippingPlanes = sectionPlane.enabled ? [localPlaneRef.current] : [];
            m.clipShadows = true;
          });
        }
      }
    });
  }, [settings.shading, settings.showWireframe, sectionPlane.enabled]);

  // Update Cross-Section Clipping Plane
  useEffect(() => {
    if (!modelGroupRef.current) return;
    const box = new THREE.Box3().setFromObject(modelGroupRef.current);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const normal = new THREE.Vector3();
    if (sectionPlane.axis === 'x') normal.set(1, 0, 0);
    else if (sectionPlane.axis === 'y') normal.set(0, 1, 0);
    else normal.set(0, 0, 1);

    if (sectionPlane.inverted) normal.negate();

    const maxDim = size[sectionPlane.axis] || 1;
    const constant = -((center[sectionPlane.axis] || 0) + (sectionPlane.position * maxDim) / 2);

    localPlaneRef.current.set(normal, constant);

    if (rendererRef.current) {
      rendererRef.current.localClippingEnabled = sectionPlane.enabled;
    }
  }, [sectionPlane]);

  // Handle Measurement Mouse Clicks
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!measureState.active || !mountRef.current || !modelGroupRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const camera = projection === 'orthographic' ? orthoCameraRef.current : persCameraRef.current;
    if (!camera) return;

    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    const intersects = raycasterRef.current.intersectObjects(modelGroupRef.current.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0].point;

      if (!measureState.pointA || (measureState.pointA && measureState.pointB)) {
        // Set Point A
        onUpdateMeasure({
          pointA: { x: hit.x, y: hit.y, z: hit.z },
          pointB: null,
          distance: null,
          deltaX: null,
          deltaY: null,
          deltaZ: null,
        });
      } else if (measureState.pointA && !measureState.pointB) {
        // Set Point B and calculate distance
        const pA = new THREE.Vector3(measureState.pointA.x, measureState.pointA.y, measureState.pointA.z);
        const pB = hit;
        const dist = pA.distanceTo(pB);

        onUpdateMeasure({
          pointB: { x: hit.x, y: hit.y, z: hit.z },
          distance: dist,
          deltaX: Math.abs(pB.x - pA.x),
          deltaY: Math.abs(pB.y - pA.y),
          deltaZ: Math.abs(pB.z - pA.z),
        });
      }
    }
  };

  // Render Measurement Visuals (laser line and spheres)
  useEffect(() => {
    const group = measureGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (!measureState.active) return;

    const sphereGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const sphereMatA = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const sphereMatB = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    if (measureState.pointA) {
      const pA = new THREE.Vector3(measureState.pointA.x, measureState.pointA.y, measureState.pointA.z);
      const sA = new THREE.Mesh(sphereGeo, sphereMatA);
      sA.position.copy(pA);
      group.add(sA);

      if (measureState.pointB) {
        const pB = new THREE.Vector3(measureState.pointB.x, measureState.pointB.y, measureState.pointB.z);
        const sB = new THREE.Mesh(sphereGeo, sphereMatB);
        sB.position.copy(pB);
        group.add(sB);

        // Laser line between A and B
        const lineGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, linewidth: 2 });
        const line = new THREE.Line(lineGeo, lineMat);
        group.add(line);
      }
    }
  }, [measureState]);

  return (
    <div
      ref={mountRef}
      id="viewport-canvas-container"
      onPointerDown={handlePointerDown}
      className={`w-full h-full relative overflow-hidden select-none ${
        measureState.active ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
      }`}
    />
  );
};

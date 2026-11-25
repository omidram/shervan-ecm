"use client";

import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { assignStations, stationMatches } from "@/lib/mesh-map";

export const SUPPLIED_MODEL = "/models/engine_cfm56-7b.glb";

function Model({
  isolated,
  stations,
  onSelect,
  onShown,
}: {
  isolated: string[];
  stations: string[];
  onSelect: (code: string, shift: boolean, system: string, station: string) => void;
  onShown: (rows: { id: string; station: string }[]) => void;
}) {
  const gltf = useGLTF(SUPPLIED_MODEL, true);
  const scene = useMemo(() => {
    const root = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const span = Math.max(size.x, size.y, size.z, 0.001);
    const scale = 4 / span;
    root.scale.setScalar(scale);
    root.position.copy(center).multiplyScalar(-scale);
    const counts = new Map<string, number>();
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const base = mesh.name?.trim() || "part";
      const seen = (counts.get(base) ?? 0) + 1;
      counts.set(base, seen);
      mesh.userData.partId = seen === 1 ? base : `${base} #${seen}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const cloned = list.map((material) => {
        const next = material.clone();
        const standard = next as THREE.MeshStandardMaterial;
        if (standard.isMeshStandardMaterial) {
          standard.metalness = Math.min(standard.metalness, 0.32);
          standard.roughness = Math.max(standard.roughness, 0.42);
          standard.envMapIntensity = 1.15;
          standard.needsUpdate = true;
        }
        return next;
      });
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
    });
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const fitted = bounds.getSize(new THREE.Vector3());
    const axis: "x" | "y" | "z" = fitted.x >= fitted.y && fitted.x >= fitted.z ? "x" : fitted.y >= fitted.z ? "y" : "z";
    const cross = (["x", "y", "z"] as const).filter((key) => key !== axis);
    const axisSpan = Math.max(bounds.max[axis] - bounds.min[axis], 0.001);
    const samples: { mesh: THREE.Mesh; t: number; radial: number; reach: number; box: number; axialRatio: number; rimRatio: number; vertices: number }[] = [];
    const corner = new THREE.Vector3();
    const point = new THREE.Vector3();
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      const radial = Math.hypot(center[cross[0]], center[cross[1]]);
      let reach = radial;
      for (const x of [box.min.x, box.max.x]) {
        for (const y of [box.min.y, box.max.y]) {
          for (const z of [box.min.z, box.max.z]) {
            corner.set(x, y, z);
            reach = Math.max(reach, Math.hypot(corner[cross[0]], corner[cross[1]]));
          }
        }
      }
      const positions = mesh.geometry?.getAttribute?.("position");
      let rimSum = 0;
      let rimPeak = 0;
      let rimCount = 0;
      if (positions) {
        const step = Math.max(1, Math.floor(positions.count / 48));
        for (let index = 0; index < positions.count; index += step) {
          point.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
          const radius = Math.hypot(point[cross[0]], point[cross[1]]);
          rimSum += radius;
          rimPeak = Math.max(rimPeak, radius);
          rimCount += 1;
        }
      }
      samples.push({
        mesh,
        t: (center[axis] - bounds.min[axis]) / axisSpan,
        radial,
        reach,
        box: box.getSize(new THREE.Vector3()).length(),
        axialRatio: (box.max[axis] - box.min[axis]) / axisSpan,
        rimRatio: rimPeak > 0.0001 && rimCount > 0 ? rimSum / rimCount / rimPeak : 0,
        vertices: positions?.count ?? 0,
      });
    });
    const mean = (list: typeof samples) => list.reduce((sum, item) => sum + item.radial, 0) / Math.max(list.length, 1);
    const flip = mean(samples.filter((item) => item.t > 0.78)) > mean(samples.filter((item) => item.t < 0.22));
    const radialLimit = samples.reduce((max, item) => Math.max(max, item.radial), 0.001);
    const reachLimit = samples.reduce((max, item) => Math.max(max, item.reach), 0.001);
    const stations = assignStations(samples.map((item) => ({
      id: String(item.mesh.userData.partId),
      axial: flip ? 1 - item.t : item.t,
      radialRatio: item.radial / radialLimit,
      reachRatio: item.reach / reachLimit,
      boxRatio: item.box / axisSpan,
      axialRatio: item.axialRatio,
      rimRatio: item.rimRatio,
      vertices: item.vertices,
    })));
    for (const item of samples) {
      item.mesh.userData.station = stations.get(String(item.mesh.userData.partId)) || "";
    }
    for (const item of samples) {
      const t = flip ? 1 - item.t : item.t;
      let system = "LPT";
      if (t < 0.3) system = "FAN";
      else if (t < 0.46) system = "HPC";
      else if (t < 0.56) system = "COMB";
      else if (t < 0.68) system = "HPT";
      if (t > 0.22 && t < 0.5 && item.box < axisSpan * 0.16 && item.radial > radialLimit * 0.34) system = "AGB";
      item.mesh.userData.system = system;
    }
    return root;
  }, [gltf.scene]);

  useEffect(() => {
    const explicit = isolated.length > 0;
    const stationPick = stations.length > 0;
    const picking = explicit || stationPick;
    const shown: { id: string; station: string }[] = [];
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const id = String(mesh.userData.partId || "");
      const station = String(mesh.userData.station || "");
      const selected =
        (explicit && isolated.includes(id)) ||
        (stationPick && stations.some((item) => stationMatches(station, item)));
      const active = !picking || selected;
      mesh.visible = true;
      mesh.userData.active = Boolean(picking && selected);
      mesh.renderOrder = picking && selected ? 2 : 0;
      if (picking && selected) shown.push({ id, station });
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of mats) {
        const standard = material as THREE.MeshStandardMaterial;
        if (!standard.emissive) continue;
        if (standard.userData.baseEmissive == null) standard.userData.baseEmissive = standard.emissive.getHex();
        if (standard.userData.baseIntensity == null) standard.userData.baseIntensity = standard.emissiveIntensity;
        if (typeof standard.userData.baseOpacity !== "number") {
          standard.userData.baseOpacity = standard.opacity;
          standard.userData.baseTransparent = standard.transparent;
          standard.userData.baseDepthWrite = standard.depthWrite;
        }
        const faded = picking && !selected;
        standard.transparent = faded ? true : Boolean(standard.userData.baseTransparent);
        standard.opacity = faded ? 0.16 : Number(standard.userData.baseOpacity);
        standard.depthWrite = faded ? false : Boolean(standard.userData.baseDepthWrite);
        standard.emissive.setHex(picking && selected ? 0xd0892a : standard.userData.baseEmissive);
        standard.emissiveIntensity = picking && selected ? 0.55 : standard.userData.baseIntensity;
        standard.needsUpdate = true;
      }
    });
    onShown(shown);
  }, [isolated, stations, scene, onShown]);

  return (
    <primitive
      object={scene}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        let current: THREE.Object3D | null = event.object;
        while (current && !current.userData.partId) current = current.parent;
        if (!current?.userData.partId) return;
        onSelect(String(current.userData.partId), event.nativeEvent.shiftKey, String(current.userData.system || "FAN"), String(current.userData.station || ""));
      }}
    />
  );
}

function Frame({ focus }: { focus: string }) {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const controls = useThree((state) => state.controls) as { target: THREE.Vector3; update: () => void; enableDamping: boolean } | null;
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!controls) return;
      const box = new THREE.Box3();
      let picked = false;
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.userData.active) picked = true;
      });
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || !mesh.userData.partId) return;
        if (picked && !mesh.userData.active) return;
        box.expandByObject(mesh);
      });
      if (box.isEmpty()) return;
      const center = box.getCenter(new THREE.Vector3());
      const radius = Math.max(box.getSize(new THREE.Vector3()).length() * 0.45, 0.4);
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      const dist = radius / Math.sin(fov / 2);
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      camera.position.copy(center).add(new THREE.Vector3(0.85, 0.35, 0.7).normalize().multiplyScalar(dist));
      const perspective = camera as THREE.PerspectiveCamera;
      perspective.near = Math.max(0.01, dist / 100);
      perspective.far = Math.max(50, dist * 20);
      perspective.updateProjectionMatrix();
      controls.target.copy(center);
      controls.update();
      controls.enableDamping = damping;
    });
    return () => cancelAnimationFrame(frame);
  }, [focus, camera, scene, controls]);
  return null;
}

function Dolly({ zoom }: { zoom: number }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as { target: THREE.Vector3 } | null;
  const previous = useRef(zoom);
  useEffect(() => {
    if (!controls || zoom === previous.current) return;
    const inward = zoom > previous.current;
    previous.current = zoom;
    const offset = camera.position.clone().sub(controls.target);
    const next = offset.multiplyScalar(inward ? 0.78 : 1.28);
    const length = next.length();
    if (length < 0.25 || length > 15) return;
    camera.position.copy(controls.target).add(next);
  }, [zoom, camera, controls]);
  return null;
}

function StudioEnvironment() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = environment;
    return () => {
      scene.environment = null;
      environment.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

class ModelError extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function SuppliedEngine({
  isolated,
  stations = [],
  frameKey = 0,
  zoom = 0,
  onSelect,
  onShown,
  fallback,
}: {
  isolated: string[];
  stations?: string[];
  frameKey?: number;
  zoom?: number;
  onSelect: (code: string, shift: boolean, system: string, station: string) => void;
  onShown: (rows: { id: string; station: string }[]) => void;
  fallback: ReactNode;
}) {
  return (
    <ModelError fallback={fallback}>
      <Canvas camera={{ position: [4.2, 1.4, 3.2], fov: 32, near: 0.05, far: 80 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: false }} shadows onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.2; }}>
        <color attach="background" args={["#10202c"]} />
        <StudioEnvironment />
        <hemisphereLight args={["#f7fbff", "#243140", 1.15]} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 5]} intensity={2.4} color={"#fff6ea"} castShadow />
        <directionalLight position={[-5, 2, -3]} intensity={1.1} color={"#d5e4f2"} />
        <directionalLight position={[0, 1.2, 6]} intensity={0.8} color={"#ffffff"} />
        <Suspense fallback={null}>
          <Model isolated={isolated} stations={stations} onSelect={onSelect} onShown={onShown} />
          <Frame focus={`${frameKey}|${isolated.join("|")}|${stations.join("|")}`} />
          <Dolly zoom={zoom} />
          <ContactShadows position={[0, -2.05, 0]} opacity={0.45} scale={12} blur={2.4} far={3} />
        </Suspense>
        <OrbitControls enableDamping makeDefault enablePan={false} minDistance={0.2} maxDistance={16} />
      </Canvas>
    </ModelError>
  );
}

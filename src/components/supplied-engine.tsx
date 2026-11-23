"use client";

import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export const SUPPLIED_MODEL = "/models/engine_cfm56-7b.glb";

function matches(partId: string, isolated: string[]) {
  const name = partId.toLowerCase();
  return isolated.some((token) => {
    const needle = token.toLowerCase();
    return name === needle || name.includes(needle);
  });
}

function Model({ isolated, onSelect }: { isolated: string[]; onSelect: (code: string, shift: boolean) => void }) {
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
    return root;
  }, [gltf.scene]);

  useEffect(() => {
    let any = false;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && matches(String(mesh.userData.partId || ""), isolated)) any = true;
    });
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const id = String(mesh.userData.partId || "");
      const on = isolated.length === 0 || !any || matches(id, isolated);
      mesh.visible = on;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of mats) {
        const standard = material as THREE.MeshStandardMaterial;
        if (!standard.emissive) continue;
        if (standard.userData.baseEmissive == null) standard.userData.baseEmissive = standard.emissive.getHex();
        const active = isolated.length > 0 && any && matches(id, isolated);
        standard.emissive.setHex(active ? 0xb36a1c : standard.userData.baseEmissive);
      }
    });
  }, [isolated, scene]);

  return (
    <primitive
      object={scene}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        let current: THREE.Object3D | null = event.object;
        while (current && !current.userData.partId) current = current.parent;
        if (!current?.userData.partId) return;
        onSelect(String(current.userData.partId), event.nativeEvent.shiftKey);
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
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.visible) box.expandByObject(mesh);
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
  onSelect,
  fallback,
}: {
  isolated: string[];
  onSelect: (code: string, shift: boolean) => void;
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
          <Model isolated={isolated} onSelect={onSelect} />
          <Frame focus={isolated.join("|")} />
          <ContactShadows position={[0, -2.05, 0]} opacity={0.45} scale={12} blur={2.4} far={3} />
        </Suspense>
        <OrbitControls enableDamping makeDefault enablePan={false} minDistance={0.2} maxDistance={16} />
      </Canvas>
    </ModelError>
  );
}

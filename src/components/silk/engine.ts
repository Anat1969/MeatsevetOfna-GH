/**
 * Silk: a satin cloth rendered physically (sheen, anisotropy, studio environment), folding in a slow
 * breeze. The face takes the look's colour, the lining takes the collection's hidden colour, and it
 * shows when the cloth turns. Used live (cover, film) and as stills (fabric swatches until a photo exists).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type SilkOpts = { face: string; lining: string; seed?: number; calm?: number; gloss?: number };

const W = 12, H = 9, SX = 180, SY = 140;

function fold(x: number, y: number, t: number, seed: number, calm: number) {
  // long ridges, like satin hanging from one edge: the folds run mostly along one direction
  const s = seed * 1.7;
  const u = x * 0.92 + y * 0.38;
  const swell = 0.75 + 0.25 * Math.sin(y * 0.55 + t * 0.18 + s);
  const ridges = 0.55 * Math.sin(u * 1.05 + t * 0.24 + s) + 0.26 * Math.sin(u * 2.2 - t * 0.37 + y * 0.28 + s * 2) + 0.09 * calm * Math.sin(u * 4.3 + y * 0.7 + t * 0.66);
  const cross = 0.16 * Math.sin(y * 1.2 + x * 0.18 + t * 0.29 + s);
  return ridges * swell + cross - 0.035 * y * y;
}

export class Silk {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  geo = new THREE.PlaneGeometry(W, H, SX, SY);
  base: Float32Array;
  face: THREE.MeshPhysicalMaterial;
  back: THREE.MeshPhysicalMaterial;
  group = new THREE.Group();
  pointer = new THREE.Vector2(9, 9);
  ripple = 0;
  seed: number; calm: number;
  raf = 0; t0 = performance.now();

  constructor(canvas: HTMLCanvasElement, o: SilkOpts) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
    this.scene.environmentIntensity = 0.38;
    this.seed = o.seed ?? 0; this.calm = o.calm ?? 1;
    const common = { roughness: 0.38, metalness: 0, sheen: 0.8, sheenRoughness: 0.35, anisotropy: 0.85, anisotropyRotation: 0.4, clearcoat: 0.25, clearcoatRoughness: 0.3 };
    this.face = new THREE.MeshPhysicalMaterial({ ...common, side: THREE.FrontSide });
    this.back = new THREE.MeshPhysicalMaterial({ ...common, side: THREE.BackSide });
    this.setColors(o.face, o.lining);
    this.setGloss(o.gloss ?? 0.6);
    this.group.add(new THREE.Mesh(this.geo, this.face), new THREE.Mesh(this.geo, this.back));
    this.group.rotation.set(-0.35, 0.12, -0.18);
    this.scene.add(this.group);
    const key = new THREE.DirectionalLight(0xfff4e6, 2.6); key.position.set(6, 1.6, 2.4);
    const rim = new THREE.DirectionalLight(0xe8eeff, 1.1); rim.position.set(-5, 2, -3);
    this.scene.add(key, rim, new THREE.HemisphereLight(0xffffff, 0xb8ab9a, 0.35));
    this.camera.position.set(0, 0, 7.5);
    this.base = Float32Array.from(this.geo.attributes.position.array as Float32Array);
    this.shape(0);
  }

  /** 0 = matte linen, 1 = high satin. */
  setGloss(g: number) {
    for (const m of [this.face, this.back]) { m.roughness = 0.62 - 0.42 * g; m.clearcoat = 0.05 + 0.5 * g; m.sheen = 0.5 + 0.5 * g; m.sheenRoughness = 0.55 - 0.35 * g; m.anisotropy = 0.4 + 0.55 * g; }
  }
  setColors(face: string, lining: string) {
    const f = new THREE.Color(face), l = new THREE.Color(lining);
    this.face.color = f; this.face.sheenColor = f.clone().lerp(new THREE.Color('#ffffff'), 0.55);
    this.back.color = l; this.back.sheenColor = l.clone().lerp(new THREE.Color('#ffffff'), 0.35);
  }

  shape(t: number) {
    const p = this.geo.attributes.position as THREE.BufferAttribute;
    const a = p.array as Float32Array;
    for (let i = 0; i < a.length; i += 3) {
      const x = this.base[i], y = this.base[i + 1];
      let z = fold(x, y, t, this.seed, this.calm);
      if (this.ripple > 0.001) {
        const dx = x - this.pointer.x, dy = y - this.pointer.y, d = Math.sqrt(dx * dx + dy * dy);
        z += this.ripple * 0.35 * Math.exp(-d * d * 0.9) * Math.sin(d * 4 - t * 5);
      }
      a[i] = x + 0.1 * Math.sin(y * 0.9 + t * 0.35 + this.seed);
      a[i + 2] = z;
    }
    p.needsUpdate = true;
    this.geo.computeVertexNormals();
  }

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep the cloth filling the frame on any proportion
    this.camera.position.z = w / h < 1 ? Math.min(11, 7.5 / (w / h) * 0.85) : 7.5;
    this.camera.updateProjectionMatrix();
  }

  frame(t: number) { this.shape(t); this.renderer.render(this.scene, this.camera); }

  start() {
    const tick = () => {
      const t = (performance.now() - this.t0) / 1000;
      this.ripple *= 0.985;
      this.frame(t + this.seed * 10);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  poke(nx: number, ny: number) { this.pointer.set(nx * W * 0.5, ny * H * 0.5); this.ripple = Math.min(1, this.ripple + 0.08); }
  stop() { cancelAnimationFrame(this.raf); }
  dispose() { this.stop(); this.geo.dispose(); this.face.dispose(); this.back.dispose(); this.renderer.dispose(); }
}

/** Stills: one shared offscreen renderer, cached by colour pair and seed. */
const cache = new Map<string, string>();
let still: Silk | null = null;
let queue = Promise.resolve();
export function silkStill(o: SilkOpts & { size?: number }): Promise<string> {
  const key = `${o.face}|${o.lining}|${o.seed ?? 0}|${o.gloss ?? 0.6}`;
  const hit = cache.get(key); if (hit) return Promise.resolve(hit);
  const job = queue.then(() => {
    const hit2 = cache.get(key); if (hit2) return hit2;
    try {
      if (!still) { const c = document.createElement('canvas'); still = new Silk(c, o); }
      still.seed = o.seed ?? 0; still.setColors(o.face, o.lining); still.setGloss(o.gloss ?? 0.6);
      const size = o.size ?? 720; still.resize(size, size);
      still.frame(3 + (o.seed ?? 0) * 7);
      const url = still.renderer.domElement.toDataURL('image/jpeg', 0.9);
      cache.set(key, url); return url;
    } catch { return ''; }
  });
  queue = job.then(() => undefined);
  return job;
}

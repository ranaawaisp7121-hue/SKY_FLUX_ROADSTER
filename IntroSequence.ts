// ═══════════════════════════════════════════
//  Intro Sequence — Cinematic camera animation
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { CarParts } from './CarModel';

export class IntroSequence {
  private camera: THREE.PerspectiveCamera;
  private carParts: CarParts;
  private elapsed = 0;
  private duration = 7.5;
  private done = false;
  private onComplete: () => void;
  private rampGroup: THREE.Group | null = null;

  // Cinematic keyframes
  private keyframes = [
    { t: 0,   camPos: new THREE.Vector3(25, 3, -20), carZ: -30, carY: 0.45 },
    { t: 1.5, camPos: new THREE.Vector3(15, 4, -10), carZ: -20, carY: 0.45 },
    { t: 3.0, camPos: new THREE.Vector3( 5, 5,   0), carZ: -10, carY: 0.45 },
    { t: 4.0, camPos: new THREE.Vector3(-3, 6,   8), carZ:  -5, carY: 2.0  },
    { t: 5.0, camPos: new THREE.Vector3(-5, 8,  15), carZ:   2, carY: 5.0  },
    { t: 6.0, camPos: new THREE.Vector3( 5, 6,  18), carZ:   5, carY: 3.0  },
    { t: 7.5, camPos: new THREE.Vector3( 0, 4.5, 10), carZ:  0, carY: 0.45 },
  ];

  constructor(
    camera: THREE.PerspectiveCamera,
    carParts: CarParts,
    onComplete: () => void,
  ) {
    this.camera = camera;
    this.carParts = carParts;
    this.onComplete = onComplete;
  }

  setRamp(ramp: THREE.Group): void {
    this.rampGroup = ramp;
  }

  skip(): void {
    if (!this.done) {
      this.done = true;
      this.onComplete();
    }
  }

  get isComplete(): boolean { return this.done; }

  update(dt: number): void {
    if (this.done) return;
    this.elapsed += dt;

    const t = Math.min(this.elapsed, this.duration);
    const progress = t / this.duration;

    // Interpolate keyframe data
    const kf = this.keyframes;
    let kfIdx = 0;
    for (let i = 0; i < kf.length - 1; i++) {
      if (t >= kf[i].t && t < kf[i + 1].t) { kfIdx = i; break; }
    }
    if (t >= kf[kf.length - 1].t) kfIdx = kf.length - 2;

    const a = kf[kfIdx];
    const b = kf[kfIdx + 1] ?? kf[kfIdx];
    const span = b.t - a.t;
    const local = span > 0 ? (t - a.t) / span : 1;
    const ease = easeInOut(local);

    // Camera position
    const camPos = a.camPos.clone().lerp(b.camPos, ease);
    this.camera.position.copy(camPos);

    // Car position
    const carZ = lerp(a.carZ, b.carZ, ease);
    const carY = lerp(a.carY, b.carY, ease);
    this.carParts.root.position.set(0, carY, carZ);

    // Car rotation during flight
    if (t > 4.0 && t < 6.0) {
      const flipT = (t - 4.0) / 2.0;
      this.carParts.root.rotation.x = flipT * Math.PI * 2;
    } else {
      this.carParts.root.rotation.x = 0;
    }

    // Camera always looks at car
    const lookAt = new THREE.Vector3(
      this.carParts.root.position.x,
      this.carParts.root.position.y + 1,
      this.carParts.root.position.z,
    );
    this.camera.lookAt(lookAt);

    // Thruster effect in air
    const inAir = carY > 1;
    const mat = this.carParts.thrusterParticles.material as THREE.PointsMaterial;
    mat.opacity = inAir ? 0.8 : 0.2;

    // Intro complete
    if (t >= this.duration || progress >= 1) {
      this.done = true;
      this.carParts.root.rotation.x = 0;
      this.onComplete();
    }
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

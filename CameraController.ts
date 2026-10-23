// ═══════════════════════════════════════════
//  Camera Controller — Follow with damping
// ═══════════════════════════════════════════

import * as THREE from 'three';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private targetPos = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private shakeMag = 0;
  private shakeDecay = 8;
  private mode: 'follow' | 'intro' | 'crash' = 'follow';

  // Follow offsets
  private offsetX = 0;
  private offsetY = 4.5;
  private offsetZ = 10;
  private lookAheadZ = -6;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  setMode(mode: 'follow' | 'intro' | 'crash'): void {
    this.mode = mode;
  }

  shake(magnitude: number): void {
    this.shakeMag = magnitude;
  }

  update(dt: number, carPos: THREE.Vector3, speed: number): void {
    if (this.mode === 'intro') return; // intro handles its own camera

    const speedFactor = Math.min(1, (speed - 18) / 40);
    const dynamicOffsetZ = this.offsetZ + speedFactor * 2;
    const dynamicOffsetY = this.offsetY - speedFactor * 0.5;
    const fov = 55 + speedFactor * 12;

    if (Math.abs(this.camera.fov - fov) > 0.5) {
      this.camera.fov += (fov - this.camera.fov) * 3 * dt;
      this.camera.updateProjectionMatrix();
    }

    this.targetPos.set(
      carPos.x * 0.3,
      carPos.y + dynamicOffsetY,
      carPos.z + dynamicOffsetZ,
    );

    this.targetLookAt.set(
      carPos.x * 0.5,
      carPos.y + 1.2,
      carPos.z + this.lookAheadZ,
    );

    const lerpFactor = this.mode === 'crash' ? 2 : 5;
    this.camera.position.lerp(this.targetPos, lerpFactor * dt);
    this.currentLookAt.lerp(this.targetLookAt, lerpFactor * dt);
    this.camera.lookAt(this.currentLookAt);

    // Camera shake
    if (this.shakeMag > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeMag;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeMag * 0.5;
      this.shakeMag *= 1 - this.shakeDecay * dt;
    }
  }

  teleportTo(pos: THREE.Vector3, lookAt: THREE.Vector3): void {
    this.camera.position.copy(pos);
    this.currentLookAt.copy(lookAt);
    this.camera.lookAt(lookAt);
  }

  get instance(): THREE.PerspectiveCamera { return this.camera; }
}

// ═══════════════════════════════════════════
//  Track Manager — Endless scrolling road
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { buildRoad, buildRamp } from './SceneBuilder';
import { TRACK_SEGMENT_LENGTH, TRACK_VISIBLE_SEGMENTS } from './types';
import { GraphicsQuality } from './types';

export class TrackManager {
  private scene: THREE.Scene;
  private quality: GraphicsQuality;
  private segments: Array<{ group: THREE.Group; z: number }> = [];
  private ramp: THREE.Group | null = null;
  private rampAdded = false;

  constructor(scene: THREE.Scene, quality: GraphicsQuality) {
    this.scene = scene;
    this.quality = quality;
  }

  init(): void {
    // Spawn initial segments
    for (let i = 0; i < TRACK_VISIBLE_SEGMENTS; i++) {
      this.addSegment(-i * TRACK_SEGMENT_LENGTH);
    }

    // Add intro ramp
    this.ramp = buildRamp();
    this.ramp.position.set(0, 0, -60);
    this.ramp.rotation.y = -Math.PI / 2; // face forward
    this.scene.add(this.ramp);
    this.rampAdded = true;
  }

  getRamp(): THREE.Group | null { return this.ramp; }

  update(cameraZ: number): void {
    // Recycle segments that have scrolled past the camera
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      if (seg.z > cameraZ + TRACK_SEGMENT_LENGTH * 2) {
        // Move it far ahead
        const minZ = Math.min(...this.segments.map(s => s.z));
        seg.z = minZ - TRACK_SEGMENT_LENGTH;
        seg.group.position.z = seg.z;
      }
    }
  }

  private addSegment(z: number): void {
    const group = buildRoad(this.quality);
    group.position.z = z + TRACK_SEGMENT_LENGTH / 2;
    this.scene.add(group);
    this.segments.push({ group, z: z + TRACK_SEGMENT_LENGTH / 2 });
  }

  reset(): void {
    for (const seg of this.segments) {
      this.scene.remove(seg.group);
    }
    this.segments = [];
    if (this.ramp) {
      this.scene.remove(this.ramp);
      this.ramp = null;
      this.rampAdded = false;
    }
    this.init();
  }
}

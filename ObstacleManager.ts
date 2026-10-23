// ═══════════════════════════════════════════
//  Obstacle & Collectible Manager
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { LANE_POSITIONS, Lane, NEAR_MISS_THRESHOLD } from './types';

export enum ObstacleType {
  BARRIER = 'barrier',
  VEHICLE = 'vehicle',
  ENERGY_GATE = 'gate',
  GAP = 'gap',
  LOW_BRIDGE = 'bridge',
}

export interface ObstacleData {
  mesh: THREE.Group;
  type: ObstacleType;
  lane: Lane;
  z: number;
  width: number;
  height: number;
  passed: boolean;
  isGap: boolean;
  speed: number;
}

export interface CollectibleData {
  mesh: THREE.Mesh;
  lane: Lane;
  z: number;
  collected: boolean;
  phase: number;
}

// ─── Shared Materials ─────────────────────────────────────────
const mBarrier = new THREE.MeshStandardMaterial({
  color: 0xcc2200, metalness: 0.3, roughness: 0.5,
  emissive: 0x440000, emissiveIntensity: 0.5,
});
const mBarrierStripe = new THREE.MeshStandardMaterial({
  color: 0xffffff, emissive: 0xcccccc, emissiveIntensity: 0.3,
});
const mVehicleBody = new THREE.MeshStandardMaterial({
  color: 0x003344, metalness: 0.7, roughness: 0.25,
  emissive: 0x001122, emissiveIntensity: 0.2,
});
const mGate = new THREE.MeshStandardMaterial({
  color: 0x00e5ff, emissive: 0x009999, emissiveIntensity: 1.0,
  transparent: true, opacity: 0.7,
  side: THREE.DoubleSide,
});
const mOrb = new THREE.MeshStandardMaterial({
  color: 0xffd740, emissive: 0xffaa00, emissiveIntensity: 1.5,
});

export class ObstacleManager {
  private scene: THREE.Scene;
  private obstacles: ObstacleData[] = [];
  private collectibles: CollectibleData[] = [];
  private geoBarrier = new THREE.BoxGeometry(1.5, 0.9, 0.6);
  private geoCar = new THREE.BoxGeometry(1.6, 0.7, 3.0);
  private geoOrb = new THREE.SphereGeometry(0.28, 10, 8);
  private geoGate = new THREE.TorusGeometry(1.4, 0.08, 8, 24);
  private quality: string;
  private rng: () => number;
  private lastSpawnZ = 0;
  private spawnInterval = 20;
  private difficulty = 0;

  constructor(scene: THREE.Scene, quality: string) {
    this.scene = scene;
    this.quality = quality;
    this.rng = this.makeMutableRng();
  }

  private makeMutableRng(): () => number {
    let seed = Date.now() | 0;
    return (): number => {
      seed ^= seed << 13;
      seed ^= seed >> 17;
      seed ^= seed << 5;
      return ((seed >>> 0) / 4294967296);
    };
  }

  setDifficulty(d: number): void {
    this.difficulty = Math.min(d, 1);
    this.spawnInterval = Math.max(12, 22 - d * 12);
  }

  update(dt: number, cameraZ: number, carX: number, carY: number, carZ: number): {
    hit: boolean;
    nearMiss: boolean;
    orbCollected: boolean;
    gateScore: number;
    fellInGap: boolean;
  } {
    let hit = false;
    let nearMiss = false;
    let orbCollected = false;
    let gateScore = 0;
    let fellInGap = false;

    // Spawn new obstacles
    const spawnZ = cameraZ - 120;
    if (spawnZ < this.lastSpawnZ - this.spawnInterval) {
      this.spawnObstacle(spawnZ);
      this.spawnInterval = Math.max(12, 22 - this.difficulty * 10) + (this.rng() - 0.5) * 6;
      this.lastSpawnZ = spawnZ;

      // Occasionally spawn collectibles
      if (this.rng() > 0.3) {
        this.spawnCollectible(spawnZ - 5 - this.rng() * 8);
      }
    }

    const CAR_HALF_W = 0.75;
    const CAR_HALF_H = 0.5;
    const CAR_HALF_D = 1.8;

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      // Move lateral obstacles
      if (obs.speed !== 0) {
        obs.mesh.position.x += obs.speed * dt;
        if (Math.abs(obs.mesh.position.x) > 9) obs.speed *= -1;
      }

      // Check if past player
      if (!obs.passed && obs.z > carZ + 3) {
        obs.passed = true;
      }

      // Collision detection (AABB)
      if (!obs.passed && !obs.isGap) {
        const dx = Math.abs(obs.mesh.position.x - carX);
        const dz = Math.abs(obs.z - carZ);
        const halfW = obs.width / 2 + CAR_HALF_W;
        const halfD = CAR_HALF_D;

        if (dx < halfW && dz < halfD) {
          if (obs.type === ObstacleType.ENERGY_GATE) {
            if (!obs.passed) { gateScore += 30; obs.passed = true; }
          } else if (obs.type !== ObstacleType.LOW_BRIDGE || carY < 1.2) {
            hit = true;
          }
        } else if (dx < halfW + NEAR_MISS_THRESHOLD && dz < halfD + 0.5) {
          if (!obs.passed) nearMiss = true;
        }
      }

      // Gap detection — player must have jumped over
      if (obs.isGap && !obs.passed) {
        const dz = Math.abs(obs.z - carZ);
        if (dz < 4 && carY < 0.6) {
          fellInGap = true;
        }
      }

      // Recycle far behind
      if (obs.z > cameraZ + 30) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }

    // Update collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      if (c.collected) {
        this.scene.remove(c.mesh);
        this.collectibles.splice(i, 1);
        continue;
      }

      // Animate
      c.phase += dt * 2.5;
      c.mesh.position.y = 0.9 + Math.sin(c.phase) * 0.15;
      c.mesh.rotation.y += dt * 2;

      // Collect check
      const dx = Math.abs(c.mesh.position.x - carX);
      const dz = Math.abs(c.z - carZ);
      if (dx < 1.2 && dz < 1.5) {
        c.collected = true;
        orbCollected = true;
      }

      // Recycle
      if (c.z > cameraZ + 20) {
        this.scene.remove(c.mesh);
        this.collectibles.splice(i, 1);
      }
    }

    return { hit, nearMiss, orbCollected, gateScore, fellInGap };
  }

  private spawnObstacle(z: number): void {
    const roll = this.rng();
    let type: ObstacleType;

    if (roll < 0.35) type = ObstacleType.BARRIER;
    else if (roll < 0.55) type = ObstacleType.VEHICLE;
    else if (roll < 0.70) type = ObstacleType.ENERGY_GATE;
    else if (roll < 0.85) type = ObstacleType.LOW_BRIDGE;
    else type = ObstacleType.GAP;

    // Decide lane coverage (avoid unavoidable)
    const blockedLanes = this.pickBlockedLanes(type);
    if (blockedLanes.length === 3) return; // safety: never block all

    for (const lane of blockedLanes) {
      this.createObstacleMesh(type, lane, z);
    }
  }

  private pickBlockedLanes(type: ObstacleType): Lane[] {
    const all: Lane[] = [Lane.LEFT, Lane.CENTER, Lane.RIGHT];
    const r = this.rng();

    if (type === ObstacleType.LOW_BRIDGE) {
      // Block all but leave gaps flyable
      return [Lane.LEFT, Lane.CENTER, Lane.RIGHT];
    }

    if (r < 0.35) return [Lane.CENTER];
    if (r < 0.55) {
      const side = this.rng() > 0.5 ? Lane.LEFT : Lane.RIGHT;
      return [side, Lane.CENTER];
    }
    if (r < 0.75) {
      const skip = all[Math.floor(this.rng() * 3)];
      return all.filter(l => l !== skip);
    }
    return [all[Math.floor(this.rng() * 3)]];
  }

  private createObstacleMesh(type: ObstacleType, lane: Lane, z: number): void {
    const group = new THREE.Group();
    let width = 1.5;
    let height = 0.9;
    let isGap = false;
    let moveSpeed = 0;

    switch (type) {
      case ObstacleType.BARRIER: {
        const body = new THREE.Mesh(this.geoBarrier, mBarrier);
        body.castShadow = true;
        body.position.y = 0.45;
        group.add(body);
        // Stripes
        for (let s = -1; s <= 1; s += 1) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.9, 0.08), mBarrierStripe,
          );
          stripe.position.set(s * 0.55, 0.45, 0.32);
          group.add(stripe);
        }
        width = 1.5; height = 0.9;
        break;
      }

      case ObstacleType.VEHICLE: {
        const body = new THREE.Mesh(this.geoCar, mVehicleBody);
        body.position.y = 0.5;
        body.castShadow = true;
        group.add(body);
        // Lights
        [[-0.65, 0.5, 1.52], [0.65, 0.5, 1.52]].forEach(([x, y, fz]) => {
          const l = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.1, 0.05),
            new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffaa00, emissiveIntensity: 2 }),
          );
          l.position.set(x, y, fz);
          group.add(l);
        });
        width = 1.8; height = 1.1;
        // Slow lateral drift
        moveSpeed = (this.rng() - 0.5) * 1.5 * this.difficulty;
        break;
      }

      case ObstacleType.ENERGY_GATE: {
        const ring = new THREE.Mesh(this.geoGate, mGate);
        ring.position.y = 1.5;
        ring.rotation.y = Math.PI / 2;
        group.add(ring);
        // Inner glow
        const inner = new THREE.Mesh(
          new THREE.CircleGeometry(1.3, 20),
          new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide }),
        );
        inner.position.y = 1.5;
        inner.rotation.y = Math.PI / 2;
        group.add(inner);
        // Point light
        const pl = new THREE.PointLight(0x00e5ff, 0.8, 8);
        pl.position.y = 1.5;
        group.add(pl);
        width = 0; height = 3; // gates are safe to pass through
        break;
      }

      case ObstacleType.LOW_BRIDGE: {
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(LANE_POSITIONS[Lane.RIGHT] * 2 + 4, 0.4, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x0a1628, metalness: 0.7, roughness: 0.3 }),
        );
        beam.position.y = 1.6;
        beam.castShadow = true;
        group.add(beam);
        // Support columns
        [-4.5, 4.5].forEach(x => {
          const col = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 1.8, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x0d2040, metalness: 0.5 }),
          );
          col.position.set(x, 0.9, 0);
          group.add(col);
        });
        // Glow strip under beam
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(LANE_POSITIONS[Lane.RIGHT] * 2 + 4, 0.05, 1.4),
          new THREE.MeshStandardMaterial({ color: 0xff6d00, emissive: 0xff4400, emissiveIntensity: 1.5 }),
        );
        strip.position.y = 1.4;
        group.add(strip);
        width = 9; height = 1.4; // triggers only if car is not flying
        break;
      }

      case ObstacleType.GAP: {
        isGap = true;
        // Just a visual marker (the ground gap effect is handled by GameStateManager)
        const marker = new THREE.Mesh(
          new THREE.PlaneGeometry(LANE_POSITIONS[Lane.RIGHT] * 2 + 4, 8),
          new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }),
        );
        marker.rotation.x = -Math.PI / 2;
        marker.position.y = -0.01;
        group.add(marker);
        // Edge glow
        [0, 8].forEach(dz => {
          const edge = new THREE.Mesh(
            new THREE.BoxGeometry(LANE_POSITIONS[Lane.RIGHT] * 2 + 4, 0.08, 0.15),
            new THREE.MeshStandardMaterial({ color: 0xff6d00, emissive: 0xff4400, emissiveIntensity: 2 }),
          );
          edge.position.set(0, 0.02, -4 + dz);
          group.add(edge);
        });
        width = 9; height = 0; isGap = true;
        break;
      }
    }

    group.position.set(LANE_POSITIONS[lane], 0, z);
    if (type === ObstacleType.LOW_BRIDGE) {
      group.position.x = 0; // bridge spans all lanes
    }
    if (type === ObstacleType.ENERGY_GATE) {
      group.position.x = LANE_POSITIONS[lane];
    }

    this.scene.add(group);
    this.obstacles.push({
      mesh: group,
      type,
      lane,
      z,
      width,
      height,
      passed: false,
      isGap,
      speed: moveSpeed,
    });
  }

  private spawnCollectible(z: number): void {
    const lane: Lane = [Lane.LEFT, Lane.CENTER, Lane.RIGHT][Math.floor(this.rng() * 3)];
    const mesh = new THREE.Mesh(this.geoOrb, mOrb);
    mesh.position.set(LANE_POSITIONS[lane], 0.9, z);
    mesh.castShadow = false;

    // Glow
    if (this.quality !== 'low') {
      const light = new THREE.PointLight(0xffd740, 0.6, 4);
      mesh.add(light);
    }

    this.scene.add(mesh);
    this.collectibles.push({ mesh, lane, z, collected: false, phase: Math.random() * Math.PI * 2 });
  }

  reset(): void {
    for (const obs of this.obstacles) this.scene.remove(obs.mesh);
    for (const c of this.collectibles) this.scene.remove(c.mesh);
    this.obstacles = [];
    this.collectibles = [];
    this.lastSpawnZ = 0;
    this.difficulty = 0;
    this.spawnInterval = 20;
  }

  // Animate gate rings
  animateGates(dt: number): void {
    for (const obs of this.obstacles) {
      if (obs.type === ObstacleType.ENERGY_GATE) {
        obs.mesh.children[0].rotation.z += dt * 1.2;
      }
    }
  }
}

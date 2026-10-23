// ═══════════════════════════════════════════
//  Scene Builder — Track, Environment, Lighting
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { GraphicsQuality, LANE_WIDTH } from './types';

export interface TrackSegment {
  group: THREE.Group;
  z: number;
}

// ─── Materials (reused) ───────────────────────────────
const roadMat = new THREE.MeshStandardMaterial({
  color: 0x0a0d1a,
  roughness: 0.7,
  metalness: 0.1,
});

const barrierMat = new THREE.MeshStandardMaterial({
  color: 0x1a2a3a,
  metalness: 0.5,
  roughness: 0.4,
  emissive: 0x00e5ff,
  emissiveIntensity: 0.15,
});

const stripeMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 0.3,
});

const laneLineMat = new THREE.MeshStandardMaterial({
  color: 0x00e5ff,
  emissive: 0x00e5ff,
  emissiveIntensity: 0.8,
});

const buildingMats = [
  new THREE.MeshStandardMaterial({ color: 0x0a1628, metalness: 0.6, roughness: 0.5 }),
  new THREE.MeshStandardMaterial({ color: 0x0d1520, metalness: 0.5, roughness: 0.6 }),
  new THREE.MeshStandardMaterial({ color: 0x091422, metalness: 0.7, roughness: 0.4 }),
];

const windowMat = new THREE.MeshStandardMaterial({
  color: 0x00aaff, emissive: 0x003080, emissiveIntensity: 0.6,
  transparent: true, opacity: 0.8,
});

export function setupLighting(scene: THREE.Scene, quality: GraphicsQuality): void {
  // Ambient
  const ambient = new THREE.AmbientLight(0x080c20, 0.8);
  scene.add(ambient);

  // Main directional (moon/sun)
  const dirLight = new THREE.DirectionalLight(0x4060a0, 1.5);
  dirLight.position.set(20, 40, -10);
  if (quality !== GraphicsQuality.LOW) {
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(quality === GraphicsQuality.HIGH ? 2048 : 1024, quality === GraphicsQuality.HIGH ? 2048 : 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.bias = -0.001;
  }
  scene.add(dirLight);

  // Cyan fill
  const cyanFill = new THREE.DirectionalLight(0x00e5ff, 0.4);
  cyanFill.position.set(-10, 5, 10);
  scene.add(cyanFill);

  // Orange back
  const orangeBack = new THREE.DirectionalLight(0xff6d00, 0.3);
  orangeBack.position.set(0, 3, -15);
  scene.add(orangeBack);

  // Road strip lights (decorative)
  const stripColors = [0x00e5ff, 0x7b2fff, 0xff6d00];
  for (let i = 0; i < 3; i++) {
    const sl = new THREE.PointLight(stripColors[i], 0.6, 25);
    sl.position.set((i - 1) * 6, 0.5, -10 - i * 8);
    scene.add(sl);
  }
}

export function buildRoad(quality: GraphicsQuality): THREE.Group {
  const group = new THREE.Group();
  const roadWidth = LANE_WIDTH * 2 + LANE_WIDTH * 2; // 3 lanes + shoulders
  const segLen = 80;

  // Road surface
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(roadWidth, segLen, quality === 'high' ? 4 : 2, quality === 'high' ? 8 : 4),
    roadMat,
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  group.add(road);

  // Lane markers
  const dashLen = 3, dashGap = 4, totalLen = segLen;
  const dashCount = Math.floor(totalLen / (dashLen + dashGap));
  for (let lane = -1; lane <= 0; lane++) {
    const lx = (lane + 0.5) * LANE_WIDTH;
    for (let d = 0; d < dashCount; d++) {
      const dz = -totalLen / 2 + d * (dashLen + dashGap) + dashLen / 2;
      const dash = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, dashLen),
        laneLineMat,
      );
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(lx, 0.02, dz);
      group.add(dash);
    }
  }

  // Edge stripes
  [-roadWidth / 2, roadWidth / 2].forEach(x => {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.3, segLen), stripeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(x, 0.02, 0);
    group.add(edge);
  });

  // Roadside barriers
  const barrierGeo = new THREE.BoxGeometry(0.35, 0.55, segLen);
  [-roadWidth / 2 - 0.2, roadWidth / 2 + 0.2].forEach(x => {
    const b = new THREE.Mesh(barrierGeo, barrierMat);
    b.position.set(x, 0.28, 0);
    b.castShadow = true;
    group.add(b);

    // Barrier posts
    const postCount = 12;
    for (let i = 0; i < postCount; i++) {
      const pz = -segLen / 2 + (i + 0.5) * (segLen / postCount);
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.65, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x003050, metalness: 0.8, roughness: 0.2 }),
      );
      post.position.set(x, 0.33, pz);
      group.add(post);

      // Post light
      if (quality !== 'low' && i % 2 === 0) {
        const glow = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.04, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 2 }),
        );
        glow.position.set(x, 0.65, pz);
        group.add(glow);
      }
    }
  });

  return group;
}

export function buildCityBackground(quality: GraphicsQuality): THREE.Group {
  const group = new THREE.Group();
  const rng = mulberry32(42);

  // Mountains in far background
  for (let i = 0; i < 8; i++) {
    const w = 40 + rng() * 60;
    const h = 20 + rng() * 40;
    const geo = new THREE.ConeGeometry(w * 0.5, h, quality === 'low' ? 4 : 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x05101e, roughness: 0.9, metalness: 0.0,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(
      -150 + rng() * 300,
      h * 0.5 - 2,
      -200 - rng() * 200,
    );
    group.add(m);
  }

  // City buildings — both sides
  const sides = [-1, 1];
  for (const side of sides) {
    const buildingCount = quality === 'low' ? 20 : quality === 'medium' ? 35 : 50;
    for (let i = 0; i < buildingCount; i++) {
      const w = 5 + rng() * 10;
      const h = 15 + rng() * 60;
      const d = 6 + rng() * 12;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = buildingMats[Math.floor(rng() * buildingMats.length)];
      const building = new THREE.Mesh(geo, mat);
      building.position.set(
        side * (18 + rng() * 60),
        h / 2,
        -80 - rng() * 300,
      );
      building.castShadow = quality !== 'low';
      group.add(building);

      // Windows
      if (quality !== 'low') {
        const rows = Math.floor(h / 4);
        const cols = Math.floor(w / 3);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (rng() > 0.4) {
              const win = new THREE.Mesh(
                new THREE.PlaneGeometry(0.6, 0.8),
                windowMat,
              );
              win.position.set(
                building.position.x - w / 2 + 1.5 + c * 3,
                4 + r * 4,
                building.position.z + d / 2 + 0.01,
              );
              group.add(win);
            }
          }
        }
      }

      // Roof decorations
      if (rng() > 0.5 && quality !== 'low') {
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.6, 3 + rng() * 5, 8),
          new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00c8ff, emissiveIntensity: 0.5 }),
        );
        tower.position.set(building.position.x, h + 2, building.position.z);
        group.add(tower);
      }
    }
  }

  // Distant city glow
  const glowGeo = new THREE.PlaneGeometry(500, 80);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x001840,
    transparent: true,
    opacity: 0.6,
    side: THREE.FrontSide,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.set(0, 30, -280);
  group.add(glow);

  // Fog ground plane
  const groundGeo = new THREE.PlaneGeometry(800, 800);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x020408, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  group.add(ground);

  // Stars / particles
  if (quality !== 'low') {
    const starCount = quality === 'high' ? 800 : 400;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (rng() - 0.5) * 600;
      starPos[i * 3 + 1] = 20 + rng() * 80;
      starPos[i * 3 + 2] = -50 - rng() * 400;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xaaddff, size: 0.4, sizeAttenuation: true }),
    );
    group.add(stars);
  }

  return group;
}

// Deterministic RNG for consistent scene generation
function mulberry32(seed: number): () => number {
  return (): number => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildRamp(): THREE.Group {
  const group = new THREE.Group();
  const segments = 24;
  const rampLength = 25;
  const rampHeight = 8;

  // Ramp surface using geometry
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * rampLength;
    const y = Math.sin(t * Math.PI * 0.6) * rampHeight;
    points.push(new THREE.Vector2(x, y));
  }

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (const p of points) shape.lineTo(p.x, p.y);
  shape.lineTo(rampLength, -0.5);
  shape.lineTo(0, -0.5);
  shape.lineTo(0, 0);

  const extSettings: THREE.ExtrudeGeometryOptions = {
    depth: LANE_WIDTH * 6,
    bevelEnabled: false,
  };
  const rampGeo = new THREE.ExtrudeGeometry(shape, extSettings);
  const rampMesh = new THREE.Mesh(
    rampGeo,
    new THREE.MeshStandardMaterial({
      color: 0x0d1530, metalness: 0.6, roughness: 0.3,
      emissive: 0x001040, emissiveIntensity: 0.3,
    }),
  );
  rampMesh.position.z = -LANE_WIDTH * 3;
  rampMesh.castShadow = true;
  rampMesh.receiveShadow = true;
  group.add(rampMesh);

  // Glowing edge strips on ramp
  for (let i = 0; i < segments; i++) {
    const t1 = i / segments;
    const t2 = (i + 1) / segments;
    const x1 = t1 * rampLength;
    const y1 = Math.sin(t1 * Math.PI * 0.6) * rampHeight;
    const x2 = t2 * rampLength;
    const y2 = Math.sin(t2 * Math.PI * 0.6) * rampHeight;

    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.05, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 2 }),
    );
    strip.position.set(x1 + (x2 - x1) / 2, y1 + (y2 - y1) / 2 + 0.03, LANE_WIDTH * 3 - 0.05);
    strip.rotation.z = angle;
    group.add(strip);
  }

  return group;
}

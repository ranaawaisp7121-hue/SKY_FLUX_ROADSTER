// ═══════════════════════════════════════════
//  Car Model Builder — Procedural Three.js geometry
// ═══════════════════════════════════════════

import * as THREE from 'three';

export interface CarParts {
  root: THREE.Group;
  body: THREE.Mesh;
  wheels: THREE.Mesh[];
  thrusters: THREE.Mesh[];
  engineGlow: THREE.PointLight;
  thrusterParticles: THREE.Points;
  suspensionGroups: THREE.Group[];
}

const MAT_BODY = new THREE.MeshStandardMaterial({
  color: 0x1a1a2e,
  metalness: 0.92,
  roughness: 0.12,
  envMapIntensity: 1.0,
});

const MAT_ACCENT = new THREE.MeshStandardMaterial({
  color: 0x00e5ff,
  metalness: 0.5,
  roughness: 0.2,
  emissive: 0x00c8e0,
  emissiveIntensity: 0.6,
});

const MAT_ORANGE = new THREE.MeshStandardMaterial({
  color: 0xff6d00,
  metalness: 0.3,
  roughness: 0.3,
  emissive: 0xff4500,
  emissiveIntensity: 0.8,
});

const MAT_GLASS = new THREE.MeshStandardMaterial({
  color: 0x003050,
  metalness: 0.1,
  roughness: 0.0,
  transparent: true,
  opacity: 0.6,
});

const MAT_RUBBER = new THREE.MeshStandardMaterial({
  color: 0x111111,
  metalness: 0.0,
  roughness: 0.9,
});

const MAT_WHEEL_RIM = new THREE.MeshStandardMaterial({
  color: 0x888888,
  metalness: 0.9,
  roughness: 0.15,
});

const MAT_THRUSTER = new THREE.MeshStandardMaterial({
  color: 0x222222,
  metalness: 0.8,
  roughness: 0.2,
});

export function buildCar(quality: string): CarParts {
  const root = new THREE.Group();

  // ── Body ──────────────────────────────────────
  const bodyGroup = new THREE.Group();

  // Main hull — low profile sports car shape
  const hullGeo = new THREE.BoxGeometry(1.8, 0.45, 4.0, 2, 1, 4);
  // Taper vertices for aerodynamic shape
  const pos = hullGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const y = pos.getY(i);
    // front taper
    if (z > 1.2) {
      const t = (z - 1.2) / 0.8;
      pos.setX(i, pos.getX(i) * (1 - t * 0.35));
      pos.setY(i, y - t * 0.08);
    }
    // rear taper
    if (z < -1.2) {
      const t = (-z - 1.2) / 0.8;
      pos.setX(i, pos.getX(i) * (1 - t * 0.2));
    }
  }
  pos.needsUpdate = true;
  hullGeo.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeo, MAT_BODY);
  hull.position.y = 0.2;
  hull.castShadow = true;
  hull.receiveShadow = true;
  bodyGroup.add(hull);

  // Cabin / cockpit
  const cabinGeo = new THREE.BoxGeometry(1.35, 0.38, 1.8, 2, 1, 2);
  const cabinPos = cabinGeo.attributes.position;
  for (let i = 0; i < cabinPos.count; i++) {
    const z = cabinPos.getZ(i);
    if (z > 0.5) {
      const t = (z - 0.5) / 0.4;
      cabinPos.setY(i, cabinPos.getY(i) - t * 0.12);
      cabinPos.setX(i, cabinPos.getX(i) * (1 - t * 0.2));
    }
    if (z < -0.5) {
      const t = (-z - 0.5) / 0.4;
      cabinPos.setY(i, cabinPos.getY(i) - t * 0.25);
    }
  }
  cabinPos.needsUpdate = true;
  cabinGeo.computeVertexNormals();
  const cabin = new THREE.Mesh(cabinGeo, MAT_GLASS);
  cabin.position.set(0, 0.57, 0.1);
  cabin.castShadow = true;
  bodyGroup.add(cabin);

  // Windshield frame
  const wsGeo = new THREE.BoxGeometry(1.25, 0.04, 0.6);
  const ws = new THREE.Mesh(wsGeo, MAT_ACCENT);
  ws.position.set(0, 0.74, 0.7);
  ws.rotation.x = -0.3;
  bodyGroup.add(ws);

  // Spoiler
  const spoilerBase = new THREE.BoxGeometry(0.08, 0.25, 0.04);
  [-0.55, 0.55].forEach(x => {
    const post = new THREE.Mesh(spoilerBase, MAT_BODY);
    post.position.set(x, 0.45, -1.9);
    bodyGroup.add(post);
  });
  const spoilerWing = new THREE.BoxGeometry(1.5, 0.04, 0.35);
  const wing = new THREE.Mesh(spoilerWing, MAT_BODY);
  wing.position.set(0, 0.7, -1.9);
  bodyGroup.add(wing);

  // Accent stripes
  const stripeGeo = new THREE.BoxGeometry(0.06, 0.03, 3.2);
  [-0.7, 0.7].forEach(x => {
    const stripe = new THREE.Mesh(stripeGeo, MAT_ACCENT);
    stripe.position.set(x, 0.44, 0);
    bodyGroup.add(stripe);
  });

  // Front splitter
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 0.3), MAT_ACCENT);
  splitter.position.set(0, 0.05, 2.1);
  bodyGroup.add(splitter);

  // Headlights
  const headlightGeo = new THREE.BoxGeometry(0.18, 0.08, 0.06);
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0x88ddff, emissiveIntensity: 2.0,
  });
  [-0.6, 0.6].forEach(x => {
    const hl = new THREE.Mesh(headlightGeo, headlightMat);
    hl.position.set(x, 0.25, 2.02);
    bodyGroup.add(hl);
  });

  // Tail lights
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff0000, emissive: 0xff2000, emissiveIntensity: 2.5,
  });
  [-0.55, 0.55].forEach(x => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.04), taillightMat);
    tl.position.set(x, 0.28, -2.02);
    bodyGroup.add(tl);
  });

  // Under-body glow strip
  const glowStrip = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.02, 3.6),
    new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.5 }),
  );
  glowStrip.position.set(0, -0.01, 0);
  bodyGroup.add(glowStrip);

  const body = hull; // reference for animation
  root.add(bodyGroup);

  // ── Wheels ──────────────────────────────────────
  const wheels: THREE.Mesh[] = [];
  const suspensionGroups: THREE.Group[] = [];
  const wheelPositions: Array<[number, number, number]> = [
    [-1.05, 0, 1.25],  // FL
    [ 1.05, 0, 1.25],  // FR
    [-1.05, 0, -1.25], // RL
    [ 1.05, 0, -1.25], // RR
  ];

  for (const [x, y, z] of wheelPositions) {
    const sg = new THREE.Group();
    sg.position.set(x, y, z);

    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.22, quality === 'low' ? 12 : 20),
      MAT_RUBBER,
    );
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    sg.add(tire);

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.24, quality === 'low' ? 8 : 16),
      MAT_WHEEL_RIM,
    );
    rim.rotation.z = Math.PI / 2;
    sg.add(rim);

    // Rim spokes
    if (quality !== 'low') {
      for (let s = 0; s < 5; s++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.04, 0.38),
          MAT_WHEEL_RIM,
        );
        spoke.rotation.z = Math.PI / 2;
        spoke.rotation.x = (s / 5) * Math.PI * 2;
        spoke.position.y = Math.sin((s / 5) * Math.PI * 2) * 0.1;
        spoke.position.z = Math.cos((s / 5) * Math.PI * 2) * 0.1;
        sg.add(spoke);
      }
    }

    wheels.push(tire);
    suspensionGroups.push(sg);
    root.add(sg);
  }

  // ── Thrusters ─────────────────────────────────────
  const thrusters: THREE.Mesh[] = [];
  const thrusterPositions: Array<[number, number, number]> = [
    [-0.55, 0.15, -2.05],
    [0.55, 0.15, -2.05],
  ];

  for (const [x, y, z] of thrusterPositions) {
    const t = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.35, 12),
      MAT_THRUSTER,
    );
    t.rotation.x = Math.PI / 2;
    t.position.set(x, y, z);
    bodyGroup.add(t);

    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.1, 0.38, 10),
      MAT_ORANGE,
    );
    inner.rotation.x = Math.PI / 2;
    inner.position.set(x, y, z);
    bodyGroup.add(inner);
    thrusters.push(inner);
  }

  // ── Engine glow light ─────────────────────────────
  const engineGlow = new THREE.PointLight(0x00e5ff, 0, 3);
  engineGlow.position.set(0, 0.2, -2.2);
  root.add(engineGlow);

  // ── Thruster particle system ──────────────────────
  const particleCount = quality === 'low' ? 60 : quality === 'medium' ? 120 : 200;
  const particleGeo = new THREE.BufferGeometry();
  const particlePos = new Float32Array(particleCount * 3);
  const particleAlpha = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    particlePos[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
    particlePos[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
    particlePos[i * 3 + 2] = -2.1 - Math.random() * 1.5;
    particleAlpha[i] = Math.random();
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
  particleGeo.setAttribute('alpha', new THREE.BufferAttribute(particleAlpha, 1));

  const particleMat = new THREE.PointsMaterial({
    color: 0xff6d00,
    size: 0.1,
    transparent: true,
    opacity: 0.0,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const thrusterParticles = new THREE.Points(particleGeo, particleMat);
  root.add(thrusterParticles);

  return { root, body, wheels, thrusters, engineGlow, thrusterParticles, suspensionGroups };
}

export function updateCarVisuals(
  parts: CarParts,
  dt: number,
  speed: number,
  isBoosting: boolean,
  isFlying: boolean,
  targetLaneX: number,
  currentX: number,
): void {
  // Wheel spin
  const spinRate = (speed / 10) * dt;
  for (const w of parts.wheels) {
    w.rotation.y += spinRate;
  }

  // Thruster glow
  const thrusterIntensity = isBoosting ? 1.5 : isFlying ? 0.8 : 0.3;
  parts.engineGlow.intensity = thrusterIntensity;
  parts.engineGlow.color.setHex(isBoosting ? 0xff6d00 : 0x00e5ff);

  // Particle opacity
  const pMat = parts.thrusterParticles.material as THREE.PointsMaterial;
  pMat.opacity = isBoosting ? 0.85 : isFlying ? 0.5 : 0.2;
  pMat.color.setHex(isBoosting ? 0xff6d00 : 0x00aaff);

  // Animate particles
  const posAttr = parts.thrusterParticles.geometry.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const z = posAttr.getZ(i);
    posAttr.setZ(i, z - (speed * 0.05 + 0.3) * dt * 60);
    if (posAttr.getZ(i) < -4) {
      posAttr.setZ(i, -2.1);
      posAttr.setX(i, (Math.random() - 0.5) * 0.4);
      posAttr.setY(i, (Math.random() - 0.5) * 0.15);
    }
  }
  posAttr.needsUpdate = true;

  // Body lean on lane change
  const leanDir = targetLaneX - currentX;
  const targetLean = Math.max(-0.12, Math.min(0.12, leanDir * 0.04));
  parts.root.rotation.z += (targetLean - parts.root.rotation.z) * 5 * dt;
}

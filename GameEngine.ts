// ═══════════════════════════════════════════
//  Game Engine — Core render loop and state
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { GameState, GameSettings, GameStats, GraphicsQuality,
  SCORE_PER_METER, SCORE_PER_ORB, SCORE_NEAR_MISS, SCORE_FLIP,
  DIFFICULTY_RAMP_RATE, GROUND_Y } from './types';
import { InputManager } from './InputManager';
import { AudioManager } from './AudioManager';
import { PhysicsController } from './PhysicsController';
import { CameraController } from './CameraController';
import { ObstacleManager } from './ObstacleManager';
import { TrackManager } from './TrackManager';
import { HUDManager } from './HUDManager';
import { IntroSequence } from './IntroSequence';
import { buildCar, updateCarVisuals, CarParts } from './CarModel';
import { setupLighting, buildCityBackground } from './SceneBuilder';

export class GameEngine {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  private state: GameState = GameState.LOADING;
  private settings!: GameSettings;
  private stats: GameStats = { score: 0, distance: 0, speed: 0, orbs: 0, combo: 0, bestScore: 0 };

  private input!: InputManager;
  private audio!: AudioManager;
  private physics!: PhysicsController;
  private camCtrl!: CameraController;
  private obstacles!: ObstacleManager;
  private track!: TrackManager;
  private hud!: HUDManager;
  private intro!: IntroSequence;
  private carParts!: CarParts;

  private animId = 0;
  private lastTime = 0;
  private resizeObserver!: ResizeObserver;
  private pauseFromVisibility = false;
  private crashTimer = 0;
  private totalDistance = 0;
  private frameCount = 0;
  private fpsAccum = 0;
  private lastFps = 60;

  // Speed lines for immersion
  private speedLines!: THREE.Points;
  private speedLineActive = false;

  async init(settings: GameSettings, onProgress: (p: number, msg: string) => void): Promise<void> {
    this.settings = settings;

    onProgress(0.05, 'Creating renderer...');
    this.setupRenderer();

    onProgress(0.15, 'Building scene...');
    this.setupScene();

    onProgress(0.30, 'Loading car model...');
    this.carParts = buildCar(settings.quality);
    this.scene.add(this.carParts.root);
    this.carParts.root.position.y = GROUND_Y;

    onProgress(0.45, 'Generating track...');
    this.track = new TrackManager(this.scene, settings.quality as GraphicsQuality);
    this.track.init();

    onProgress(0.55, 'Building city...');
    const city = buildCityBackground(settings.quality as GraphicsQuality);
    this.scene.add(city);

    onProgress(0.65, 'Setting up physics...');
    this.physics = new PhysicsController();

    onProgress(0.72, 'Initializing input...');
    this.input = new InputManager();

    onProgress(0.78, 'Setting up audio...');
    this.audio = new AudioManager();
    this.audio.init(settings.volume, settings.soundEnabled);

    onProgress(0.82, 'Creating obstacles...');
    this.obstacles = new ObstacleManager(this.scene, settings.quality);

    onProgress(0.88, 'Setting up HUD...');
    this.hud = new HUDManager();

    onProgress(0.92, 'Setting up camera...');
    this.camCtrl = new CameraController(this.camera);

    onProgress(0.95, 'Finalizing...');
    this.setupSpeedLines();
    this.setupResizeObserver();
    this.setupVisibilityHandling();
    this.loadBestScore();

    onProgress(1.0, 'Ready!');
  }

  private setupRenderer(): void {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    // WebGL support check
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) {
      document.getElementById('webgl-fallback')?.classList.remove('hidden');
      throw new Error('WebGL not supported');
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.settings.quality !== 'low',
      powerPreference: 'high-performance',
    });

    const pixelRatio = Math.min(window.devicePixelRatio, this.settings.quality === 'low' ? 1 : this.settings.quality === 'medium' ? 1.5 : 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = this.settings.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 4.5, 10);
    this.camera.lookAt(0, 0, 0);
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000814);
    this.scene.fog = new THREE.FogExp2(0x000814, 0.008);
    setupLighting(this.scene, this.settings.quality as GraphicsQuality);
  }

  private setupSpeedLines(): void {
    const count = this.settings.quality === 'low' ? 80 : 160;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = Math.random() * 5;
      pos[i * 3 + 2] = -Math.random() * 30;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x00e5ff, size: 0.08, sizeAttenuation: true,
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.speedLines = new THREE.Points(geo, mat);
    this.scene.add(this.speedLines);
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(document.body);
    this.onResize();
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private setupVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === GameState.PLAYING) {
        this.pauseFromVisibility = true;
        this.setState(GameState.PAUSED);
      }
    });
  }

  private loadBestScore(): void {
    try {
      const s = localStorage.getItem('skyflux_best_score');
      this.stats.bestScore = s ? parseInt(s, 10) : 0;
    } catch { this.stats.bestScore = 0; }
  }

  private saveBestScore(): void {
    try {
      localStorage.setItem('skyflux_best_score', this.stats.bestScore.toString());
    } catch { /* ignore */ }
  }

  // ─── State Machine ────────────────────────────────────────────
  setState(newState: GameState): void {
    const prev = this.state;
    this.state = newState;

    // Hide all screens
    ['main-menu', 'pause-menu', 'gameover-screen', 'intro-skip', 'howtoplay-screen', 'settings-screen']
      .forEach(id => document.getElementById(id)?.classList.add('hidden'));

    document.body.className = '';

    switch (newState) {
      case GameState.MENU:
        document.getElementById('main-menu')?.classList.remove('hidden');
        this.hud.hide();
        this.hud.hideMobileControls();
        document.body.classList.add('menu');
        this.updateMenuBestScore();
        this.audio.stopEngine();
        break;

      case GameState.INTRO:
        document.getElementById('intro-skip')?.classList.remove('hidden');
        this.hud.hide();
        this.hud.hideMobileControls();
        this.startIntro();
        break;

      case GameState.PLAYING:
        this.hud.show();
        this.hud.showMobileControls();
        document.body.classList.add('playing');
        if (prev === GameState.PAUSED) {
          // Resume — don't reset
        } else if (prev !== GameState.INTRO) {
          this.resetGame();
        } else {
          // After intro — game already positioned
          this.obstacles.reset();
        }
        this.audio.startEngine(this.physics.currentSpeed);
        break;

      case GameState.PAUSED:
        document.getElementById('pause-menu')?.classList.remove('hidden');
        this.hud.setPauseScore(this.stats.score);
        this.audio.stopEngine();
        break;

      case GameState.CRASHED:
        this.crashTimer = 1.8;
        this.camCtrl.shake(0.4);
        this.audio.playCrash();
        this.audio.stopEngine();
        break;

      case GameState.GAME_OVER: {
        if (this.stats.score > this.stats.bestScore) {
          this.stats.bestScore = this.stats.score;
          this.saveBestScore();
        }
        this.hud.setGameOverStats(this.stats);
        document.getElementById('gameover-screen')?.classList.remove('hidden');
        this.hud.hide();
        this.hud.hideMobileControls();
        break;
      }
    }
  }

  private updateMenuBestScore(): void {
    const el = document.getElementById('menu-best-score');
    if (el) el.textContent = this.stats.bestScore.toLocaleString();
  }

  private startIntro(): void {
    // Position car at start
    this.carParts.root.position.set(-25, GROUND_Y, -5);
    this.carParts.root.rotation.set(0, Math.PI / 2, 0);

    this.intro = new IntroSequence(this.camera, this.carParts, () => {
      this.carParts.root.rotation.set(0, 0, 0);
      this.carParts.root.position.set(0, GROUND_Y, 0);
      this.setState(GameState.PLAYING);
    });

    const ramp = this.track.getRamp();
    if (ramp) this.intro.setRamp(ramp);
  }

  private resetGame(): void {
    this.stats.score = 0;
    this.stats.distance = 0;
    this.stats.orbs = 0;
    this.stats.combo = 0;
    this.totalDistance = 0;

    this.physics.reset();
    this.obstacles.reset();

    this.carParts.root.position.set(0, GROUND_Y, 0);
    this.carParts.root.rotation.set(0, 0, 0);

    this.camera.position.set(0, 4.5, 10);
    this.camera.lookAt(0, 0, 0);
  }

  // ─── Game Loop ────────────────────────────────────────────────
  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop = (now: number): void => {
    this.animId = requestAnimationFrame(this.loop);

    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05); // cap at 50ms to avoid spiral of death

    // FPS tracking
    this.frameCount++;
    this.fpsAccum += dt;
    if (this.fpsAccum > 1) {
      this.lastFps = this.frameCount;
      this.frameCount = 0;
      this.fpsAccum = 0;
    }

    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number): void {
    const input = this.input.getState();

    switch (this.state) {
      case GameState.INTRO:
        this.intro?.update(dt);
        break;

      case GameState.PLAYING:
        this.updatePlaying(dt, input);
        break;

      case GameState.CRASHED:
        this.updateCrashed(dt);
        break;

      case GameState.PAUSED:
        // Check resume
        if (this.input.consumePause()) this.setState(GameState.PLAYING);
        break;

      case GameState.MENU:
      case GameState.GAME_OVER:
      case GameState.LOADING:
        break;
    }
  }

  private updatePlaying(dt: number, input: ReturnType<typeof this.input.getState>): void {
    // Pause
    if (this.input.consumePause()) {
      this.setState(GameState.PAUSED);
      return;
    }

    // Physics
    const physResult = this.physics.update(dt, input);

    if (physResult.justJumped) this.audio.playJump();
    if (physResult.justLanded) {
      this.audio.playLand();
      this.camCtrl.shake(0.15);
    }
    if (physResult.justBoosted) this.audio.playBoost();
    if (physResult.flipScored) {
      this.stats.score += SCORE_FLIP;
      this.hud.showFlipScore(SCORE_FLIP);
    }

    // Update car position
    const pos = this.physics.currentPosition;
    this.carParts.root.position.copy(pos);
    this.carParts.root.rotation.x = this.physics.rotationX;

    // Car visuals
    const isBoosting = input.boost && this.physics.boostEnergy > 0;
    updateCarVisuals(
      this.carParts, dt, this.physics.currentSpeed,
      isBoosting, this.physics.isFlying,
      this.physics.targetLaneX, this.physics.laneX,
    );

    // Audio
    this.audio.updateEngine(this.physics.currentSpeed);

    // Camera
    this.camCtrl.update(dt, pos, this.physics.currentSpeed);

    // Track scrolling
    this.track.update(pos.z);

    // Obstacles
    const obsResult = this.obstacles.update(dt, pos.z, pos.x, pos.y, pos.z);
    this.obstacles.animateGates(dt);
    this.obstacles.setDifficulty(this.totalDistance * DIFFICULTY_RAMP_RATE);

    if (obsResult.hit || obsResult.fellInGap) {
      this.setState(GameState.CRASHED);
      return;
    }

    if (obsResult.nearMiss) {
      this.physics.addNearMiss();
      this.stats.score += SCORE_NEAR_MISS;
      this.audio.playNearMiss();
      this.hud.showCombo(this.physics.comboValue);
    }

    if (obsResult.orbCollected) {
      this.stats.orbs++;
      this.stats.score += SCORE_PER_ORB;
      this.audio.playCollect();
    }

    if (obsResult.gateScore > 0) {
      this.stats.score += obsResult.gateScore;
    }

    // Distance & score
    const frameDist = this.physics.currentSpeed * dt;
    this.totalDistance += frameDist;
    this.stats.distance = this.totalDistance;
    this.stats.score += Math.floor(frameDist * SCORE_PER_METER);
    this.stats.speed = this.physics.currentSpeed;

    // HUD
    this.hud.update(this.stats);
    this.hud.updateBoost(this.physics.boostEnergy);

    // Speed lines
    this.updateSpeedLines(dt, this.physics.currentSpeed, isBoosting);
  }

  private updateCrashed(dt: number): void {
    this.crashTimer -= dt;
    this.camCtrl.update(dt, this.carParts.root.position, 5);

    // Spin the car during crash
    this.carParts.root.rotation.y += dt * 3;
    this.carParts.root.rotation.z += dt * 2;
    this.carParts.root.position.y = Math.max(0, this.carParts.root.position.y - dt * 2);

    if (this.crashTimer <= 0) {
      this.setState(GameState.GAME_OVER);
    }
  }

  private updateSpeedLines(dt: number, speed: number, boosting: boolean): void {
    const mat = this.speedLines.material as THREE.PointsMaterial;
    const targetOpacity = boosting ? 0.6 : speed > 35 ? 0.25 : 0;
    mat.opacity += (targetOpacity - mat.opacity) * 5 * dt;

    if (mat.opacity > 0.01) {
      const pos = this.speedLines.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setZ(i, pos.getZ(i) + speed * 0.08 * dt);
        if (pos.getZ(i) > 5) pos.setZ(i, -30);
      }
      pos.needsUpdate = true;
      this.speedLines.position.copy(this.carParts.root.position);
    }
  }

  applySettings(settings: GameSettings): void {
    this.settings = settings;
    this.audio.setEnabled(settings.soundEnabled);
    this.audio.setVolume(settings.volume);

    const pixelRatio = Math.min(window.devicePixelRatio, settings.quality === 'low' ? 1 : settings.quality === 'medium' ? 1.5 : 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.shadowMap.enabled = settings.quality !== 'low';
  }

  destroy(): void {
    cancelAnimationFrame(this.animId);
    this.resizeObserver.disconnect();
    this.input.destroy();
    this.audio.destroy();
    this.renderer.dispose();
  }

  getState(): GameState { return this.state; }
  getStats(): GameStats { return this.stats; }
}

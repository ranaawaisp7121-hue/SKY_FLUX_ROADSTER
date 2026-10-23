// ═══════════════════════════════════════════
//  main.ts — SKYFLUX: ROCKET ROAD Entry Point
//  Developed by M.AWAIS
// ═══════════════════════════════════════════

import './styles/main.css';
import { GameEngine } from './GameEngine';
import { GameState, GameSettings, GraphicsQuality } from './types';

// ─── Settings persistence ────────────────────────────────────
function loadSettings(): GameSettings {
  try {
    const saved = localStorage.getItem('skyflux_settings');
    if (saved) return { ...defaultSettings(), ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return defaultSettings();
}

function defaultSettings(): GameSettings {
  // Auto-detect quality
  const mem = (navigator as { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 2;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  let quality = GraphicsQuality.MEDIUM;
  if (isMobile || (mem && mem < 4) || cores < 4) quality = GraphicsQuality.LOW;
  else if (!isMobile && cores >= 8 && (!mem || mem >= 8)) quality = GraphicsQuality.HIGH;

  return {
    quality,
    soundEnabled: true,
    musicEnabled: false,
    volume: 70,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

function saveSettings(s: GameSettings): void {
  try { localStorage.setItem('skyflux_settings', JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── Loading Screen ──────────────────────────────────────────
function setLoadingProgress(p: number, msg: string): void {
  const bar = document.getElementById('loading-bar');
  const text = document.getElementById('loading-text');
  if (bar) bar.style.width = `${Math.round(p * 100)}%`;
  if (text) text.textContent = msg;
}

function hideLoadingScreen(): void {
  const el = document.getElementById('loading-screen');
  if (!el) return;
  el.style.transition = 'opacity 0.5s ease';
  el.style.opacity = '0';
  setTimeout(() => el.classList.add('hidden'), 500);
}

// ─── UI Binding ──────────────────────────────────────────────
function bindUI(engine: GameEngine, settings: GameSettings): void {
  const btn = (id: string, fn: () => void): void => {
    document.getElementById(id)?.addEventListener('click', fn);
  };
  const audio = () => { /* engine's audio is internal, but we can still trigger UI sounds */ };

  // Main Menu
  btn('btn-play', () => {
    playClick();
    engine.setState(GameState.INTRO);
  });

  btn('btn-how-to-play', () => {
    playClick();
    document.getElementById('main-menu')?.classList.add('hidden');
    document.getElementById('howtoplay-screen')?.classList.remove('hidden');
  });

  btn('btn-settings', () => {
    playClick();
    document.getElementById('main-menu')?.classList.add('hidden');
    document.getElementById('settings-screen')?.classList.remove('hidden');
  });

  // How to Play
  btn('btn-howtoplay-back', () => {
    playClick();
    document.getElementById('howtoplay-screen')?.classList.add('hidden');
    document.getElementById('main-menu')?.classList.remove('hidden');
  });

  // Settings
  btn('btn-settings-back', () => {
    playClick();
    document.getElementById('settings-screen')?.classList.add('hidden');
    document.getElementById('main-menu')?.classList.remove('hidden');
    saveSettings(settings);
  });

  // Graphics quality
  const qualitySelect = document.getElementById('graphics-quality') as HTMLSelectElement;
  if (qualitySelect) {
    qualitySelect.value = settings.quality;
    qualitySelect.addEventListener('change', () => {
      settings.quality = qualitySelect.value as GraphicsQuality;
      engine.applySettings(settings);
    });
  }

  // Sound toggle
  setupToggle('sound-toggle', settings.soundEnabled, (val) => {
    settings.soundEnabled = val;
    engine.applySettings(settings);
  });

  // Music toggle (placeholder — no actual music track)
  setupToggle('music-toggle', settings.musicEnabled, (val) => {
    settings.musicEnabled = val;
  });

  // Volume slider
  const volSlider = document.getElementById('volume-slider') as HTMLInputElement;
  if (volSlider) {
    volSlider.value = settings.volume.toString();
    volSlider.addEventListener('input', () => {
      settings.volume = parseInt(volSlider.value, 10);
      engine.applySettings(settings);
    });
  }

  // Reduced motion
  setupToggle('reduced-motion', settings.reducedMotion, (val) => {
    settings.reducedMotion = val;
    document.documentElement.style.setProperty('--anim-duration', val ? '0.01ms' : '');
  });

  // Intro Skip
  btn('btn-skip-intro', () => {
    engine.setState(GameState.PLAYING);
  });

  // Pause menu
  btn('btn-pause', () => {
    if (engine.getState() === GameState.PLAYING) engine.setState(GameState.PAUSED);
  });
  btn('btn-resume', () => {
    playClick();
    engine.setState(GameState.PLAYING);
  });
  btn('btn-restart-pause', () => {
    playClick();
    engine.setState(GameState.PLAYING);
  });
  btn('btn-menu-pause', () => {
    playClick();
    engine.setState(GameState.MENU);
  });

  // Game Over
  btn('btn-restart-go', () => {
    playClick();
    engine.setState(GameState.PLAYING);
  });
  btn('btn-menu-go', () => {
    playClick();
    engine.setState(GameState.MENU);
  });

  // Keyboard R to restart after crash/gameover
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'KeyR' && (engine.getState() === GameState.GAME_OVER || engine.getState() === GameState.CRASHED)) {
      engine.setState(GameState.PLAYING);
    }
  });

  // Prevent page scroll on game keys
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }, { passive: false });

  void audio; // suppress unused warning
}

function setupToggle(id: string, initial: boolean, onChange: (val: boolean) => void): void {
  const btn = document.getElementById(id) as HTMLButtonElement;
  if (!btn) return;
  let state = initial;
  const update = (): void => {
    btn.textContent = state ? 'ON' : 'OFF';
    btn.classList.toggle('active', state);
    btn.setAttribute('aria-pressed', state.toString());
  };
  update();
  btn.addEventListener('click', () => {
    state = !state;
    update();
    onChange(state);
  });
}

// Tiny click sound using AudioContext (bypasses engine for menu sounds)
function playClick(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08);
    setTimeout(() => ctx.close().catch(() => {}), 200);
  } catch { /* ignore */ }
}

// ─── Bootstrap ───────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  const settings = loadSettings();
  const engine = new GameEngine();

  try {
    await engine.init(settings, setLoadingProgress);
  } catch (err) {
    console.error('Engine init failed:', err);
    const text = document.getElementById('loading-text');
    if (text) text.textContent = 'Failed to initialize. Please refresh.';
    return;
  }

  bindUI(engine, settings);
  hideLoadingScreen();

  engine.setState(GameState.MENU);
  engine.start();
}

bootstrap().catch(console.error);

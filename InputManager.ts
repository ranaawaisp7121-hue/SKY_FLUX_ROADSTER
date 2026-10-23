// ═══════════════════════════════════════════
//  Input Manager — Keyboard + Touch + Pointer
// ═══════════════════════════════════════════

import { InputState } from './types';

export class InputManager {
  private state: InputState = {
    left: false, right: false, up: false, down: false,
    jump: false, boost: false, pause: false, restart: false,
  };

  private justPressedKeys = new Set<string>();
  private listeners: Array<() => void> = [];

  // Touch/swipe
  private touchStartX = 0;
  private touchStartY = 0;
  private swipeThreshold = 40;

  constructor() {
    this.bindKeyboard();
    this.bindTouch();
    this.bindMobileButtons();
    this.bindVisibility();
  }

  private bindKeyboard(): void {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA':   this.state.left = true;    break;
        case 'ArrowRight': case 'KeyD':  this.state.right = true;   break;
        case 'ArrowUp': case 'KeyW':     this.state.up = true;      break;
        case 'ArrowDown': case 'KeyS':   this.state.down = true;    break;
        case 'Space':                    this.state.jump = true; e.preventDefault(); break;
        case 'ShiftLeft': case 'ShiftRight': this.state.boost = true; break;
        case 'KeyP': case 'Escape':      this.state.pause = true;   break;
        case 'KeyR':                     this.state.restart = true; break;
      }
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA':   this.state.left = false;   break;
        case 'ArrowRight': case 'KeyD':  this.state.right = false;  break;
        case 'ArrowUp': case 'KeyW':     this.state.up = false;     break;
        case 'ArrowDown': case 'KeyS':   this.state.down = false;   break;
        case 'Space':                    this.state.jump = false;   break;
        case 'ShiftLeft': case 'ShiftRight': this.state.boost = false; break;
        case 'KeyP': case 'Escape':      this.state.pause = false;  break;
        case 'KeyR':                     this.state.restart = false;break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    this.listeners.push(
      () => window.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('keyup', onKeyUp),
    );
  }

  private bindTouch(): void {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent): void => {
      const t = e.changedTouches[0];
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
    };

    const onTouchEnd = (e: TouchEvent): void => {
      const t = e.changedTouches[0];
      const dx = t.clientX - this.touchStartX;
      const dy = t.clientY - this.touchStartY;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);

      if (adx > this.swipeThreshold && adx > ady) {
        // horizontal swipe
        if (dx > 0) {
          this.triggerMomentary('right');
        } else {
          this.triggerMomentary('left');
        }
      } else if (ady > this.swipeThreshold && ady > adx) {
        if (dy < 0) {
          this.triggerMomentary('jump');
        }
      }
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    this.listeners.push(
      () => canvas.removeEventListener('touchstart', onTouchStart),
      () => canvas.removeEventListener('touchend', onTouchEnd),
    );
  }

  private triggerMomentary(key: keyof InputState): void {
    this.state[key] = true;
    setTimeout(() => { this.state[key] = false; }, 150);
  }

  private bindMobileButtons(): void {
    const bindings: Array<[string, keyof InputState]> = [
      ['btn-left', 'left'],
      ['btn-right', 'right'],
      ['btn-jump', 'jump'],
      ['btn-boost-mobile', 'boost'],
    ];

    for (const [id, key] of bindings) {
      const el = document.getElementById(id);
      if (!el) continue;
      const start = (): void => { this.state[key] = true; };
      const end = (): void => { this.state[key] = false; };
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('pointerleave', end);
    }
  }

  private bindVisibility(): void {
    const onBlur = (): void => this.resetAll();
    const onHidden = (): void => { if (document.hidden) this.resetAll(); };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onHidden);
    this.listeners.push(
      () => window.removeEventListener('blur', onBlur),
      () => document.removeEventListener('visibilitychange', onHidden),
    );
  }

  resetAll(): void {
    this.state = {
      left: false, right: false, up: false, down: false,
      jump: false, boost: false, pause: false, restart: false,
    };
  }

  getState(): Readonly<InputState> {
    return this.state;
  }

  consumePause(): boolean {
    const val = this.state.pause;
    if (val) this.state.pause = false;
    return val;
  }

  consumeRestart(): boolean {
    const val = this.state.restart;
    if (val) this.state.restart = false;
    return val;
  }

  consumeJump(): boolean {
    const val = this.state.jump;
    if (val) this.state.jump = false;
    return val;
  }

  destroy(): void {
    this.listeners.forEach(fn => fn());
    this.listeners = [];
  }
}

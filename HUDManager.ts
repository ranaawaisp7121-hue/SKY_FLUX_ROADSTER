// ═══════════════════════════════════════════
//  HUD Manager — Score, Boost, Orbs, Combo
// ═══════════════════════════════════════════

import { GameStats } from './types';

export class HUDManager {
  private scoreEl = document.getElementById('hud-score')!;
  private distEl = document.getElementById('hud-distance')!;
  private speedEl = document.getElementById('hud-speed')!;
  private boostBar = document.getElementById('boost-bar')!;
  private comboEl = document.getElementById('hud-combo')!;
  private orbsEl = document.getElementById('hud-orbs')!;

  private comboTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastScore = -1;

  show(): void {
    document.getElementById('hud')?.classList.remove('hidden');
  }

  hide(): void {
    document.getElementById('hud')?.classList.add('hidden');
  }

  showMobileControls(): void {
    const mc = document.getElementById('mobile-controls');
    if (mc && window.innerWidth < 1024) mc.classList.remove('hidden');
  }

  hideMobileControls(): void {
    document.getElementById('mobile-controls')?.classList.add('hidden');
  }

  update(stats: GameStats): void {
    if (stats.score !== this.lastScore) {
      this.scoreEl.textContent = stats.score.toLocaleString();
      this.lastScore = stats.score;
    }
    this.distEl.textContent = `${Math.floor(stats.distance)} m`;
    this.speedEl.textContent = `${Math.floor(stats.speed * 3.6)} km/h`;
    this.orbsEl.textContent = stats.orbs.toString();
  }

  updateBoost(energy: number): void {
    this.boostBar.style.width = `${energy * 100}%`;
    if (energy < 0.2) {
      this.boostBar.style.background = 'linear-gradient(90deg, #cc2200, #ff4400)';
    } else if (energy < 0.5) {
      this.boostBar.style.background = 'linear-gradient(90deg, #ff6d00, #ffab40)';
    } else {
      this.boostBar.style.background = 'linear-gradient(90deg, var(--orange), #ffab40)';
    }
  }

  showCombo(combo: number, text?: string): void {
    if (this.comboTimeout) clearTimeout(this.comboTimeout);
    const msg = text ?? (combo > 1 ? `${combo}x COMBO!` : 'NEAR MISS!');
    this.comboEl.textContent = msg;
    this.comboEl.style.opacity = '1';
    this.comboTimeout = setTimeout(() => {
      this.comboEl.style.opacity = '0';
    }, 1500);
  }

  showFlipScore(points: number): void {
    this.showCombo(0, `FLIP! +${points}`);
  }

  setPauseScore(score: number): void {
    const el = document.getElementById('pause-score');
    if (el) el.textContent = score.toLocaleString();
  }

  setGameOverStats(stats: GameStats): void {
    const set = (id: string, val: string): void => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('go-score', stats.score.toLocaleString());
    set('go-distance', `${Math.floor(stats.distance)} m`);
    set('go-orbs', stats.orbs.toString());
    set('go-best', stats.bestScore.toLocaleString());

    const newRecord = document.getElementById('new-record');
    if (newRecord) {
      if (stats.score >= stats.bestScore && stats.score > 0) {
        newRecord.classList.remove('hidden');
      } else {
        newRecord.classList.add('hidden');
      }
    }
  }
}

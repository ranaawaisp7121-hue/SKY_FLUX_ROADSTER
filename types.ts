// ═══════════════════════════════════════════
//  SKYFLUX: ROCKET ROAD — Game Types & Constants
// ═══════════════════════════════════════════

export enum GameState {
  LOADING = 'LOADING',
  MENU = 'MENU',
  INTRO = 'INTRO',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  CRASHED = 'CRASHED',
  GAME_OVER = 'GAME_OVER',
}

export enum GraphicsQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum Lane {
  LEFT = -1,
  CENTER = 0,
  RIGHT = 1,
}

export interface GameSettings {
  quality: GraphicsQuality;
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  reducedMotion: boolean;
}

export interface GameStats {
  score: number;
  distance: number;
  speed: number;
  orbs: number;
  combo: number;
  bestScore: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  boost: boolean;
  pause: boolean;
  restart: boolean;
}

export interface PhysicsState {
  velocityY: number;
  isGrounded: boolean;
  isFlying: boolean;
  boostEnergy: number;
  rotationX: number;
  rotationZ: number;
}

// Lane positions (world X coordinates)
export const LANE_WIDTH = 3.5;
export const LANE_POSITIONS: Record<Lane, number> = {
  [Lane.LEFT]: -LANE_WIDTH,
  [Lane.CENTER]: 0,
  [Lane.RIGHT]: LANE_WIDTH,
};

export const CAR_SPEED_BASE = 18;
export const CAR_SPEED_MAX = 55;
export const CAR_SPEED_BOOST = 38;
export const CAR_ACCELERATION = 0.04;
export const JUMP_IMPULSE = 12;
export const GRAVITY = -28;
export const BOOST_MAX = 1.0;
export const BOOST_DRAIN = 0.25;
export const BOOST_REGEN = 0.08;
export const LANE_CHANGE_SPEED = 8;
export const GROUND_Y = 0.45;
export const TRACK_SEGMENT_LENGTH = 80;
export const TRACK_VISIBLE_SEGMENTS = 8;
export const OBSTACLE_START_Z = -80;
export const SCORE_PER_METER = 1;
export const SCORE_PER_ORB = 50;
export const SCORE_NEAR_MISS = 25;
export const SCORE_FLIP = 100;
export const DIFFICULTY_RAMP_RATE = 0.0002;
export const NEAR_MISS_THRESHOLD = 1.2;

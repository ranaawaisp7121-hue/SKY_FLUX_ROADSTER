// ═══════════════════════════════════════════
//  Physics & Car Controller
// ═══════════════════════════════════════════

import * as THREE from 'three';
import { InputState, PhysicsState, Lane, LANE_POSITIONS, LANE_CHANGE_SPEED,
  JUMP_IMPULSE, GRAVITY, BOOST_MAX, BOOST_DRAIN, BOOST_REGEN, GROUND_Y,
  CAR_SPEED_BASE, CAR_SPEED_MAX, CAR_SPEED_BOOST, CAR_ACCELERATION } from './types';

export class PhysicsController {
  private physics: PhysicsState = {
    velocityY: 0,
    isGrounded: true,
    isFlying: false,
    boostEnergy: BOOST_MAX,
    rotationX: 0,
    rotationZ: 0,
  };

  private currentLane: Lane = Lane.CENTER;
  private targetLane: Lane = Lane.CENTER;
  private currentX: number = LANE_POSITIONS[Lane.CENTER];
  private targetX: number = LANE_POSITIONS[Lane.CENTER];
  private canChangeLane = true;
  private laneChangeDelay = 0;

  private speed: number = CAR_SPEED_BASE;
  private positionY: number = GROUND_Y;
  private positionZ: number = 0;

  // Jump tracking
  private jumpPressed = false;
  private flipAngle = 0;
  private flipComplete = false;
  private airTime = 0;
  private comboCount = 0;
  private comboTimer = 0;
  private nearMissThisFrame = false;

  reset(): void {
    this.physics = {
      velocityY: 0, isGrounded: true, isFlying: false,
      boostEnergy: BOOST_MAX, rotationX: 0, rotationZ: 0,
    };
    this.currentLane = Lane.CENTER;
    this.targetLane = Lane.CENTER;
    this.currentX = LANE_POSITIONS[Lane.CENTER];
    this.targetX = LANE_POSITIONS[Lane.CENTER];
    this.canChangeLane = true;
    this.laneChangeDelay = 0;
    this.speed = CAR_SPEED_BASE;
    this.positionY = GROUND_Y;
    this.positionZ = 0;
    this.flipAngle = 0;
    this.flipComplete = true;
    this.airTime = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
  }

  update(dt: number, input: InputState): {
    justLanded: boolean;
    justJumped: boolean;
    justBoosted: boolean;
    flipScored: boolean;
    nearMiss: boolean;
  } {
    const result = { justLanded: false, justJumped: false, justBoosted: false, flipScored: false, nearMiss: false };

    // ── Speed ─────────────────────────────────────────
    const isBoosting = input.boost && this.physics.boostEnergy > 0;
    let targetSpeed = input.up ? CAR_SPEED_MAX : input.down ? CAR_SPEED_BASE * 0.6 : CAR_SPEED_BASE;
    if (isBoosting) {
      targetSpeed = Math.max(targetSpeed, CAR_SPEED_BOOST);
      this.physics.boostEnergy = Math.max(0, this.physics.boostEnergy - BOOST_DRAIN * dt);
      if (!this.jumpPressed) result.justBoosted = true;
    } else {
      this.physics.boostEnergy = Math.min(BOOST_MAX, this.physics.boostEnergy + BOOST_REGEN * dt);
    }
    this.speed += (targetSpeed - this.speed) * CAR_ACCELERATION * 60 * dt;
    this.speed = Math.max(8, Math.min(CAR_SPEED_MAX * 1.1, this.speed));

    // ── Lane Changes ─────────────────────────────────
    this.laneChangeDelay -= dt;
    if (this.laneChangeDelay <= 0) this.canChangeLane = true;

    if (this.canChangeLane) {
      const lanes: Lane[] = [Lane.LEFT, Lane.CENTER, Lane.RIGHT];
      const idx = lanes.indexOf(this.currentLane);
      if (input.left && idx > 0) {
        this.currentLane = lanes[idx - 1];
        this.targetX = LANE_POSITIONS[this.currentLane];
        this.canChangeLane = false;
        this.laneChangeDelay = 0.22;
      } else if (input.right && idx < lanes.length - 1) {
        this.currentLane = lanes[idx + 1];
        this.targetX = LANE_POSITIONS[this.currentLane];
        this.canChangeLane = false;
        this.laneChangeDelay = 0.22;
      }
    }

    // Smooth X movement
    this.currentX += (this.targetX - this.currentX) * LANE_CHANGE_SPEED * dt;

    // ── Jump / Flight ─────────────────────────────────
    const jumpWanted = input.jump;
    if (jumpWanted && !this.jumpPressed) {
      if (this.physics.isGrounded) {
        this.physics.velocityY = JUMP_IMPULSE;
        this.physics.isGrounded = false;
        this.physics.isFlying = true;
        this.flipAngle = 0;
        this.flipComplete = false;
        this.airTime = 0;
        result.justJumped = true;
      } else if (this.physics.isFlying && this.physics.boostEnergy > 0.1) {
        // Double jump in air
        this.physics.velocityY = Math.max(this.physics.velocityY, 5);
      }
    }
    this.jumpPressed = jumpWanted;

    // ── Vertical Physics ─────────────────────────────
    if (!this.physics.isGrounded) {
      this.physics.velocityY += GRAVITY * dt;
      this.positionY += this.physics.velocityY * dt;
      this.airTime += dt;

      // Airborne rotation (barrel roll / backflip)
      if (this.physics.isFlying && !this.flipComplete) {
        this.flipAngle += dt * 4.5; // degrees per second * π
        this.physics.rotationX = this.flipAngle;
        if (this.flipAngle >= Math.PI * 2) {
          this.flipComplete = true;
          result.flipScored = true;
          this.physics.rotationX = 0;
        }
      }

      // Landing
      if (this.positionY <= GROUND_Y) {
        this.positionY = GROUND_Y;
        this.physics.velocityY = 0;
        this.physics.isGrounded = true;
        this.physics.isFlying = false;
        this.physics.rotationX = 0;
        this.airTime = 0;
        result.justLanded = true;
      }
    }

    // Move forward
    this.positionZ -= this.speed * dt;

    // ── Combo ─────────────────────────────────────────
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.comboCount = 0;

    return result;
  }

  addNearMiss(): void {
    this.comboCount++;
    this.comboTimer = 3.0;
  }

  get currentPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.currentX, this.positionY, this.positionZ);
  }

  get currentSpeed(): number { return this.speed; }
  get boostEnergy(): number { return this.physics.boostEnergy; }
  get isGrounded(): boolean { return this.physics.isGrounded; }
  get isFlying(): boolean { return this.physics.isFlying; }
  get isBoosting(): boolean { return this.physics.boostEnergy < BOOST_MAX; }
  get rotationX(): number { return this.physics.rotationX; }
  get comboValue(): number { return this.comboCount; }
  get targetLaneX(): number { return this.targetX; }
  get laneX(): number { return this.currentX; }
}

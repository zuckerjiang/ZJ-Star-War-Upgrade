import { Point, EnemyType, PowerUpType } from './types';

// Player Constants
export const PLAYER_SIZE = 40;
export const PLAYER_SPEED = 5;
export const PLAYER_INITIAL_LIVES = 3;
export const INVINCIBILITY_DURATION = 2000;

// Bullet Constants
export const BULLET_SPEED = 7;
export const BULLET_SIZE = 4;

// Enemy Constants
export const ENEMY_CONFIGS = {
  [EnemyType.BASIC]: {
    size: 35,
    speed: 2,
    health: 1,
    points: 100,
    color: '#3b82f6', // blue
    glow: '#60a5fa',
  },
  [EnemyType.FAST]: {
    size: 25,
    speed: 4,
    health: 1,
    points: 150,
    color: '#10b981', // emerald
    glow: '#34d399',
  },
  [EnemyType.HEAVY]: {
    size: 50,
    speed: 1.2,
    health: 3,
    points: 300,
    color: '#ef4444', // red
    glow: '#f87171',
  },
};

// PowerUp Constants
export const POWERUP_SIZE = 30;
export const POWERUP_DURATION = 8000;
export const POWERUP_SPAWN_CHANCE = 0.15;

// Level Constants
export const ENEMIES_PER_LEVEL = 10;
export const LEVEL_DIFFICULTY_MULTIPLIER = 1.2;

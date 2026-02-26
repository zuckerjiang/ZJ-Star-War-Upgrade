import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trophy, 
  Shield, 
  Zap, 
  Target, 
  Flame, 
  Info,
  Heart,
  Gamepad2,
  ChevronRight,
  Star
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  GameState, 
  EnemyType, 
  PowerUpType, 
  Achievement, 
  INITIAL_ACHIEVEMENTS 
} from './types';
import { 
  PLAYER_SIZE, 
  PLAYER_SPEED, 
  PLAYER_INITIAL_LIVES, 
  INVINCIBILITY_DURATION,
  BULLET_SPEED,
  BULLET_SIZE,
  ENEMY_CONFIGS,
  POWERUP_SIZE,
  POWERUP_DURATION,
  POWERUP_SPAWN_CHANCE,
  ENEMIES_PER_LEVEL
} from './constants';

// --- Game Logic Classes ---

class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isEnemy: boolean;

  constructor(x: number, y: number, vx: number, vy: number, color = '#fff', isEnemy = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = BULLET_SIZE;
    this.color = color;
    this.isEnemy = isEnemy;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Enemy {
  x: number;
  y: number;
  type: EnemyType;
  size: number;
  speed: number;
  health: number;
  points: number;
  color: string;
  glow: string;

  constructor(canvasWidth: number, type: EnemyType) {
    const config = ENEMY_CONFIGS[type];
    this.type = type;
    this.size = config.size;
    this.speed = config.speed;
    this.health = config.health;
    this.points = config.points;
    this.color = config.color;
    this.glow = config.glow;
    this.x = Math.random() * (canvasWidth - this.size);
    this.y = -this.size;
  }

  update() {
    this.y += this.speed;
  }

  draw(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null) {
    ctx.save();
    
    if (img && img.complete && img.naturalWidth !== 0) {
      // Draw Image
      ctx.drawImage(img, this.x, this.y, this.size, this.size);
    } else {
      // Fallback to equilateral triangles
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.glow;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      
      // Calculate height for an equilateral triangle: height = side * sqrt(3) / 2
      const eqHeight = this.size * (Math.sqrt(3) / 2);
      
      if (this.type === EnemyType.BASIC || this.type === EnemyType.FAST) {
        // Pointing down
        ctx.moveTo(this.x + this.size / 2, this.y + eqHeight);
        ctx.lineTo(this.x, this.y);
        ctx.lineTo(this.x + this.size, this.y);
      } else {
        // Heavy is a square, keep it as is
        ctx.rect(this.x, this.y, this.size, this.size);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

class PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  size: number;
  speed: number;

  constructor(canvasWidth: number) {
    const rand = Math.random();
    if (rand < 0.4) this.type = PowerUpType.TRIPLE_SHOT;
    else if (rand < 0.8) this.type = PowerUpType.SHIELD;
    else this.type = PowerUpType.EXTRA_LIFE;
    
    this.size = POWERUP_SIZE;
    this.speed = 1.5;
    this.x = Math.random() * (canvasWidth - this.size);
    this.y = -this.size;
  }

  update() {
    this.y += this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.shadowBlur = 20;
    let color = '#f59e0b'; // amber
    let icon = 'T';
    if (this.type === PowerUpType.SHIELD) {
      color = '#06b6d4'; // cyan
      icon = 'S';
    } else if (this.type === PowerUpType.EXTRA_LIFE) {
      color = '#ef4444'; // red
      icon = 'H';
    }
    
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    
    ctx.beginPath();
    ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(icon, this.x + this.size / 2, this.y + this.size / 2 + 4);
    
    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.color = color;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.02;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- Main Component ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(PLAYER_INITIAL_LIVES);
  const [level, setLevel] = useState(1);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [activePowerUps, setActivePowerUps] = useState<{ type: PowerUpType; endTime: number }[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Image Refs
  const images = useRef<{
    player: HTMLImageElement | null;
    enemyBasic: HTMLImageElement | null;
    enemyFast: HTMLImageElement | null;
    enemyHeavy: HTMLImageElement | null;
  }>({
    player: null,
    enemyBasic: null,
    enemyFast: null,
    enemyHeavy: null,
  });

  // Load Images
  useEffect(() => {
    const loadImg = (src: string) => {
      const img = new Image();
      img.src = src;
      return img;
    };
    images.current.player = loadImg('/assets/player.png');
    images.current.enemyBasic = loadImg('/assets/enemy_basic.png');
    images.current.enemyFast = loadImg('/assets/enemy_fast.png');
    images.current.enemyHeavy = loadImg('/assets/enemy_heavy.png');
  }, []);

  // Game state refs for the loop
  const gameData = useRef({
    player: { x: 0, y: 0, invincibility: 0 },
    bullets: [] as Bullet[],
    enemyBullets: [] as Bullet[],
    enemies: [] as Enemy[],
    powerUps: [] as PowerUp[],
    particles: [] as Particle[],
    keys: {} as Record<string, boolean>,
    lastShot: 0,
    enemiesSpawnedInLevel: 0,
    startTime: 0,
    enemiesKilled: 0,
    powerUpsPicked: 0,
  });

  // --- Audio Simulation ---
  const playSound = (type: 'shoot' | 'explosion' | 'powerup' | 'hit' | 'levelup') => {
    if (isMuted) return;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioCtx = audioContextRef.current;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'shoot') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'explosion') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'powerup') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'hit') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'levelup') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    }
  };

  // --- Achievement Logic ---
  const unlockAchievement = useCallback((id: string) => {
    setAchievements(prev => {
      const ach = prev.find(a => a.id === id);
      if (ach && !ach.unlocked) {
        return prev.map(a => a.id === id ? { ...a, unlocked: true } : a);
      }
      return prev;
    });
  }, []);

  // --- Game Loop ---
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const spawnEnemy = () => {
      const logicalWidth = canvas.clientWidth;
      const rand = Math.random();
      let type = EnemyType.BASIC;
      if (level >= 2 && rand > 0.7) type = EnemyType.FAST;
      if (level >= 3 && rand > 0.9) type = EnemyType.HEAVY;
      
      gameData.current.enemies.push(new Enemy(logicalWidth, type));
      gameData.current.enemiesSpawnedInLevel++;
    };

    const spawnPowerUp = () => {
      const logicalWidth = canvas.clientWidth;
      let chance = POWERUP_SPAWN_CHANCE;
      if (level >= 15) {
        // Decrease chance as level increases
        chance = Math.max(0.02, POWERUP_SPAWN_CHANCE - (level - 15) * 0.01);
      }
      if (Math.random() < chance) {
        gameData.current.powerUps.push(new PowerUp(logicalWidth));
      }
    };

    const loop = (time: number) => {
      const logicalWidth = canvas.clientWidth;
      const logicalHeight = canvas.clientHeight;

      // Clear
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // Draw Stars
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 50; i++) {
        const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * logicalWidth;
        const y = ((time * 0.05 + i * 50) % logicalHeight);
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1.0;

      // Handle Input
      const { keys, player } = gameData.current;

      if (keys['ArrowLeft'] || keys['a']) player.x -= PLAYER_SPEED;
      if (keys['ArrowRight'] || keys['d']) player.x += PLAYER_SPEED;
      if (keys['ArrowUp'] || keys['w']) player.y -= PLAYER_SPEED;
      if (keys['ArrowDown'] || keys['s']) player.y += PLAYER_SPEED;

      // Clamp Player
      player.x = Math.max(0, Math.min(logicalWidth - PLAYER_SIZE, player.x));
      player.y = Math.max(0, Math.min(logicalHeight - PLAYER_SIZE, player.y));

      // Automatic Shooting
      const now = Date.now();
      const hasTriple = activePowerUps.some(p => p.type === PowerUpType.TRIPLE_SHOT && p.endTime > now);
      if (now - gameData.current.lastShot > 150) {
        playSound('shoot');
        if (hasTriple) {
          gameData.current.bullets.push(new Bullet(player.x + PLAYER_SIZE / 2, player.y, -2, -BULLET_SPEED, '#f59e0b'));
          gameData.current.bullets.push(new Bullet(player.x + PLAYER_SIZE / 2, player.y, 0, -BULLET_SPEED, '#f59e0b'));
          gameData.current.bullets.push(new Bullet(player.x + PLAYER_SIZE / 2, player.y, 2, -BULLET_SPEED, '#f59e0b'));
        } else {
          gameData.current.bullets.push(new Bullet(player.x + PLAYER_SIZE / 2, player.y, 0, -BULLET_SPEED));
        }
        gameData.current.lastShot = now;
      }

      // Update & Draw Bullets
      gameData.current.bullets = gameData.current.bullets.filter(b => {
        b.update();
        b.draw(ctx);
        return b.y > 0 && b.x > 0 && b.x < logicalWidth;
      });

      // Update & Draw Enemy Bullets
      gameData.current.enemyBullets = gameData.current.enemyBullets.filter(b => {
        b.update();
        b.draw(ctx);

        // Collision with Player
        const hasShield = activePowerUps.some(p => p.type === PowerUpType.SHIELD && p.endTime > now);
        const isInvincible = player.invincibility > now;
        if (
          !isInvincible &&
          b.x > player.x && b.x < player.x + PLAYER_SIZE &&
          b.y > player.y && b.y < player.y + PLAYER_SIZE
        ) {
          if (hasShield) {
            setActivePowerUps(prev => prev.filter(p => p.type !== PowerUpType.SHIELD));
            playSound('hit');
          } else {
            setLives(l => {
              if (l <= 1) {
                setGameState(GameState.GAME_OVER);
                return 0;
              }
              return l - 1;
            });
            player.invincibility = now + INVINCIBILITY_DURATION;
            playSound('hit');
          }
          return false;
        }

        return b.y < logicalHeight && b.x > 0 && b.x < logicalWidth;
      });

      // Update & Draw Enemies
      if (Math.random() < 0.02 * (1 + level * 0.25) && gameData.current.enemiesSpawnedInLevel < ENEMIES_PER_LEVEL * level) {
        spawnEnemy();
      }

      gameData.current.enemies = gameData.current.enemies.filter(e => {
        e.update();
        
        let enemyImg = images.current.enemyBasic;
        if (e.type === EnemyType.FAST) enemyImg = images.current.enemyFast;
        if (e.type === EnemyType.HEAVY) enemyImg = images.current.enemyHeavy;
        
        e.draw(ctx, enemyImg);

        // Enemy Firing (Level >= 10)
        if (level >= 10) {
          const fireChance = Math.min(0.05, 0.005 + (level - 10) * 0.002);
          if (Math.random() < fireChance) {
            gameData.current.enemyBullets.push(new Bullet(e.x + e.size / 2, e.y + e.size, 0, 4, '#ef4444', true));
          }
        }

        // Collision with Bullets
        let hit = false;
        gameData.current.bullets.forEach((b, bIdx) => {
          if (
            b.x > e.x && b.x < e.x + e.size &&
            b.y > e.y && b.y < e.y + e.size
          ) {
            e.health--;
            gameData.current.bullets.splice(bIdx, 1);
            if (e.health <= 0) {
              hit = true;
              setScore(s => s + e.points);
              gameData.current.enemiesKilled++;
              playSound('explosion');
              for (let i = 0; i < 10; i++) {
                gameData.current.particles.push(new Particle(e.x + e.size / 2, e.y + e.size / 2, e.color));
              }
              if (gameData.current.enemiesKilled === 1) unlockAchievement('first_blood');
              if (gameData.current.enemiesKilled === 50) unlockAchievement('ace_pilot');
              spawnPowerUp();
            }
          }
        });

        // Collision with Player
        const hasShield = activePowerUps.some(p => p.type === PowerUpType.SHIELD && p.endTime > now);
        const isInvincible = player.invincibility > now;
        if (
          !isInvincible &&
          player.x < e.x + e.size &&
          player.x + PLAYER_SIZE > e.x &&
          player.y < e.y + e.size &&
          player.y + PLAYER_SIZE > e.y
        ) {
          if (hasShield) {
            setActivePowerUps(prev => prev.filter(p => p.type !== PowerUpType.SHIELD));
            playSound('hit');
            hit = true;
          } else {
            setLives(l => {
              if (l <= 1) {
                setGameState(GameState.GAME_OVER);
                return 0;
              }
              return l - 1;
            });
            player.invincibility = now + INVINCIBILITY_DURATION;
            playSound('hit');
            hit = true;
          }
        }

        if (e.y > canvas.height) {
          return false;
        }

        return !hit;
      });

      // Update & Draw PowerUps
      gameData.current.powerUps = gameData.current.powerUps.filter(p => {
        p.update();
        p.draw(ctx);

        if (
          player.x < p.x + p.size &&
          player.x + PLAYER_SIZE > p.x &&
          player.y < p.y + p.size &&
          player.y + PLAYER_SIZE > p.y
        ) {
          if (p.type === PowerUpType.EXTRA_LIFE) {
            setLives(l => l + 1);
            unlockAchievement('life_saver');
          } else {
            setActivePowerUps(prev => [
              ...prev.filter(pu => pu.type !== p.type),
              { type: p.type, endTime: Date.now() + POWERUP_DURATION }
            ]);
          }
          gameData.current.powerUpsPicked++;
          if (gameData.current.powerUpsPicked === 10) unlockAchievement('power_up_junkie');
          playSound('powerup');
          return false;
        }

        return p.y < canvas.height;
      });

      // Update & Draw Particles
      gameData.current.particles = gameData.current.particles.filter(p => {
        p.update();
        p.draw(ctx);
        return p.life > 0;
      });

      // Draw Player
      const isInvincible = player.invincibility > now;
      const hasShield = activePowerUps.some(p => p.type === PowerUpType.SHIELD && p.endTime > now);
      
      if (!isInvincible || Math.floor(time / 100) % 2 === 0) {
        ctx.save();
        
        const playerImg = images.current.player;
        if (playerImg && playerImg.complete && playerImg.naturalWidth !== 0) {
          ctx.drawImage(playerImg, player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
        } else {
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#fff';
          ctx.fillStyle = '#fff';
          
          // Player Ship Shape - Adjusted for better proportions
          const eqHeight = PLAYER_SIZE * (Math.sqrt(3) / 2);
          ctx.beginPath();
          ctx.moveTo(player.x + PLAYER_SIZE / 2, player.y);
          ctx.lineTo(player.x, player.y + eqHeight);
          ctx.lineTo(player.x + PLAYER_SIZE / 2, player.y + eqHeight * 0.8);
          ctx.lineTo(player.x + PLAYER_SIZE, player.y + eqHeight);
          ctx.closePath();
          ctx.fill();
        }

        // Shield Effect
        if (hasShield) {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(player.x + PLAYER_SIZE / 2, player.y + PLAYER_SIZE / 2, PLAYER_SIZE * 0.8, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Check Level Up
      if (gameData.current.enemiesSpawnedInLevel >= ENEMIES_PER_LEVEL * level && gameData.current.enemies.length === 0) {
        setLevel(l => {
          const next = l + 1;
          if (next === 15) {
            setLives(prev => prev + 1);
            playSound('powerup');
          }
          if (next === 5) unlockAchievement('unstoppable');
          playSound('levelup');
          return next;
        });
        gameData.current.enemiesSpawnedInLevel = 0;
      }

      // Check Survivor Achievement
      if (now - gameData.current.startTime > 60000) {
        unlockAchievement('survivor');
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, level, activePowerUps, unlockAchievement, isMuted]);

  // --- Handlers ---
  const startGame = () => {
    // Resume audio context on user gesture
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    setGameState(GameState.PLAYING);
    setScore(0);
    setLives(PLAYER_INITIAL_LIVES);
    setLevel(1);
    gameData.current = {
      player: { x: 0, y: 0, invincibility: 0 },
      bullets: [],
      enemyBullets: [],
      enemies: [],
      powerUps: [],
      particles: [],
      keys: {},
      lastShot: 0,
      enemiesSpawnedInLevel: 0,
      startTime: Date.now(),
      enemiesKilled: 0,
      powerUpsPicked: 0,
    };
    if (canvasRef.current) {
      gameData.current.player.x = canvasRef.current.clientWidth / 2 - PLAYER_SIZE / 2;
      gameData.current.player.y = canvasRef.current.clientHeight - PLAYER_SIZE - 20;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      gameData.current.keys[e.key] = true;
      if (e.key === 'p' || e.key === 'P') {
        setGameState(prev => prev === GameState.PLAYING ? GameState.PAUSED : prev === GameState.PAUSED ? GameState.PLAYING : prev);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      gameData.current.keys[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Touch Controls for Mobile
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isDragging = false;
    let lastTouchX = 0;
    let lastTouchY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      lastTouchX = touch.clientX - rect.left;
      lastTouchY = touch.clientY - rect.top;
      isDragging = true;
      e.preventDefault();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      const dx = touchX - lastTouchX;
      const dy = touchY - lastTouchY;

      gameData.current.player.x += dx;
      gameData.current.player.y += dy;

      lastTouchX = touchX;
      lastTouchY = touchY;
      e.preventDefault();
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState]);

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        // Set display size (css pixels)
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
        
        // Set actual buffer size (physical pixels)
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        
        // Scale all drawing operations by dpr
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden font-sans text-white">
      {/* Game Container */}
      <div ref={containerRef} className="absolute inset-0 z-0">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* HUD */}
      {gameState !== GameState.START && (
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
          <div className="flex flex-col gap-2">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="font-mono text-xl">{score.toString().padStart(6, '0')}</span>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold uppercase tracking-wider">Level {level}</span>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap max-w-[200px]">
              {Array.from({ length: lives }).map((_, i) => (
                <Heart 
                  key={i} 
                  className="w-6 h-6 text-red-500 fill-red-500" 
                />
              ))}
            </div>

            {/* Star Rating - Only show if 3 or more stars */}
            {(() => {
              const stars = Math.min(5, Math.floor(level / 5));
              if (stars >= 3) {
                return (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex gap-1 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-3 py-1"
                  >
                    {Array.from({ length: stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </motion.div>
                );
              }
              return null;
            })()}
          </div>

          <div className="flex flex-col items-end gap-2">
            <button 
              onClick={() => setGameState(GameState.PAUSED)}
              className="pointer-events-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-2 hover:bg-white/20 transition-colors"
            >
              <Pause className="w-5 h-5" />
            </button>
            
            <AnimatePresence>
              {activePowerUps.map(p => (
                <motion.div
                  key={p.type}
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 50, opacity: 0 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-2 flex items-center justify-center"
                >
                  {p.type === PowerUpType.SHIELD ? <Shield className="w-5 h-5 text-cyan-400" /> : p.type === PowerUpType.TRIPLE_SHOT ? <Zap className="w-5 h-5 text-amber-400" /> : <Heart className="w-5 h-5 text-red-400" />}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Start Screen */}
      <AnimatePresence>
        {gameState === GameState.START && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm"
          >
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 flex flex-col justify-center items-center md:items-start text-center md:text-left">
                <motion.h1 
                  initial={{ y: -20 }}
                  animate={{ y: 0 }}
                  className="text-6xl md:text-8xl font-black tracking-tighter mb-2 bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent"
                >
                  Z JIANG STAR WAR
                </motion.h1>
                <p className="text-2xl md:text-3xl font-light text-slate-400 mb-8 italic">星际先锋</p>
                
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <button 
                    onClick={startGame}
                    className="group relative px-8 py-4 bg-white text-slate-950 rounded-full font-bold text-xl flex items-center gap-2 hover:scale-105 transition-transform overflow-hidden"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    START MISSION
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </button>
                  
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="px-8 py-4 bg-white/10 border border-white/20 rounded-full font-bold text-xl hover:bg-white/20 transition-colors"
                  >
                    {isMuted ? 'UNMUTE' : 'MUTE'}
                  </button>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col gap-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-blue-400" />
                  CONTROLS
                </h3>
                <div className="space-y-4 text-sm text-slate-300">
                  <div className="flex justify-between items-center">
                    <span>MOVE</span>
                    <span className="bg-white/10 px-2 py-1 rounded border border-white/20 font-mono">WASD / ARROWS</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>SHOOT</span>
                    <span className="bg-white/10 px-2 py-1 rounded border border-white/20 font-mono">SPACE</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>PAUSE</span>
                    <span className="bg-white/10 px-2 py-1 rounded border border-white/20 font-mono">P</span>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  POWER-UPS
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold">T</div>
                    <span className="text-xs">TRIPLE SHOT: Enhanced firepower</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold">S</div>
                    <span className="text-xs">SHIELD: Protects from one hit</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 font-bold">H</div>
                    <span className="text-xs">LIFE: Extra life chance</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause Screen */}
      <AnimatePresence>
        {gameState === GameState.PAUSED && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 backdrop-blur-md"
          >
            <div className="bg-white/10 border border-white/20 rounded-3xl p-12 text-center max-w-sm w-full">
              <h2 className="text-4xl font-black mb-8 tracking-tight">PAUSED</h2>
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setGameState(GameState.PLAYING)}
                  className="w-full py-4 bg-white text-slate-950 rounded-2xl font-bold text-lg hover:scale-105 transition-transform"
                >
                  RESUME
                </button>
                <button 
                  onClick={() => setGameState(GameState.START)}
                  className="w-full py-4 bg-white/10 border border-white/20 rounded-2xl font-bold text-lg hover:bg-white/20 transition-colors"
                >
                  QUIT MISSION
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Screen */}
      <AnimatePresence>
        {gameState === GameState.GAME_OVER && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl"
          >
            <div className="max-w-2xl w-full flex flex-col items-center text-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-7xl font-black mb-2 tracking-tighter text-red-500">MISSION FAILED</h2>
                <p className="text-xl text-slate-400 mb-12">Your ship was destroyed in the line of duty.</p>
              </motion.div>

              <div className="grid grid-cols-2 gap-8 w-full mb-12">
                <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Final Score</span>
                  <span className="text-4xl font-mono font-bold">{score.toLocaleString()}</span>
                </div>
                <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Level Reached</span>
                  <span className="text-4xl font-mono font-bold">{level}</span>
                </div>
              </div>

              <div className="w-full mb-12">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Achievements Unlocked</h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {achievements.filter(a => a.unlocked).map(a => (
                    <div key={a.id} className="bg-white/10 border border-white/20 rounded-full px-4 py-2 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium">{a.name}</span>
                    </div>
                  ))}
                  {achievements.filter(a => a.unlocked).length === 0 && (
                    <span className="text-slate-600 italic">No achievements unlocked this mission.</span>
                  )}
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <button 
                  onClick={startGame}
                  className="flex-1 py-5 bg-white text-slate-950 rounded-2xl font-bold text-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                >
                  <RotateCcw className="w-6 h-6" />
                  RETRY MISSION
                </button>
                <button 
                  onClick={() => setGameState(GameState.START)}
                  className="px-8 py-5 bg-white/10 border border-white/20 rounded-2xl font-bold text-xl hover:bg-white/20 transition-colors"
                >
                  MENU
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Controls Overlay (Hidden as per request for drag controls) */}
    </div>
  );
}

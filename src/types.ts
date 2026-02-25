export interface Point {
  x: number;
  y: number;
}

export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
}

export enum EnemyType {
  BASIC = 'BASIC',
  FAST = 'FAST',
  HEAVY = 'HEAVY',
}

export enum PowerUpType {
  TRIPLE_SHOT = 'TRIPLE_SHOT',
  SHIELD = 'SHIELD',
  EXTRA_LIFE = 'EXTRA_LIFE',
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', name: '第一滴血', description: '击毁第一架敌机', unlocked: false, icon: 'Target' },
  { id: 'survivor', name: '生存者', description: '在单场游戏中坚持超过60秒', unlocked: false, icon: 'Shield' },
  { id: 'ace_pilot', name: '王牌飞行员', description: '击毁50架敌机', unlocked: false, icon: 'Trophy' },
  { id: 'power_up_junkie', name: '道具狂人', description: '拾取10个道具', unlocked: false, icon: 'Zap' },
  { id: 'unstoppable', name: '势不可挡', description: '达到第5关', unlocked: false, icon: 'Flame' },
  { id: 'life_saver', name: '续命大师', description: '拾取一个额外生命道具', unlocked: false, icon: 'Heart' },
];

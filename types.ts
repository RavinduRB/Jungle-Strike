
export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}

export enum GunType {
  PISTOL = 'PISTOL',
  RIFLE = 'RIFLE',
  SMG = 'SMG',
  FLAMETHROWER = 'FLAMETHROWER',
  MACHINE_GUN = 'MACHINE_GUN',
  SHOTGUN = 'SHOTGUN'
}

export enum WeatherType {
  CLEAR = 'CLEAR',
  RAIN = 'RAIN',
  SNOW = 'SNOW'
}

export enum MissionType {
  JUNGLE = 'JUNGLE',
  DESERT = 'DESERT'
}

export enum TimePhase {
  MORNING = 'MORNING',
  NOON = 'NOON',
  EVENING = 'EVENING',
  NIGHT = 'NIGHT'
}

export type ThrowableType = 'GRENADE';

export interface EnemyData {
  id: string;
  position: { x: number; y: number; z: number };
  health: number;
}

export interface GameState {
  score: number;
  money: number;
  health: number;
  grenades: number;
  selectedThrowable: ThrowableType;
  status: GameStatus;
  enemies: EnemyData[];
  lastDamageTime: number;
  selectedGun: GunType;
  selectedMission: MissionType;
  isDriving: boolean;
  gameTime: number; // 0 to 24 representing hours
  weather: WeatherType;
}

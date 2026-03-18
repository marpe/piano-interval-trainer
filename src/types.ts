export type IntervalName =
  | 'Unison'
  | 'm2'
  | 'M2'
  | 'm3'
  | 'M3'
  | 'P4'
  | 'Tritone'
  | 'P5'
  | 'm6'
  | 'M6'
  | 'm7'
  | 'M7'
  | 'Octave';

export type Direction = 'ascending' | 'descending' | 'both';
export type PlaybackMode = 'melodic' | 'harmonic';
export type GameMode = 'interval' | 'direction';
export type PianoSound = '88-virtual' | 'dusty-keys';
export type DirectionAnswer = 'higher' | 'lower' | 'same';

export interface IntervalDef {
  name: IntervalName;
  semitones: number;
  shortName: string;
  fullName: string;
  mnemonic: string;
}

export interface GameQuestion {
  rootKey: number;
  intervalDef: IntervalDef;
  direction: 'ascending' | 'descending';
  targetKey: number;
}

export interface GameSettings {
  enabledIntervals: Set<IntervalName>;
  direction: Direction;
  playbackMode: PlaybackMode;
  gameMode: GameMode;
  autoPlay: boolean;
  showRootKey: boolean;
  fixedRoot: boolean;
  pianoSound: PianoSound;
  debugMode: boolean;
}

export interface IntervalStat {
  correct: number;
  total: number;
}

export interface ScoreState {
  correct: number;
  total: number;
  streak: number;
  bestStreak: number;
  intervalStats: Partial<Record<IntervalName, IntervalStat>>;
}

export interface LevelState {
  levelMode: boolean;
  currentLevel: number;
  correctInLevel: number;
}

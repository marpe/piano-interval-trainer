import type { GameSettings, ScoreState, LevelState, IntervalName, Direction, PlaybackMode, GameMode, PianoSound } from './types';
import { DEFAULT_ENABLED } from './intervals';

const STORAGE_KEY = 'interval-trainer-v1';

const VALID_DIRECTIONS = new Set<Direction>(['ascending', 'descending', 'both']);
const VALID_PLAYBACK = new Set<PlaybackMode>(['melodic', 'harmonic']);
const VALID_GAME_MODES = new Set<GameMode>(['interval', 'direction']);
const VALID_SOUNDS = new Set<PianoSound>(['88-virtual', 'dusty-keys']);

export interface PersistedState {
  settings: GameSettings;
  volume: number;
}

export function loadState(): PersistedState {
  const defaults: PersistedState = {
    settings: {
      enabledIntervals: new Set(DEFAULT_ENABLED),
      direction: 'ascending',
      playbackMode: 'melodic',
      gameMode: 'interval',
      autoPlay: true,
      showRootKey: true,
      fixedRoot: false,
      pianoSound: '88-virtual' as PianoSound,
      debugMode: false,
    },
    volume: 0.5,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw);

    const enabledIntervals = new Set<IntervalName>(
      Array.isArray(p.enabledIntervals) && p.enabledIntervals.length > 0
        ? p.enabledIntervals
        : DEFAULT_ENABLED
    );

    return {
      settings: {
        enabledIntervals,
        direction: VALID_DIRECTIONS.has(p.direction) ? p.direction : defaults.settings.direction,
        playbackMode: VALID_PLAYBACK.has(p.playbackMode) ? p.playbackMode : defaults.settings.playbackMode,
        gameMode: VALID_GAME_MODES.has(p.gameMode) ? p.gameMode : defaults.settings.gameMode,
        autoPlay: typeof p.autoPlay === 'boolean' ? p.autoPlay : defaults.settings.autoPlay,
        showRootKey: typeof p.showRootKey === 'boolean' ? p.showRootKey : defaults.settings.showRootKey,
        fixedRoot: typeof p.fixedRoot === 'boolean' ? p.fixedRoot : defaults.settings.fixedRoot,
        pianoSound: VALID_SOUNDS.has(p.pianoSound) ? p.pianoSound : defaults.settings.pianoSound,
        debugMode: typeof p.debugMode === 'boolean' ? p.debugMode : false,
      },
      volume: typeof p.volume === 'number' ? Math.max(0, Math.min(1, p.volume)) : defaults.volume,
    };
  } catch {
    return defaults;
  }
}

const SCORE_KEY = 'interval-trainer-scores-v1';

export function emptyScore(): ScoreState {
  return { correct: 0, total: 0, streak: 0, bestStreak: 0, intervalStats: {} };
}

export function loadScores(): ScoreState {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    if (!raw) return emptyScore();
    const p = JSON.parse(raw);
    return {
      correct:     typeof p.correct     === 'number' ? p.correct     : 0,
      total:       typeof p.total       === 'number' ? p.total       : 0,
      streak:      typeof p.streak      === 'number' ? p.streak      : 0,
      bestStreak:  typeof p.bestStreak  === 'number' ? p.bestStreak  : 0,
      intervalStats: p.intervalStats && typeof p.intervalStats === 'object' ? p.intervalStats : {},
    };
  } catch {
    return emptyScore();
  }
}

export function saveScores(score: ScoreState): void {
  localStorage.setItem(SCORE_KEY, JSON.stringify(score));
}

const LEVEL_KEY = 'interval-trainer-level-v1';

export function loadLevelState(): LevelState {
  const defaults: LevelState = { levelMode: false, currentLevel: 1, correctInLevel: 0 };
  try {
    const raw = localStorage.getItem(LEVEL_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw);
    return {
      levelMode: typeof p.levelMode === 'boolean' ? p.levelMode : false,
      currentLevel: typeof p.currentLevel === 'number' && p.currentLevel >= 1 ? p.currentLevel : 1,
      correctInLevel: typeof p.correctInLevel === 'number' && p.correctInLevel >= 0 ? p.correctInLevel : 0,
    };
  } catch {
    return defaults;
  }
}

export function saveLevelState(state: LevelState): void {
  localStorage.setItem(LEVEL_KEY, JSON.stringify(state));
}

export function saveState(settings: GameSettings, volume: number): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    enabledIntervals: [...settings.enabledIntervals],
    direction: settings.direction,
    playbackMode: settings.playbackMode,
    gameMode: settings.gameMode,
    autoPlay: settings.autoPlay,
    showRootKey: settings.showRootKey,
    fixedRoot: settings.fixedRoot,
    pianoSound: settings.pianoSound,
    debugMode: settings.debugMode,
    volume,
  }));
}

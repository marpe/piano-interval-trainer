import { createStore, produce } from 'solid-js/store';
import { createSignal, createEffect, onMount } from 'solid-js';
import { Game } from './components/Game';
import type { GameSettings, ScoreState, LevelState, IntervalStat, IntervalName, Direction, PlaybackMode, GameMode, PianoSound } from './types';
import { DEFAULT_ENABLED, ALL_ENABLED, MAX_LEVEL, CORRECT_PER_LEVEL } from './intervals';
import { initAudio, setVolume, setSound } from './audio';
import { loadState, saveState, loadScores, saveScores, emptyScore, loadLevelState, saveLevelState } from './storage';
import './App.css';

export function App() {
  const saved = loadState();

  const [settings, setSettings] = createStore<GameSettings>(saved.settings);
  const [volume, setVolumeState] = createSignal(saved.volume);
  const [resetTick, setResetTick] = createSignal(0);

  const [score, setScore] = createStore<ScoreState>(loadScores());
  const [levelState, setLevelState] = createStore<LevelState>(loadLevelState());

  onMount(() => {
    initAudio(saved.settings.pianoSound);
    setVolume(saved.volume);
  });

  createEffect(() => {
    saveScores({
      correct: score.correct,
      total: score.total,
      streak: score.streak,
      bestStreak: score.bestStreak,
      intervalStats: score.intervalStats,
    });
  });

  createEffect(() => {
    saveState(
      {
        enabledIntervals: settings.enabledIntervals,
        direction: settings.direction,
        playbackMode: settings.playbackMode,
        gameMode: settings.gameMode,
        autoPlay: settings.autoPlay,
        showRootKey: settings.showRootKey,
        fixedRoot: settings.fixedRoot,
        pianoSound: settings.pianoSound,
        debugMode: settings.debugMode,
      },
      volume()
    );
  });

  createEffect(() => {
    saveLevelState({
      levelMode: levelState.levelMode,
      currentLevel: levelState.currentLevel,
      correctInLevel: levelState.correctInLevel,
    });
  });

  function resetIntervals() { setSettings('enabledIntervals', new Set(DEFAULT_ENABLED)); }
  function enableAllIntervals() { setSettings('enabledIntervals', new Set(ALL_ENABLED)); }

  function toggleInterval(name: IntervalName) {
    const current = settings.enabledIntervals;
    if (current.has(name) && current.size === 1) {
      return;
    }
    const next = new Set(current);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSettings('enabledIntervals', next);
  }

  function handleVolumeChange(v: number) {
    setVolumeState(v);
    setVolume(v);
  }

  function setDirection(d: Direction) { setSettings('direction', d); }
  function setPlaybackMode(m: PlaybackMode) { setSettings('playbackMode', m); }
  function setGameMode(m: GameMode) { setSettings('gameMode', m); }
  function setAutoPlay(v: boolean) { setSettings('autoPlay', v); }
  function setShowRootKey(v: boolean) { setSettings('showRootKey', v); }
  function setFixedRoot(v: boolean) { setSettings('fixedRoot', v); }
  function setPianoSound(s: PianoSound) { setSettings('pianoSound', s); setSound(s); }
  function setDebugMode(v: boolean) { setSettings('debugMode', v); }

  function toggleLevelMode() {
    setLevelState('levelMode', !levelState.levelMode);
  }

  function resetLevel() {
    setLevelState({ currentLevel: 1, correctInLevel: 0 });
  }

  function levelUp() {
    setLevelState({ currentLevel: Math.min(levelState.currentLevel + 1, MAX_LEVEL), correctInLevel: 0 });
  }

  function levelDown() {
    setLevelState({ currentLevel: Math.max(levelState.currentLevel - 1, 1), correctInLevel: 0 });
  }

  function handleScore(correct: boolean, intervalName: IntervalName) {
    setScore(produce((s: ScoreState) => {
      s.correct += correct ? 1 : 0;
      s.total += 1;
      s.streak = correct ? s.streak + 1 : 0;
      s.bestStreak = correct ? Math.max(s.bestStreak, s.streak + 1) : s.bestStreak;
      const stat: IntervalStat = s.intervalStats[intervalName] ?? { correct: 0, total: 0 };
      s.intervalStats[intervalName] = {
        correct: stat.correct + (correct ? 1 : 0),
        total: stat.total + 1,
      };
    }));

    if (levelState.levelMode) {
      if (correct) {
        if (levelState.currentLevel >= MAX_LEVEL) {
          // At max level: cap the dot fill at CORRECT_PER_LEVEL
          if (levelState.correctInLevel < CORRECT_PER_LEVEL) {
            setLevelState('correctInLevel', levelState.correctInLevel + 1);
          }
        } else {
          const next = levelState.correctInLevel + 1;
          if (next >= CORRECT_PER_LEVEL) {
            setLevelState({ currentLevel: levelState.currentLevel + 1, correctInLevel: 0 });
          } else {
            setLevelState('correctInLevel', next);
          }
        }
      } else {
        setLevelState('correctInLevel', Math.max(0, levelState.correctInLevel - 1));
      }
    }
  }

  function resetScores() {
    setScore(emptyScore());
    setLevelState({ currentLevel: 1, correctInLevel: 0 });
    setResetTick(t => t + 1);
  }

  return (
    <div class="app">
      <header>
        <div class="header-logo">
          <svg class="logo-svg" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {/* Piano keys */}
            <rect x="4" y="8" width="9" height="26" rx="2" fill="#e8e8e8"/>
            <rect x="14" y="8" width="9" height="26" rx="2" fill="#e8e8e8"/>
            <rect x="24" y="8" width="9" height="26" rx="2" fill="#e8e8e8"/>
            <rect x="34" y="8" width="9" height="26" rx="2" fill="#e8e8e8"/>
            {/* Black keys */}
            <rect x="10" y="8" width="7" height="16" rx="1.5" fill="#1a1a1a"/>
            <rect x="20" y="8" width="7" height="16" rx="1.5" fill="#1a1a1a"/>
            <rect x="30" y="8" width="7" height="16" rx="1.5" fill="#1a1a1a"/>
            {/* Music note */}
            <circle cx="38" cy="40" r="3.5" fill="#e94560"/>
            <rect x="41" y="28" width="2.5" height="13" rx="1.25" fill="#e94560"/>
            <path d="M43.5 28 Q48 30 43.5 35" stroke="#e94560" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          </svg>
          <h1>Piano Interval Trainer</h1>
        </div>
        <a
          class="header-github"
          href="https://github.com/marpe/piano-interval-trainer"
          target="_blank"
          rel="noopener noreferrer"
          title="View on GitHub"
        >
          <svg class="github-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.742 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          GitHub
        </a>
      </header>
      <main>
        <Game
          settings={settings}
          levelState={levelState}
          score={score}
          volume={volume()}
          onScore={handleScore}
          onVolumeChange={handleVolumeChange}
          onResetScores={resetScores}
          onToggleDebug={() => setSettings('debugMode', !settings.debugMode)}
          onSetAutoPlay={setAutoPlay}
          onSetShowRootKey={setShowRootKey}
          onSetFixedRoot={setFixedRoot}
          onSetGameMode={setGameMode}
          onSetDirection={setDirection}
          onSetPlaybackMode={setPlaybackMode}
          onToggleLevelMode={toggleLevelMode}
          onToggleInterval={toggleInterval}
          onResetIntervals={resetIntervals}
          onEnableAllIntervals={enableAllIntervals}
          resetTick={resetTick()}
          onLevelUp={levelUp}
          onLevelDown={levelDown}
        />
      </main>
    </div>
  );
}

import { createStore, produce } from 'solid-js/store';
import { createSignal, createEffect, onMount, Show } from 'solid-js';
import { Game } from './components/Game';
import { Settings } from './components/Settings';
import type { GameSettings, ScoreState, LevelState, IntervalStat, IntervalName, Direction, PlaybackMode, GameMode, PianoSound } from './types';
import { DEFAULT_ENABLED, ALL_ENABLED, MAX_LEVEL, CORRECT_PER_LEVEL } from './intervals';
import { initAudio, setVolume, setSound } from './audio';
import { loadState, saveState, loadScores, saveScores, emptyScore, loadLevelState, saveLevelState } from './storage';
import './App.css';

export function App() {
  const saved = loadState();

  const [settings, setSettings] = createStore<GameSettings>(saved.settings);
  const [volume, setVolumeState] = createSignal(saved.volume);
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [settingsClosing, setSettingsClosing] = createSignal(false);
  const [settingsPinned, setSettingsPinned] = createSignal(false);

  function openSettings() { setSettingsOpen(true); }
  function closeSettings() {
    setSettingsPinned(false);
    setSettingsClosing(true);
    setTimeout(() => { setSettingsOpen(false); setSettingsClosing(false); }, 280);
  }
  function toggleSettings() {
    if (settingsOpen()) {
      closeSettings();
    } else {
      openSettings();
    }
  }

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
      </header>
      <main classList={{ 'main-pinned': settingsPinned() && settingsOpen() }}>
        <Game
          settings={settings}
          levelState={levelState}
          score={score}
          volume={volume()}
          onScore={handleScore}
          onResetScores={resetScores}
          onVolumeChange={handleVolumeChange}
          onToggleDebug={() => setSettings('debugMode', !settings.debugMode)}
          onSetAutoPlay={setAutoPlay}
          onSetShowRootKey={setShowRootKey}
          onSetFixedRoot={setFixedRoot}
          onSetGameMode={setGameMode}
          onSetDirection={setDirection}
          onSetPlaybackMode={setPlaybackMode}
          onOpenSettings={toggleSettings}
          onLevelUp={levelUp}
          onLevelDown={levelDown}
        />

        {/* Settings drawer */}
        <Show when={settingsOpen()}>
          <Show when={!settingsPinned()}>
            <div class="drawer-backdrop" onClick={closeSettings} />
          </Show>
          <div class="drawer" classList={{ 'drawer-closing': settingsClosing(), 'drawer-pinned': settingsPinned() }}>
            <div class="drawer-inner-header">
              <span class="drawer-title">Intervals</span>
              <button
                class="btn-pin"
                classList={{ active: settingsPinned() }}
                onClick={() => setSettingsPinned(!settingsPinned())}
                title={settingsPinned() ? 'Unpin panel' : 'Pin panel open'}
              >{settingsPinned() ? '⊗' : '⊕'}</button>
              <button class="btn-close-drawer" onClick={closeSettings} title="Close">✕</button>
            </div>
            <Settings
              settings={settings}
              levelState={levelState}
              onToggleInterval={toggleInterval}
              onResetIntervals={resetIntervals}
              onEnableAllIntervals={enableAllIntervals}
              onSetDirection={setDirection}
              onSetPlaybackMode={setPlaybackMode}
              onSetGameMode={setGameMode}
              onToggleLevelMode={toggleLevelMode}
              onResetLevel={resetLevel}
            />
          </div>
        </Show>
      </main>
    </div>
  );
}

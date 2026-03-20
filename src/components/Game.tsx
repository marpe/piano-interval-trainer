import { createSignal, createMemo, createEffect, on, For, onCleanup, Show } from 'solid-js';
import type { GameQuestion, GameSettings, ScoreState, LevelState, IntervalName, DirectionAnswer, GameMode, Direction, PlaybackMode } from '../types';
import { ALL_INTERVALS, ROOT_KEY_MIN, ROOT_KEY_MAX, getIntervalsForLevel } from '../intervals';
import { playMelodic, playHarmonic, playKey, playCorrectSound, playWrongSound } from '../audio';
import { Piano } from './Piano';
import { ScorePopover } from './ScorePopover';
import { LevelProgress } from './LevelProgress';
import { Settings } from './Settings';

interface GameProps {
  settings: GameSettings;
  levelState: LevelState;
  score: ScoreState;
  volume: number;
  onScore: (correct: boolean, intervalName: IntervalName) => void;
  onToggleDebug: () => void;
  onSetAutoPlay: (v: boolean) => void;
  onSetShowRootKey: (v: boolean) => void;
  onSetFixedRoot: (v: boolean) => void;
  onSetGameMode: (m: GameMode) => void;
  onSetDirection: (d: Direction) => void;
  onSetPlaybackMode: (m: PlaybackMode) => void;
  onVolumeChange: (v: number) => void;
  onResetScores: () => void;
  resetTick: number;
  onToggleLevelMode: () => void;
  onToggleInterval: (name: IntervalName) => void;
  onResetIntervals: () => void;
  onEnableAllIntervals: () => void;
  onLevelUp: () => void;
  onLevelDown: () => void;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestion(settings: GameSettings, enabledIntervals: Set<IntervalName>): GameQuestion {
  const enabled = ALL_INTERVALS.filter(i => enabledIntervals.has(i.name));
  const intervalDef = enabled[randomInt(0, enabled.length - 1)];

  const effectiveDirection = settings.gameMode === 'direction' ? 'both' : settings.direction;
  const direction: 'ascending' | 'descending' =
    effectiveDirection === 'both'
      ? randomInt(0, 1) === 0 ? 'ascending' : 'descending'
      : effectiveDirection;

  const semitones = intervalDef.semitones;
  let rootKey: number;
  if (settings.fixedRoot) {
    rootKey = 40; // C4
  } else {
    let rootMin = ROOT_KEY_MIN;
    let rootMax = ROOT_KEY_MAX;
    if (direction === 'ascending') {
      rootMax = Math.min(rootMax, 88 - semitones);
    } else {
      rootMin = Math.max(rootMin, 1 + semitones);
    }
    rootKey = randomInt(rootMin, rootMax);
  }
  const targetKey = direction === 'ascending' ? rootKey + semitones : rootKey - semitones;

  return { rootKey, intervalDef, direction, targetKey };
}

const DIRECTION_ANSWERS: { answer: DirectionAnswer; label: string; icon: string }[] = [
  { answer: 'lower',  label: 'Lower',  icon: '↓' },
  { answer: 'same',   label: 'Same',   icon: '↔' },
  { answer: 'higher', label: 'Higher', icon: '↑' },
];

function getCorrectDirectionAnswer(q: GameQuestion): DirectionAnswer {
  if (q.targetKey > q.rootKey) {
    return 'higher';
  }
  if (q.targetKey < q.rootKey) {
    return 'lower';
  }
  return 'same';
}

export function Game(props: GameProps) {
  const effectiveEnabledIntervals = createMemo(() =>
    props.levelState.levelMode
      ? getIntervalsForLevel(props.levelState.currentLevel)
      : props.settings.enabledIntervals
  );

  const [question, setQuestion] = createSignal<GameQuestion>(
    generateQuestion(props.settings, effectiveEnabledIntervals())
  );
  const [intervalBtnHovered, setIntervalBtnHovered] = createSignal(false);
  const [answered, setAnswered] = createSignal(false);
  const [answerResult, setAnswerResult] = createSignal<'correct' | 'wrong' | null>(null);
  const [selectedAnswer, setSelectedAnswer] = createSignal<IntervalName | null>(null);
  const [selectedDirAnswer, setSelectedDirAnswer] = createSignal<DirectionAnswer | null>(null);
  const [hoveredKey, setHoveredKey] = createSignal<Set<number> | null>(null);
  const [levelUpTick, setLevelUpTick] = createSignal(0);
  const [showShortcuts, setShowShortcuts] = createSignal(false);
  const [intervalsOpen, setIntervalsOpen] = createSignal(false);
  const [intervalsClosing, setIntervalsClosing] = createSignal(false);
  const [pressedPlay, setPressedPlay] = createSignal(false);
  const [pressedNext, setPressedNext] = createSignal(false);
  const [pressedInterval, setPressedInterval] = createSignal<IntervalName | null>(null);
  const [pressedDir, setPressedDir] = createSignal<DirectionAnswer | null>(null);
  const [isPlayingAnim, setIsPlayingAnim] = createSignal(false);
  let playAnimTimer: ReturnType<typeof setTimeout> | null = null;

  function openIntervals() { setIntervalsOpen(true); }
  function closeIntervals() {
    setIntervalsClosing(true);
    setTimeout(() => { setIntervalsOpen(false); setIntervalsClosing(false); }, 150);
  }
  function toggleIntervals() {
    if (intervalsOpen()) {
      closeIntervals();
    } else {
      openIntervals();
    }
  }

  // Close the intervals popover when switching to level mode (button disappears)
  createEffect(on(() => props.levelState.levelMode, (levelMode) => {
    if (levelMode && intervalsOpen()) {
      closeIntervals();
    }
  }, { defer: true }));

  function triggerPlayAnim() {
    if (playAnimTimer !== null) {
      clearTimeout(playAnimTimer);
    }
    setIsPlayingAnim(false);
    queueMicrotask(() => {
      setIsPlayingAnim(true);
      playAnimTimer = setTimeout(() => setIsPlayingAnim(false), 1400);
    });
  }

  function flashPress<T>(setter: (v: T) => void, value: T, reset: T) {
    setter(value);
    setTimeout(() => setter(reset), 150);
  }

  // Detect level-up
  createEffect(on(
    () => props.levelState.currentLevel,
    (curr, prev) => {
      if (prev !== undefined && curr > prev) {
        setLevelUpTick(t => t + 1);
      }
    }
  ));

  // Derived hover state — computed once, read by every button in the For loops
  // Only highlight interval buttons when root is visible; otherwise it reveals the root position
  const hoveredSemitones = createMemo((): Set<number> | null => {
    if (!answered() && !props.settings.showRootKey && !props.settings.fixedRoot) {
      return null;
    }
    const hk = hoveredKey();
    if (hk === null || hk.size === 0) {
      return null;
    }
    const root = question().rootKey;
    return new Set([...hk].map(k => Math.abs(k - root)));
  });

  const enabledIntervals = () =>
    ALL_INTERVALS.filter(i => effectiveEnabledIntervals().has(i.name));

  const possibleKeys = createMemo((): Set<number> | null => {
    const effectiveShowRoot = props.settings.showRootKey || props.settings.fixedRoot;
    if (answered() || !effectiveShowRoot || props.settings.gameMode === 'direction') {
      return null;
    }
    const root = question().rootKey;
    const dir = props.settings.direction;
    const nonZero = enabledIntervals().map(i => i.semitones).filter(s => s > 0);
    if (nonZero.length === 0) {
      return null;
    }
    const minS = Math.min(...nonZero);
    const maxS = Math.max(...nonZero);
    const keys = new Set<number>();
    for (let s = minS; s <= maxS; s++) {
      if (dir === 'ascending' || dir === 'both') {
        const k = root + s; if (k >= 1 && k <= 88) keys.add(k);
      }
      if (dir === 'descending' || dir === 'both') {
        const k = root - s; if (k >= 1 && k <= 88) keys.add(k);
      }
    }
    return keys;
  });

  const hoveredDirAnswer = createMemo((): DirectionAnswer | null => {
    if (!answered() && !props.settings.showRootKey && !props.settings.fixedRoot) {
      return null;
    }
    const hk = hoveredKey();
    if (hk === null || hk.size === 0) {
      return null;
    }
    const k = [...hk][0];
    const rk = question().rootKey;
    if (k > rk) {
      return 'higher';
    }
    if (k < rk) {
      return 'lower';
    }
    return 'same';
  });

  // Keyboard shortcuts
  const KEY_DIGITS = ['1','2','3','4','5','6','7','8','9','0','-','='];

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT') {
      return;
    }
    if (e.key === 'd' || e.key === 'D') {
      props.onToggleDebug();
    } else if (e.key === ' ') {
      e.preventDefault();
      flashPress(setPressedPlay, true, false);
      handlePlayAgain();
    } else if (e.key === 'Enter') {
      if (answered()) {
        flashPress(setPressedNext, true, false);
        handleNext();
      }
    } else if (props.settings.gameMode === 'direction') {
      if (e.key === 'ArrowUp'   || e.key === '3') {
        e.preventDefault();
        flashPress(setPressedDir, 'higher' as DirectionAnswer, null);
        handleDirectionAnswer('higher');
      }
      if (e.key === 'ArrowDown' || e.key === '1') {
        e.preventDefault();
        flashPress(setPressedDir, 'lower' as DirectionAnswer, null);
        handleDirectionAnswer('lower');
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === '=' || e.key === '2') {
        flashPress(setPressedDir, 'same' as DirectionAnswer, null);
        handleDirectionAnswer('same');
      }
    } else {
      const idx = KEY_DIGITS.indexOf(e.key);
      if (idx !== -1) {
        const intervals = ALL_INTERVALS.filter(i => effectiveEnabledIntervals().has(i.name));
        if (idx < intervals.length) {
          flashPress(setPressedInterval, intervals[idx].name, null);
          handleAnswer(intervals[idx].name);
        }
      }
    }
  }

  let cancelPlayback: (() => void) | null = null;

  function playQuestion(q: GameQuestion) {
    if (cancelPlayback) {
      cancelPlayback();
    }
    const { rootKey, targetKey } = q;
    if (props.settings.playbackMode === 'melodic' || props.settings.gameMode === 'direction') {
      cancelPlayback = playMelodic(rootKey, targetKey);
    } else {
      cancelPlayback = playHarmonic(rootKey, targetKey);
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  onCleanup(() => {
    if (cancelPlayback) {
      cancelPlayback();
    }
    if (playAnimTimer !== null) {
      clearTimeout(playAnimTimer);
    }
    window.removeEventListener('keydown', handleKeyDown);
  });

  // Regenerate question when game-affecting settings or level change
  createEffect(on(
    () => [
      props.settings.direction,
      effectiveEnabledIntervals(),
      props.settings.fixedRoot,
    ] as const,
    () => {
      if (answered()) {
        return;
      }
      const q = generateQuestion(props.settings, effectiveEnabledIntervals());
      setQuestion(q);
      setAnswered(false);
      setAnswerResult(null);
      setSelectedAnswer(null);
      setSelectedDirAnswer(null);
      if (props.settings.autoPlay) {
        playQuestion(q);
      }
    },
    { defer: true }
  ));

  createEffect(on(
    () => props.settings.gameMode,
    () => {
      const q = generateQuestion(props.settings, effectiveEnabledIntervals());
      setQuestion(q);
      setAnswered(false);
      setAnswerResult(null);
      setSelectedAnswer(null);
      setSelectedDirAnswer(null);
      if (props.settings.autoPlay) {
        playQuestion(q);
      }
    },
    { defer: true }
  ));

  createEffect(on(
    () => props.resetTick,
    () => {
      if (cancelPlayback) {
        cancelPlayback();
      }
      const q = generateQuestion(props.settings, effectiveEnabledIntervals());
      setQuestion(q);
      setAnswered(false);
      setAnswerResult(null);
      setSelectedAnswer(null);
      setSelectedDirAnswer(null);
      if (props.settings.autoPlay) {
        playQuestion(q);
      }
    },
    { defer: true }
  ));

  function handleAnswer(name: IntervalName) {
    if (answered()) {
      return;
    }
    const correct = name === question().intervalDef.name;
    setSelectedAnswer(name);
    setAnswerResult(correct ? 'correct' : 'wrong');
    setAnswered(true);
    props.onScore(correct, question().intervalDef.name);
    if (correct) {
      playCorrectSound();
    } else {
      playWrongSound();
    }
  }

  function handleDirectionAnswer(answer: DirectionAnswer) {
    if (answered()) {
      return;
    }
    const correct = answer === getCorrectDirectionAnswer(question());
    setSelectedDirAnswer(answer);
    setAnswerResult(correct ? 'correct' : 'wrong');
    setAnswered(true);
    props.onScore(correct, question().intervalDef.name);
    if (correct) {
      playCorrectSound();
    } else {
      playWrongSound();
    }
  }

  function handleNext() {
    const q = generateQuestion(props.settings, effectiveEnabledIntervals());
    setQuestion(q);
    setAnswered(false);
    setAnswerResult(null);
    setSelectedAnswer(null);
    setSelectedDirAnswer(null);
    if (props.settings.autoPlay) {
      playQuestion(q);
      triggerPlayAnim();
    }
  }

  function handlePlayAgain() {
    playQuestion(question());
    triggerPlayAnim();
  }

  function handlePianoKeyClick(k: number) {
    playKey(k);
  }

  return (
    <div class="game-panel">
      <ScorePopover score={props.score}>
        <span class="settings-bar-divider" />
        {/* Mode */}
        <div class="seg-btns">
          <button class="option-btn" classList={{ active: props.settings.gameMode === 'interval' }} onClick={() => props.onSetGameMode('interval')} data-tooltip="Intervals — name the interval">♩</button>
          <button class="option-btn" classList={{ active: props.settings.gameMode === 'direction' }} onClick={() => props.onSetGameMode('direction')} data-tooltip="Pitch Direction — higher, lower, same?">↑↓</button>
        </div>
        {/* Direction — intervals mode only */}
        <Show when={props.settings.gameMode === 'interval'}>
          <div class="seg-btns">
            <button class="option-btn" classList={{ active: props.settings.direction === 'ascending' }}  onClick={() => props.onSetDirection('ascending')}  data-tooltip="Ascending">↑</button>
            <button class="option-btn" classList={{ active: props.settings.direction === 'descending' }} onClick={() => props.onSetDirection('descending')} data-tooltip="Descending">↓</button>
            <button class="option-btn" classList={{ active: props.settings.direction === 'both' }}       onClick={() => props.onSetDirection('both')}       data-tooltip="Both directions">⇅</button>
          </div>
          <div class="seg-btns">
            <button class="option-btn" classList={{ active: props.settings.playbackMode === 'melodic' }}  onClick={() => props.onSetPlaybackMode('melodic')}  data-tooltip="Melodic — notes in sequence">▷</button>
            <button class="option-btn" classList={{ active: props.settings.playbackMode === 'harmonic' }} onClick={() => props.onSetPlaybackMode('harmonic')} data-tooltip="Harmonic — notes simultaneously">♫</button>
          </div>
        </Show>
        <span class="settings-bar-divider" />
        {/* Playback / display options */}
        <button class="option-btn" classList={{ active: props.settings.autoPlay }} onClick={() => props.onSetAutoPlay(!props.settings.autoPlay)} data-tooltip="Auto-play each question">▶</button>
        <button class="option-btn" classList={{ active: props.settings.showRootKey, 'option-btn-off': props.settings.fixedRoot }} onClick={() => { if (!props.settings.fixedRoot) props.onSetShowRootKey(!props.settings.showRootKey); }} data-tooltip={props.settings.fixedRoot ? 'Root always visible (fixed root on)' : 'Show root key on piano before answering'}>♩</button>
        <button class="option-btn" classList={{ active: props.settings.fixedRoot }} onClick={() => props.onSetFixedRoot(!props.settings.fixedRoot)} data-tooltip="Fixed root note (always C4)">C4</button>
        <Show when={import.meta.env.DEV}>
          <button class="option-btn" classList={{ active: props.settings.debugMode }} onClick={props.onToggleDebug} data-tooltip="Show answer (debug mode)">D</button>
        </Show>
        <button class="option-btn" classList={{ active: props.levelState.levelMode }} onClick={props.onToggleLevelMode} data-tooltip="Level Mode">LV</button>
        <Show when={!props.levelState.levelMode}>
          <div class="intervals-trigger-wrap">
            <button class="option-btn" classList={{ active: intervalsOpen() }} onClick={toggleIntervals} data-tooltip="Select intervals">𝄞</button>
            <Show when={intervalsOpen()}>
              <div class="intervals-backdrop" onClick={closeIntervals} />
              <div class="intervals-popover" classList={{ 'intervals-popover-closing': intervalsClosing() }}>
                <div class="intervals-popover-header">
                  <span class="intervals-popover-title">Intervals</span>
                  <button class="btn-close-popover" onClick={closeIntervals} title="Close">✕</button>
                </div>
                <Settings
                  settings={props.settings}
                  levelState={props.levelState}
                  onToggleInterval={props.onToggleInterval}
                  onResetIntervals={props.onResetIntervals}
                  onEnableAllIntervals={props.onEnableAllIntervals}
                />
              </div>
            </Show>
          </div>
        </Show>
        <button class="option-btn" onClick={props.onResetScores} data-tooltip="Reset scores & streaks">↺</button>
        {/* Right-aligned: volume + shortcuts + intervals */}
        <div class="settings-bar-right">
          <span class="volume-icon">{props.volume === 0 ? '🔇' : props.volume < 0.5 ? '🔉' : '🔊'}</span>
          <input type="range" min="0" max="1" step="0.05" value={props.volume} onInput={e => props.onVolumeChange(parseFloat(e.currentTarget.value))} class="volume-slider-mini" title="Volume" />
          <div class="shortcuts-wrap">
            <button class="btn-shortcuts" onMouseEnter={() => setShowShortcuts(true)} onMouseLeave={() => setShowShortcuts(false)}>?</button>
            <Show when={showShortcuts()}>
              <div class="shortcuts-popover">
                <div class="shortcuts-title">Keyboard shortcuts</div>
                <div class="shortcuts-list">
                  <div class="shortcut-row"><kbd>Space</kbd><span>Play Again</span></div>
                  <div class="shortcut-row"><kbd>Enter</kbd><span>Next question</span></div>
                  <div class="shortcut-row"><kbd>D</kbd><span>Toggle debug</span></div>
                  <Show when={props.settings.gameMode === 'interval'}>
                    <div class="shortcut-row"><kbd>1</kbd><span class="shortcut-muted">–</span><kbd>0</kbd><kbd>-</kbd><kbd>=</kbd><span>Select interval</span></div>
                  </Show>
                  <Show when={props.settings.gameMode === 'direction'}>
                    <div class="shortcut-row"><kbd>1</kbd><span>Lower</span></div>
                    <div class="shortcut-row"><kbd>2</kbd><span>Same</span></div>
                    <div class="shortcut-row"><kbd>3</kbd><span>Higher</span></div>
                    <div class="shortcut-row"><kbd>↓</kbd><span>Lower</span></div>
                    <div class="shortcut-row"><kbd>=</kbd><span>Same</span></div>
                    <div class="shortcut-row"><kbd>↑</kbd><span>Higher</span></div>
                  </Show>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </ScorePopover>

      <Show when={props.levelState.levelMode}>
        <LevelProgress levelState={props.levelState} levelUpTick={levelUpTick()} />
        <Show when={props.settings.debugMode}>
          <div class="debug-level-btns">
            <button class="option-btn" onClick={props.onLevelDown}>LV−</button>
            <button class="option-btn" onClick={props.onLevelUp}>LV+</button>
          </div>
        </Show>
      </Show>

      <Show when={props.settings.debugMode}>
        <div class="debug-banner">
          <span class="debug-label">DEBUG</span>
          <span class="debug-answer">
            {question().intervalDef.shortName}
            <span class="debug-sep">·</span>
            {question().intervalDef.fullName}
            <span class="debug-sep">·</span>
            {question().direction}
            <span class="debug-sep">·</span>
            root {question().rootKey} → target {question().targetKey}
          </span>
          <Show when={hoveredKey() !== null}>
            <span class="debug-hover">hover {[...(hoveredKey()!)][0]}</span>
          </Show>
        </div>
      </Show>

      <Piano
        rootKey={question().rootKey}
        targetKey={question().targetKey}
        answered={answered()}
        showRootKey={props.settings.showRootKey || props.settings.fixedRoot || intervalBtnHovered()}
        debugMode={props.settings.debugMode}
        hoveredKey={hoveredKey()}
        possibleKeys={possibleKeys()}
        answerLabel={answered() ? { shortName: question().intervalDef.shortName, fullName: question().intervalDef.fullName } : undefined}
        onKeyClick={handlePianoKeyClick}
        onKeyHover={(k) => setHoveredKey(k !== null ? new Set([k]) : null)}
      />

      <div class="playback-controls">
        <div class="btn-play-wrap">
          <Show when={isPlayingAnim()}>
            <div class="note-fly-wrap">
              <span class="note-fly note-fly-1">♩</span>
              <span class="note-fly note-fly-2">♩</span>
            </div>
          </Show>
          <button class="btn-play" classList={{ 'btn-kbd-active': pressedPlay() }} onClick={handlePlayAgain} title="Replay the interval">
            <span class="btn-icon">↺</span>
            <span>Play Again</span>
          </button>
        </div>
      </div>

      <Show when={props.settings.gameMode === 'direction'} fallback={
        <div class="interval-grid">
          <For each={enabledIntervals()}>
            {(interval) => {
              const isSelected = () => selectedAnswer() === interval.name;
              const isCorrectAnswer = () => answered() && interval.name === question().intervalDef.name;
              const isWrongSelected = () => isSelected() && answerResult() === 'wrong';
              return (
                <button
                  class="interval-btn"
                  classList={{
                    'flash-correct': isCorrectAnswer(),
                    'flash-wrong': isWrongSelected(),
                    'revealed': answered() && isCorrectAnswer() && !isSelected(),
                    'btn-hovered': !answered() && (hoveredSemitones()?.has(interval.semitones) ?? false),
                    'btn-kbd-active': pressedInterval() === interval.name,
                    'interval-btn-preview': answered(),
                  }}
                  onClick={() => {
                    if (!answered()) {
                      handleAnswer(interval.name);
                    } else {
                      const q = question();
                      playMelodic(q.rootKey, q.rootKey + interval.semitones);
                    }
                  }}
                  onMouseEnter={() => {
                    setIntervalBtnHovered(true);
                    const q = question();
                    const s = interval.semitones;
                    const dir = props.settings.direction;
                    const root = q.rootKey;
                    const keys = new Set<number>();
                    if (dir === 'ascending' || dir === 'both') {
                      const k = root + s; if (k >= 1 && k <= 88) keys.add(k);
                    }
                    if (dir === 'descending' || dir === 'both') {
                      const k = root - s; if (k >= 1 && k <= 88) keys.add(k);
                    }
                    setHoveredKey(keys);
                  }}
                  onMouseLeave={() => { setIntervalBtnHovered(false); setHoveredKey(null); }}
                  title={answered() ? `Preview: ${interval.mnemonic}` : interval.mnemonic}
                >
                  <span class="btn-short">{interval.shortName}</span>
                </button>
              );
            }}
          </For>
        </div>
      }>
        <div class="direction-grid">
          <For each={DIRECTION_ANSWERS}>
            {({ answer, label, icon }) => {
              const isSelected = () => selectedDirAnswer() === answer;
              const isCorrect = () => answered() && answer === getCorrectDirectionAnswer(question());
              const isWrongSelected = () => isSelected() && answerResult() === 'wrong';

              return (
                <button
                  class="direction-btn"
                  classList={{
                    'flash-correct': isCorrect(),
                    'flash-wrong': isWrongSelected(),
                    'revealed': answered() && isCorrect() && !isSelected(),
                    'btn-hovered': !answered() && hoveredDirAnswer() === answer,
                    'btn-kbd-active': pressedDir() === answer,
                  }}
                  onClick={() => handleDirectionAnswer(answer)}
                  disabled={answered()}
                >
                  <span class="dir-icon">{icon}</span>
                  <span class="dir-label">{label}</span>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
      <button
        class="btn-next"
        classList={{ 'btn-kbd-active': pressedNext() }}
        onClick={handleNext}
        disabled={!answered()}
        title="Next question"
      >
        <span>Next</span>
        <span class="btn-icon">→</span>
      </button>
    </div>
  );
}

import { For, Show } from 'solid-js';
import type { GameSettings, LevelState, IntervalName, Direction, PlaybackMode, GameMode } from '../types';
import { ALL_INTERVALS, INTERVAL_PREVIEWS, getIntervalsForLevel } from '../intervals';
import { playSequence, playMelodic } from '../audio';

const PREVIEW_ROOT = 40; // C4

interface SettingsProps {
  settings: GameSettings;
  levelState: LevelState;
  onToggleInterval: (name: IntervalName) => void;
  onResetIntervals: () => void;
  onEnableAllIntervals: () => void;
  onSetDirection: (d: Direction) => void;
  onSetPlaybackMode: (m: PlaybackMode) => void;
  onSetGameMode: (m: GameMode) => void;
  onToggleLevelMode: () => void;
  onResetLevel: () => void;
}

export function Settings(props: SettingsProps) {
  const levelIntervals = () => getIntervalsForLevel(props.levelState.currentLevel);

  return (
    <div class="settings-panel">
      <section>
        <div class="section-header">
          <h3>Intervals</h3>
          <div class="interval-reset-btns">
            <Show when={!props.levelState.levelMode}>
              <button class="btn-reset" onClick={props.onResetIntervals}>Beginner</button>
              <button class="btn-reset" onClick={props.onEnableAllIntervals}>All</button>
            </Show>
            <Show when={props.levelState.levelMode}>
              <button class="btn-reset" onClick={props.onResetLevel}>Reset Level</button>
            </Show>
          </div>
        </div>

        <div class="level-mode-toggle">
          <label class="toggle-label">
            <input
              type="checkbox"
              checked={props.levelState.levelMode}
              onChange={props.onToggleLevelMode}
            />
            Level Mode
          </label>
          <Show when={props.levelState.levelMode}>
            <span class="level-mode-hint">
              Intervals unlock as you progress — 10 correct answers per level
            </span>
          </Show>
        </div>

        <div class="interval-list">
          <For each={ALL_INTERVALS}>
            {(interval) => {
              const enabled = () => props.levelState.levelMode
                ? levelIntervals().has(interval.name)
                : props.settings.enabledIntervals.has(interval.name);
              const isOnly = () => !props.levelState.levelMode && enabled() && props.settings.enabledIntervals.size === 1;
              const locked = () => props.levelState.levelMode && !levelIntervals().has(interval.name);

              return (
                <div class="interval-row" classList={{ 'interval-row-disabled': !enabled() }}>
                  <label
                    class="interval-check"
                    classList={{
                      disabled: isOnly() || props.levelState.levelMode,
                      'interval-locked': locked(),
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={enabled()}
                      disabled={isOnly() || props.levelState.levelMode}
                      onChange={() => props.onToggleInterval(interval.name)}
                    />
                    <span class="interval-short">{interval.shortName}</span>
                    <span class="interval-name">{interval.fullName}</span>
                    <span class="lock-icon" classList={{ 'lock-hidden': !locked() }}>🔒</span>
                  </label>
                  <button
                    class="btn-preview-bare"
                    onClick={() => playMelodic(PREVIEW_ROOT, PREVIEW_ROOT + interval.semitones)}
                    title={`Play ${interval.name} (2 notes)`}
                  >
                    ▶ ♩♩
                  </button>
                  <button
                    class="btn-preview"
                    onClick={() => playSequence(PREVIEW_ROOT, INTERVAL_PREVIEWS[interval.name])}
                    title={`Preview ${interval.name} — ${interval.mnemonic}`}
                  >
                    ▶ {interval.mnemonic}
                  </button>
                </div>
              );
            }}
          </For>
        </div>
      </section>
    </div>
  );
}

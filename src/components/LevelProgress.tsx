import { For, Show } from 'solid-js';
import type { LevelState } from '../types';
import { MAX_LEVEL, CORRECT_PER_LEVEL, LEVEL_UNLOCKS } from '../intervals';

interface LevelProgressProps {
  levelState: LevelState;
  showLevelUp: boolean;
}

const LEVEL_UP_STARS = [
  { tx: '-28px', ty: '-26px', delay: '0ms'   },
  { tx:   '4px', ty: '-32px', delay: '65ms'  },
  { tx:  '28px', ty: '-22px', delay: '125ms' },
  { tx: '-22px', ty:  '18px', delay: '40ms'  },
  { tx:  '20px', ty:  '22px', delay: '95ms'  },
];

export function LevelProgress(props: LevelProgressProps) {
  const isMaxLevel = () => props.levelState.currentLevel >= MAX_LEVEL;
  const nextUnlocks = () => isMaxLevel() ? [] : LEVEL_UNLOCKS[props.levelState.currentLevel];
  const pct = () => isMaxLevel()
    ? 100
    : (props.levelState.correctInLevel / CORRECT_PER_LEVEL) * 100;

  return (
    <div class="level-progress">
      <div class="level-header">
        <span class="level-badge">
          LV {props.levelState.currentLevel}
          <span class="level-of-max">/{MAX_LEVEL}</span>
        </span>
        <div class="level-bar-wrap">
          <div class="level-bar-track">
            <div class="level-bar-fill" style={{ width: `${pct()}%` }} />
          </div>
          <Show when={props.showLevelUp}>
            <div class="level-up-stars" aria-hidden="true">
              <For each={LEVEL_UP_STARS}>
                {(s) => (
                  <span class="level-up-star" style={`--tx:${s.tx};--ty:${s.ty};animation-delay:${s.delay}`}>★</span>
                )}
              </For>
            </div>
          </Show>
        </div>
        <span class="level-count">
          {isMaxLevel() ? CORRECT_PER_LEVEL : props.levelState.correctInLevel}/{CORRECT_PER_LEVEL}
        </span>
        <Show when={!isMaxLevel()}>
          <span class="level-next-info">
            Next: <strong>{nextUnlocks().join(', ')}</strong>
          </span>
        </Show>
        <Show when={isMaxLevel()}>
          <span class="level-master">Master</span>
        </Show>
      </div>
      <div class="level-dots">
        <For each={Array.from({ length: CORRECT_PER_LEVEL })}>
          {(_, i) => (
            <div
              class="level-dot"
              classList={{ filled: i() < (isMaxLevel() ? CORRECT_PER_LEVEL : props.levelState.correctInLevel) }}
            />
          )}
        </For>
      </div>
    </div>
  );
}

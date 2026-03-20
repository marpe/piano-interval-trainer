import { For, Show, createSignal, JSX } from 'solid-js';
import type { ScoreState } from '../types';
import { ALL_INTERVALS } from '../intervals';

interface ScorePopoverProps {
  score: ScoreState;
  onReset: () => void;
  children?: JSX.Element;
}

export function ScorePopover(props: ScorePopoverProps) {
  const [open, setOpen] = createSignal(false);
  const [closing, setClosing] = createSignal(false);

  const attempted = () =>
    ALL_INTERVALS.filter(i => (props.score.intervalStats[i.name]?.total ?? 0) > 0);

  const accuracy = () =>
    props.score.total === 0 ? '—' : `${Math.round(props.score.correct / props.score.total * 100)}%`;

  function close() {
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, 200);
  }

  function handleStatsClick() {
    if (open()) {
      close();
    } else {
      setOpen(true);
    }
  }

  function handleReset() {
    props.onReset();
    close();
  }

  return (
    <div class="top-bar">
      {/* Row 1: prominent score display */}
      <div class="score-display">
        <span class="score-numbers">
          <strong>{props.score.correct}</strong>
          <span class="score-sep">/</span>
          <span class="score-total">{props.score.total}</span>
          <Show when={props.score.total > 0}>
            <span class="score-pct">{accuracy()}</span>
          </Show>
        </span>
        <span class="score-display-divider" />
        <span class="score-stat">Streak <strong>{props.score.streak}</strong></span>
        <span class="score-stat">Best <strong>{props.score.bestStreak}</strong></span>
        <div class="stats-toggle-row">
          <button class="btn-stats" onClick={handleStatsClick}>
            Stats {open() && !closing() ? '▲' : '▼'}
          </button>
          <Show when={open()}>
            <div class="stats-backdrop" onClick={close} />
            <div class="stats-popover" classList={{ 'stats-closing': closing() }}>
              <div class="stats-popover-header">
                <span class="stats-title">Session Stats</span>
                <span class="stats-accuracy">Overall: <strong>{accuracy()}</strong></span>
                <button class="btn-reset-scores" onClick={e => { e.stopPropagation(); handleReset(); }}>Reset</button>
                <button class="btn-close-stats" onClick={e => { e.stopPropagation(); close(); }}>✕</button>
              </div>
              <Show when={attempted().length === 0}>
                <p class="stats-empty">No questions answered yet.</p>
              </Show>
              <Show when={attempted().length > 0}>
                <div class="stat-rows">
                  <For each={ALL_INTERVALS}>
                    {(interval) => {
                      const stat = () => props.score.intervalStats[interval.name];
                      const total = () => stat()?.total ?? 0;
                      const correct = () => stat()?.correct ?? 0;
                      const pct = () => total() === 0 ? 0 : correct() / total();
                      return (
                        <Show when={total() > 0}>
                          <div class="stat-row">
                            <span class="stat-label" title={interval.name}>{interval.shortName}</span>
                            <div class="stat-bar-track">
                              <div class="stat-bar-correct" style={{ width: `${pct() * 100}%` }} />
                              <div class="stat-bar-incorrect" style={{ width: `${(1 - pct()) * 100}%` }} />
                            </div>
                            <span class="stat-count">
                              {correct()}/{total()}
                              <span class="stat-pct"> {Math.round(pct() * 100)}%</span>
                            </span>
                          </div>
                        </Show>
                      );
                    }}
                  </For>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>

      {/* Row 2: settings buttons */}
      <div class="settings-bar">
        {props.children}
      </div>
    </div>
  );
}

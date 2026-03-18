import { For, Show, createSignal, onMount, onCleanup } from 'solid-js';

const WHITE_W = 28;
const WHITE_H = 90;
const BLACK_W = 16;
const BLACK_H = 56;

const DISPLAY_MIN = 16; // C2
const DISPLAY_MAX = 64; // C6

// Note index: 0=A, 1=A#, 2=B, 3=C, 4=C#, 5=D, 6=D#, 7=E, 8=F, 9=F#, 10=G, 11=G#
const WHITE_NOTES = new Set([0, 2, 3, 5, 7, 8, 10]);

// How many white keys precede each note within its positional octave (A-based)
const WHITE_KEYS_BEFORE = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

// White key index of DISPLAY_MIN (C2): note=3, octave=1 → 1*7 + WHITE_KEYS_BEFORE[3]=2 = 9
const BASE_WHITE_IDX = 9;

function isWhiteKey(k: number): boolean {
  return WHITE_NOTES.has((k - 1) % 12);
}

function getKeyLeft(k: number): number {
  const note = (k - 1) % 12;
  const octave = Math.floor((k - 1) / 12);
  const base = octave * 7 + WHITE_KEYS_BEFORE[note] - BASE_WHITE_IDX;
  return isWhiteKey(k) ? base * WHITE_W : (base + 1) * WHITE_W - BLACK_W / 2;
}

// Returns "C4", "C5", etc. for C notes; null otherwise
function getCLabel(k: number): string | null {
  if ((k - 1) % 12 !== 3) return null;
  const octave = Math.floor((k - 4) / 12) + 1;
  return `C${octave}`;
}

function getKeyCenter(k: number): number {
  return getKeyLeft(k) + (isWhiteKey(k) ? (WHITE_W - 1) / 2 : BLACK_W / 2);
}

function buildArcPath(x1: number, x2: number, scaleVal: number, arcSpace: number): string {
  const mx = (x1 + x2) / 2;
  const dist = Math.abs(x2 - x1);
  const maxH = Math.max(8, (arcSpace - 10) / scaleVal);
  const cy = -(10 + Math.min(dist * 0.22, maxH));
  return `M ${x1},2 Q ${mx},${cy} ${x2},2`;
}

const ALL_KEYS = Array.from({ length: DISPLAY_MAX - DISPLAY_MIN + 1 }, (_, i) => i + DISPLAY_MIN);
const WHITE_KEY_LIST = ALL_KEYS.filter(isWhiteKey);
const BLACK_KEY_LIST = ALL_KEYS.filter(k => !isWhiteKey(k));
const PIANO_WIDTH = WHITE_KEY_LIST.length * WHITE_W;

interface PianoProps {
  rootKey: number;
  targetKey: number;
  answered: boolean;
  showRootKey: boolean;
  debugMode: boolean;
  hoveredKey: Set<number> | null;
  possibleKeys: Set<number> | null;
  onKeyClick: (key: number) => void;
  onKeyHover: (key: number | null) => void;
}

export function Piano(props: PianoProps) {
  let outerRef!: HTMLDivElement;
  const [scale, setScale] = createSignal(1);

  onMount(() => {
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      if (w > 0) setScale(w / PIANO_WIDTH);
    });
    obs.observe(outerRef);
    onCleanup(() => obs.disconnect());
  });

  function renderKey(k: number, white: boolean) {
    const left = getKeyLeft(k);
    const label = white ? getCLabel(k) : null;

    return (
      <div
        class="piano-key"
        classList={{
          white,
          black: !white,
          'key-first': k === DISPLAY_MIN,
          'key-last': k === DISPLAY_MAX,
          'key-root': props.rootKey === k && (props.answered || props.showRootKey || props.debugMode) && !((props.answered || props.debugMode) && props.targetKey === k),
          'key-target': (props.answered || props.debugMode) && props.targetKey === k && props.rootKey !== k,
          'key-both': (props.answered || props.debugMode) && props.targetKey === k && props.rootKey === k,
          'key-hovered': props.hoveredKey !== null && props.hoveredKey.has(k),
          'key-dim': props.possibleKeys !== null && props.rootKey !== k && !props.possibleKeys.has(k),
        }}
        style={{
          left: `${left}px`,
          width: `${white ? WHITE_W - 1 : BLACK_W}px`,
          height: `${white ? WHITE_H : BLACK_H}px`,
        }}
        onClick={() => props.onKeyClick(k)}
        onMouseEnter={() => props.onKeyHover(k)}
        onMouseLeave={() => props.onKeyHover(null)}
      >
        {label && <span class="key-label">{label}</span>}
      </div>
    );
  }

  const ARC_SPACE = 44;

  return (
    <div
      class="piano-outer"
      ref={outerRef}
      style={{ height: `${scale() * WHITE_H + ARC_SPACE}px` }}
    >
      <div
        class="piano"
        style={{
          width: `${PIANO_WIDTH}px`,
          height: `${WHITE_H}px`,
          transform: `scale(${scale()})`,
          'transform-origin': 'top left',
          'margin-top': `${ARC_SPACE}px`,
        }}
      >
        <For each={WHITE_KEY_LIST}>{(k) => renderKey(k, true)}</For>
        <For each={BLACK_KEY_LIST}>{(k) => renderKey(k, false)}</For>
        <Show when={(props.answered || props.debugMode) && props.rootKey !== props.targetKey}>
          <svg
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: `${PIANO_WIDTH}px`,
              height: `${WHITE_H}px`,
              overflow: 'visible',
              'pointer-events': 'none',
              'z-index': 3,
            }}
          >
            <defs>
              <linearGradient
                id="arc-grad"
                gradientUnits="userSpaceOnUse"
                x1={getKeyCenter(props.rootKey)} y1="0"
                x2={getKeyCenter(props.targetKey)} y2="0"
              >
                <stop offset="0%" stop-color="#3a6bc4" />
                <stop offset="100%" stop-color="#4caf50" />
              </linearGradient>
              <marker id="arc-arrow" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill="#2e7d32" />
              </marker>
            </defs>
            <path
              d={buildArcPath(getKeyCenter(props.rootKey), getKeyCenter(props.targetKey), scale(), ARC_SPACE)}
              stroke="url(#arc-grad)"
              stroke-width="2.5"
              fill="none"
              stroke-linecap="round"
              marker-end="url(#arc-arrow)"
            />
          </svg>
        </Show>
      </div>
    </div>
  );
}

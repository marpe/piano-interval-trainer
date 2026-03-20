import { For, Show, onMount, onCleanup, createEffect, on } from 'solid-js';
import type { LevelState } from '../types';
import { MAX_LEVEL, CORRECT_PER_LEVEL, LEVEL_UNLOCKS } from '../intervals';

interface LevelProgressProps {
  levelState: LevelState;
  levelUpTick: number;
}

const CONFETTI_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9ff3', '#ff9f43', '#a29bfe', '#fd79a8', '#55efc4'];

function ConfettiBurst(props: { trigger: number }) {
  let canvasRef!: HTMLCanvasElement;
  let raf = 0;

  function startBurst() {
    cancelAnimationFrame(raf);

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvasRef.width  = W;
    canvasRef.height = H;

    const ctx = canvasRef.getContext('2d')!;
    const originY = H * 0.42;

    function makeParticles(originX: number, side: -1 | 1) {
      return Array.from({ length: 55 }, () => {
        const speed = 3 + Math.random() * 6;
        // Fan mostly upward, inward. vy negative = up. vx toward center.
        const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.9;
        const baseAngle   = -Math.PI / 2 + spreadAngle;
        return {
          x: originX,
          y: originY,
          vx: Math.cos(baseAngle) * speed * 0.6 + side * (1 + Math.random() * 2),
          vy: Math.sin(baseAngle) * speed,
          wobbleAmp:   0.3 + Math.random() * 1.4,
          wobbleFreq:  0.07 + Math.random() * 0.07,
          wobblePhase: Math.random() * Math.PI * 2,
          gravity: 0.13 + Math.random() * 0.08,
          color:    CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          rotation: Math.random() * Math.PI * 2,
          spin:     (Math.random() - 0.5) * 0.24,
          w: 6 + Math.random() * 7,
          h: 3 + Math.random() * 4,
          life:  1,
          decay: 0.008 + Math.random() * 0.009,
        };
      });
    }

    const particles = [
      ...makeParticles(0,  1),
      ...makeParticles(W, -1),
    ];

    function draw() {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of particles) {
        if (p.life <= 0) {
          continue;
        }
        alive = true;
        p.wobblePhase += p.wobbleFreq;
        p.x += p.vx + Math.sin(p.wobblePhase) * p.wobbleAmp;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.rotation += p.spin;
        p.life -= p.decay;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) {
        raf = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    }

    raf = requestAnimationFrame(draw);
  }

  createEffect(on(() => props.trigger, startBurst, { defer: true }));

  onCleanup(() => cancelAnimationFrame(raf));

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: '0',
        width: '100%',
        height: '100%',
        'pointer-events': 'none',
        'z-index': 1000,
      }}
    />
  );
}

export function LevelProgress(props: LevelProgressProps) {
  const isMaxLevel = () => props.levelState.currentLevel >= MAX_LEVEL;
  const nextUnlocks = () => isMaxLevel() ? [] : LEVEL_UNLOCKS[props.levelState.currentLevel];
  const pct = () => isMaxLevel()
    ? 100
    : (props.levelState.correctInLevel / CORRECT_PER_LEVEL) * 100;

  return (
    <div class="level-progress">
      <ConfettiBurst trigger={props.levelUpTick} />
      <div class="level-header">
        <span class="level-badge">
          LV {props.levelState.currentLevel}
          <span class="level-of-max">/{MAX_LEVEL}</span>
        </span>
        <div class="level-bar-wrap">
          <div class="level-bar-track">
            <div class="level-bar-fill" style={{ width: `${pct()}%` }} />
          </div>
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

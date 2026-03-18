import type { PianoSound } from './types';

const SOUND_META: Record<PianoSound, { dir: string; ext: string }> = {
  '88-virtual': { dir: '88-virtual', ext: 'mp3' },
  'dusty-keys': { dir: 'dusty-keys', ext: 'wav' },
};

let audioCache = new Map<number, HTMLAudioElement>();
let volume = 0.5;
let currentSound: PianoSound = '88-virtual';

export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
}

export function getAudioUrl(key: number): string {
  const { dir, ext } = SOUND_META[currentSound];
  return `/sound/${dir}/${key}.${ext}`;
}

export function setSound(sound: PianoSound): void {
  if (sound === currentSound) return;
  currentSound = sound;
  audioCache = new Map();
  // Preload the new pack
  for (let key = 16; key <= 65; key++) {
    const audio = new Audio(getAudioUrl(key));
    audio.preload = 'auto';
    audioCache.set(key, audio);
  }
}

export function initAudio(sound: PianoSound = '88-virtual'): void {
  currentSound = sound;
  audioCache = new Map();
  for (let key = 16; key <= 65; key++) {
    const audio = new Audio(getAudioUrl(key));
    audio.preload = 'auto';
    audioCache.set(key, audio);
  }
}

export function playKey(key: number): void {
  let audio = audioCache.get(key);
  if (!audio) {
    audio = new Audio(getAudioUrl(key));
    audioCache.set(key, audio);
  }
  const clone = audio.cloneNode() as HTMLAudioElement;
  clone.volume = volume;
  clone.play().catch(() => {});
}

export function playKeyWithSound(key: number, sound: PianoSound): void {
  const { dir, ext } = SOUND_META[sound];
  const url = `/sound/${dir}/${key}.${ext}`;
  const audio = new Audio(url);
  audio.volume = volume;
  audio.play().catch(() => {});
}

export function playMelodic(k1: number, k2: number, delay = 500): () => void {
  playKey(k1);
  const timer = setTimeout(() => playKey(k2), delay);
  return () => clearTimeout(timer);
}

export function playHarmonic(k1: number, k2: number): void {
  playKey(k1);
  playKey(k2);
}

export function playSequence(rootKey: number, semitones: number[], noteDelay = 350): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  semitones.forEach((st, i) => {
    timers.push(setTimeout(() => playKey(rootKey + st), i * noteDelay));
  });
  return () => timers.forEach(clearTimeout);
}

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AudioContext();
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
}

export function playCorrectSound(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(volume * 0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

  const freqs = [1047, 1319]; // C6, E6 — bright major third chime
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(t + i * 0.1);
    osc.stop(t + 0.5);
  });
}

export function playWrongSound(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(volume * 0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.3);
  osc.connect(gain);
  osc.start(t);
  osc.stop(t + 0.35);
}

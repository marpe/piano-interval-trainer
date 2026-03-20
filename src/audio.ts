import type { PianoSound } from './types';

const SOUND_META: Record<PianoSound, { dir: string; ext: string }> = {
  '88-virtual': { dir: '88-virtual', ext: 'mp3' },
  'dusty-keys': { dir: 'dusty-keys', ext: 'wav' },
};

let bufferCache = new Map<number, AudioBuffer>();
let volume = 0.5;
let currentSound: PianoSound = '88-virtual';
let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

export function setVolume(v: number): void {
  volume = Math.max(0, Math.min(1, v));
  if (masterGain) {
    masterGain.gain.value = volume;
  }
}

export function getAudioUrl(key: number): string {
  const { dir, ext } = SOUND_META[currentSound];
  return `${import.meta.env.BASE_URL}sound/${dir}/${key}.${ext}`;
}

async function loadBuffer(key: number): Promise<void> {
  try {
    const response = await fetch(getAudioUrl(key));
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await getCtx().decodeAudioData(arrayBuffer);
    bufferCache.set(key, audioBuffer);
  } catch {}
}

export function setSound(sound: PianoSound): void {
  if (sound === currentSound) {
    return;
  }
  currentSound = sound;
  bufferCache = new Map();
  for (let key = 16; key <= 65; key++) {
    loadBuffer(key);
  }
}

export function initAudio(sound: PianoSound = '88-virtual'): void {
  currentSound = sound;
  bufferCache = new Map();
  for (let key = 16; key <= 65; key++) {
    loadBuffer(key);
  }
}

export function playKey(key: number): () => void {
  const buf = bufferCache.get(key);
  if (!buf || !masterGain) {
    return () => {};
  }
  const audioCtx = getCtx();
  const source = audioCtx.createBufferSource();
  source.buffer = buf;
  source.connect(masterGain);
  source.start();
  return () => {
    try { source.stop(); } catch {}
  };
}

export function playMelodic(k1: number, k2: number, delay = 500): () => void {
  const cancels: Array<() => void> = [playKey(k1)];
  const timer = setTimeout(() => cancels.push(playKey(k2)), delay);
  return () => {
    clearTimeout(timer);
    cancels.forEach(c => c());
  };
}

export function playHarmonic(k1: number, k2: number): () => void {
  const cancels = [playKey(k1), playKey(k2)];
  return () => cancels.forEach(c => c());
}

export function playSequence(rootKey: number, semitones: number[], noteDelay = 350): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  semitones.forEach((st, i) => {
    timers.push(setTimeout(() => playKey(rootKey + st), i * noteDelay));
  });
  return () => timers.forEach(clearTimeout);
}

export function playCorrectSound(): void {
  const audioCtx = getCtx();
  const t = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(volume * 0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

  const freqs = [1047, 1319]; // C6, E6 — bright major third chime
  freqs.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(t + i * 0.1);
    osc.stop(t + 0.5);
  });
}

export function playWrongSound(): void {
  const audioCtx = getCtx();
  const t = audioCtx.currentTime;
  const gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(volume * 0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

  const osc = audioCtx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.3);
  osc.connect(gain);
  osc.start(t);
  osc.stop(t + 0.35);
}

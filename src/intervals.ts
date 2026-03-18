import type { IntervalDef, IntervalName } from './types';

export const ALL_INTERVALS: IntervalDef[] = [
  { name: 'Unison',  semitones: 0,  shortName: 'P1', fullName: 'Unison',        mnemonic: 'Same note' },
  { name: 'm2',      semitones: 1,  shortName: 'm2', fullName: 'Minor 2nd',     mnemonic: 'Jaws theme' },
  { name: 'M2',      semitones: 2,  shortName: 'M2', fullName: 'Major 2nd',     mnemonic: 'Happy Birthday' },
  { name: 'm3',      semitones: 3,  shortName: 'm3', fullName: 'Minor 3rd',     mnemonic: 'Smoke on the Water' },
  { name: 'M3',      semitones: 4,  shortName: 'M3', fullName: 'Major 3rd',     mnemonic: 'When the Saints' },
  { name: 'P4',      semitones: 5,  shortName: 'P4', fullName: 'Perfect 4th',   mnemonic: 'Here Comes the Bride' },
  { name: 'Tritone', semitones: 6,  shortName: 'TT', fullName: 'Tritone',       mnemonic: 'The Simpsons' },
  { name: 'P5',      semitones: 7,  shortName: 'P5', fullName: 'Perfect 5th',   mnemonic: 'Star Wars' },
  { name: 'm6',      semitones: 8,  shortName: 'm6', fullName: 'Minor 6th',     mnemonic: 'The Entertainer' },
  { name: 'M6',      semitones: 9,  shortName: 'M6', fullName: 'Major 6th',     mnemonic: 'My Bonnie' },
  { name: 'm7',      semitones: 10, shortName: 'm7', fullName: 'Minor 7th',     mnemonic: 'Somewhere' },
  { name: 'M7',      semitones: 11, shortName: 'M7', fullName: 'Major 7th',     mnemonic: 'Take On Me' },
  { name: 'Octave',  semitones: 12, shortName: 'P8', fullName: 'Octave',        mnemonic: 'Somewhere Over the Rainbow' },
];

// Semitone offsets from a root note that make each interval's mnemonic recognisable
export const INTERVAL_PREVIEWS: Record<IntervalName, number[]> = {
  'Unison':  [0, 0, 0, 0],
  'm2':      [0, 1, 0, 1, 0, 1],          // Jaws — creeping half-steps
  'M2':      [0, 0, 2, 0, 5, 4],          // Happy Birthday — Hap-py Birth-day to You
  'm3':      [0, 3, 5, 0, 3, 6, 5],       // Smoke on the Water — main riff
  'M3':      [0, 4, 5, 7, 9, 7],          // When the Saints — Oh When The Saints
  'P4':      [0, 0, 0, 5, 0, 4, 5],       // Here Comes the Bride
  'Tritone': [0, 0, 6, 5, 4, 2, 0],       // The Simpsons — da-da-da opening
  'P5':      [0, 0, 0, 7, 5, 4, 2],       // Star Wars — main theme
  'm6':      [0, 2, 4, 5, 3, 8],          // The Entertainer — approach then m6 leap
  'M6':      [0, 9, 7, 5, 4, 5],          // My Bonnie — My-Bon-nie-lies
  'm7':      [0, 10, 9, 7, 5, 4],         // Somewhere — West Side Story
  'M7':      [0, 11, 12, 11, 9, 7],       // Take On Me — M7 leap then descend
  'Octave':  [0, 12, 11, 9, 7, 5],        // Somewhere Over the Rainbow
};

export const DEFAULT_ENABLED: Set<IntervalName> = new Set([
  'M2', 'm3', 'M3', 'P4', 'P5', 'M6', 'Octave',
]);

export const ALL_ENABLED: Set<IntervalName> = new Set([
  'Unison', 'm2', 'M2', 'm3', 'M3', 'P4', 'Tritone', 'P5', 'm6', 'M6', 'm7', 'M7', 'Octave',
]);

// C3 = key 28, C5 = key 52
export const ROOT_KEY_MIN = 28;
export const ROOT_KEY_MAX = 52;

// Intervals newly introduced at each level (index 0 = level 1, etc.)
export const LEVEL_UNLOCKS: IntervalName[][] = [
  ['P5', 'Octave'],  // Level 1: 2 intervals
  ['M3'],            // Level 2: 3 total
  ['P4'],            // Level 3: 4 total
  ['m3'],            // Level 4: 5 total
  ['M2'],            // Level 5: 6 total
  ['M6'],            // Level 6: 7 total
  ['m6'],            // Level 7: 8 total
  ['m7'],            // Level 8: 9 total
  ['m2'],            // Level 9: 10 total
  ['M7'],            // Level 10: 11 total
  ['Tritone'],       // Level 11: 12 total
  ['Unison'],        // Level 12: all 13 intervals
];

export const MAX_LEVEL = LEVEL_UNLOCKS.length;
export const CORRECT_PER_LEVEL = 10;

export function getIntervalsForLevel(level: number): Set<IntervalName> {
  const intervals = new Set<IntervalName>();
  const clampedLevel = Math.min(level, MAX_LEVEL);
  for (let i = 0; i < clampedLevel; i++) {
    LEVEL_UNLOCKS[i].forEach(name => intervals.add(name));
  }
  return intervals;
}

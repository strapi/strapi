import { describe, expect, it } from 'vitest';

import { nextSource } from '../transitions';

import type { Declaration, Source } from '../types';

const declaration = (origin: Declaration['origin'], edited = false): Declaration => ({
  origin,
  signal: 'none',
  actor: { type: 'system' },
  edited,
});

describe('nextSource', () => {
  it.each<[Source | null, Declaration, Source]>([
    [null, declaration('ai'), 'ai-generated'],
    ['human-entered', declaration('ai'), 'ai-generated'],
    ['human-entered', declaration('ai', true), 'ai-assisted'],
    ['ai-assisted', declaration('ai'), 'ai-generated'],
    ['ai-generated', declaration('human'), 'ai-assisted'],
    ['ai-assisted', declaration('human'), 'ai-assisted'],
    ['human-entered', declaration('human'), 'human-entered'],
    ['unattributed', declaration('human'), 'human-entered'],
    [null, declaration('human'), 'human-entered'],
    // Editing AI output through an integration or an unqualified token keeps it AI
    ['ai-generated', declaration('automated'), 'ai-assisted'],
    ['ai-generated', declaration('none'), 'ai-assisted'],
    ['human-entered', declaration('automated'), 'automated'],
    ['human-entered', declaration('none'), 'unattributed'],
  ])('%s + %o -> %s', (previous, write, expected) => {
    expect(nextSource(previous, write)).toBe(expected);
  });
});

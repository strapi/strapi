import { renderHook } from '@testing-library/react';

import { getPartFingerprint, usePartsWithKeys } from '../Message';

import type { AIMessage } from '../../../lib/types/messages';

/**
 * `Message.tsx` pulls in `react-markdown`, which ships as ESM only and is not
 * listed in the front preset `transformIgnorePatterns`. The keying logic under
 * test never renders markdown, so a stub is enough to load the module.
 */
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: () => null,
}));

type Part = AIMessage['parts'][number];

const textPart = (text: string): Part => ({ type: 'text', text });

const filePart = (url: string, mediaType = 'image/png', filename?: string): Part => ({
  type: 'file',
  url,
  mediaType,
  filename,
});

const toolPart = (toolCallId: string): Part =>
  ({
    type: 'tool-schemaGenerationTool',
    toolCallId,
    state: 'input-available',
    input: { schemas: [] },
  }) as unknown as Part;

const stepStartPart = (): Part => ({ type: 'step-start' }) as unknown as Part;

const renderParts = (parts: Part[]) =>
  renderHook(({ parts: currentParts }) => usePartsWithKeys(currentParts), {
    initialProps: { parts },
  });

const keysOf = (keyedParts: ReturnType<typeof usePartsWithKeys>) =>
  keyedParts.map(({ key }) => key);

/**
 * Invariant pinned by every case: a single render never emits the same key
 * twice. Duplicate keys would silently corrupt React's reconciliation.
 */
const expectUniqueKeys = (keys: string[]) => {
  expect(new Set(keys).size).toBe(keys.length);
};

describe('getPartFingerprint', () => {
  it('fingerprints a text part by its text', () => {
    expect(getPartFingerprint(textPart('Hello'))).toBe('text:Hello');
  });

  it('fingerprints a file part by filename, media type and url', () => {
    expect(getPartFingerprint(filePart('https://strapi.io/a.png', 'image/png', 'a.png'))).toBe(
      'file:a.png:image/png:https://strapi.io/a.png'
    );
  });

  it('treats a missing filename as an empty segment', () => {
    expect(getPartFingerprint(filePart('https://strapi.io/a.png', 'image/png'))).toBe(
      'file::image/png:https://strapi.io/a.png'
    );
  });

  it('fingerprints a tool part by its type and tool call id', () => {
    expect(getPartFingerprint(toolPart('call-1'))).toBe('tool-schemaGenerationTool:call-1');
  });

  it('falls back to the part type when nothing else identifies the part', () => {
    expect(getPartFingerprint(stepStartPart())).toBe('step-start');
  });

  it('gives two byte-identical text parts the same fingerprint', () => {
    expect(getPartFingerprint(textPart('Hi'))).toBe(getPartFingerprint(textPart('Hi')));
  });
});

describe('usePartsWithKeys', () => {
  it('gives distinct keys to distinct parts on the first render', () => {
    const { result } = renderParts([textPart('one'), textPart('two'), toolPart('call-1')]);

    const keys = keysOf(result.current);

    expect(keys).toHaveLength(3);
    expectUniqueKeys(keys);
  });

  it('returns the same keys when re-rendered with the identical parts array', () => {
    const parts = [textPart('one'), filePart('https://strapi.io/a.png')];
    const { result, rerender } = renderParts(parts);

    const before = keysOf(result.current);
    rerender({ parts });
    const after = keysOf(result.current);

    expect(after).toEqual(before);
    expectUniqueKeys(after);
  });

  it('keeps existing keys and mints a fresh one when a part is appended', () => {
    const first = textPart('one');
    const second = textPart('two');
    const { result, rerender } = renderParts([first, second]);

    const before = keysOf(result.current);
    rerender({ parts: [first, second, toolPart('call-1')] });
    const after = keysOf(result.current);

    expect(after.slice(0, 2)).toEqual(before);
    expect(before).not.toContain(after[2]);
    expectUniqueKeys(after);
  });

  it('keeps one stable key while a text part streams in', () => {
    const { result, rerender } = renderParts([textPart('He')]);

    const initial = keysOf(result.current);

    rerender({ parts: [textPart('Hell')] });
    const midway = keysOf(result.current);

    rerender({ parts: [textPart('Hello')] });
    const final = keysOf(result.current);

    expect(midway).toEqual(initial);
    expect(final).toEqual(initial);
    expect(result.current[0].part).toEqual(textPart('Hello'));
    expectUniqueKeys(final);
  });

  it('keeps the surrounding keys stable while a trailing text part streams in', () => {
    const tool = toolPart('call-1');
    const { result, rerender } = renderParts([tool, textPart('He')]);

    const before = keysOf(result.current);
    rerender({ parts: [tool, textPart('Hello')] });
    const after = keysOf(result.current);

    expect(after).toEqual(before);
    expectUniqueKeys(after);
  });

  it('gives two byte-identical text parts different keys and keeps them across renders', () => {
    const parts = [textPart('Hi'), textPart('Hi')];
    const { result, rerender } = renderParts(parts);

    const before = keysOf(result.current);

    expect(before[0]).not.toBe(before[1]);
    expectUniqueKeys(before);

    rerender({ parts: [textPart('Hi'), textPart('Hi')] });
    const after = keysOf(result.current);

    expect(after).toEqual(before);
    expectUniqueKeys(after);
  });

  it('keeps the surviving keys when a part is removed', () => {
    const first = textPart('one');
    const second = textPart('two');
    const third = textPart('three');
    const { result, rerender } = renderParts([first, second, third]);

    const before = keysOf(result.current);
    rerender({ parts: [first, third] });
    const after = keysOf(result.current);

    expect(after).toEqual([before[0], before[2]]);
    expectUniqueKeys(after);
  });

  it('moves the keys with the parts when they are reordered', () => {
    const first = textPart('one');
    const second = textPart('two');
    const { result, rerender } = renderParts([first, second]);

    const before = keysOf(result.current);
    rerender({ parts: [second, first] });
    const after = keysOf(result.current);

    expect(after).toEqual([before[1], before[0]]);
    expectUniqueKeys(after);
  });

  it('keys tool parts off their tool call id', () => {
    const { result, rerender } = renderParts([toolPart('call-1'), toolPart('call-2')]);

    const before = keysOf(result.current);

    expect(before[0]).not.toBe(before[1]);
    expectUniqueKeys(before);

    // Same ids, new objects, swapped order: the keys follow the ids.
    rerender({ parts: [toolPart('call-2'), toolPart('call-1')] });
    const after = keysOf(result.current);

    expect(after).toEqual([before[1], before[0]]);
    expectUniqueKeys(after);
  });

  it('matches on object identity when a part is mutated in place and moves slot', () => {
    // A part mutated in place has a stale stored fingerprint, and moving it to a
    // slot the previous render never filled rules out the slot fallback too, so
    // only the object identity branch can keep its key.
    const streamed = textPart('He') as Extract<Part, { type: 'text' }>;
    const { result, rerender } = renderParts([streamed]);

    const before = keysOf(result.current);

    streamed.text = 'Hello';
    rerender({ parts: [toolPart('call-1'), streamed] });
    const after = keysOf(result.current);

    expect(after[1]).toBe(before[0]);
    expect(before).not.toContain(after[0]);
    expectUniqueKeys(after);
  });

  it('does not reuse a key already claimed in the same render', () => {
    const settled = textPart('settled');
    const { result, rerender } = renderParts([settled, textPart('He')]);

    const before = keysOf(result.current);

    // The settled part moves to the second slot, so the slot fallback must not
    // hand its key to the new part sitting in the first slot.
    rerender({ parts: [textPart('brand new'), settled] });
    const after = keysOf(result.current);

    expect(after[1]).toBe(before[0]);
    expect(before).not.toContain(after[0]);
    expectUniqueKeys(after);
  });

  it('gives every part a key when the list is rebuilt from scratch', () => {
    const { result, rerender } = renderParts([textPart('a'), textPart('b')]);

    const before = keysOf(result.current);

    rerender({ parts: [toolPart('call-9'), filePart('https://strapi.io/b.png')] });
    const after = keysOf(result.current);

    expect(after).toHaveLength(2);
    expect(after.some((key) => before.includes(key))).toBe(false);
    expectUniqueKeys(after);
  });

  it('returns no keys for an empty parts list', () => {
    const { result } = renderParts([]);

    expect(result.current).toEqual([]);
  });
});

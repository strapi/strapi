import { describe, expect, it } from 'vitest';

import { claimsAi, parseBodyClaims, parseProvenanceHeader } from '../header';

describe('parseProvenanceHeader', () => {
  it('returns null without a header', () => {
    expect(parseProvenanceHeader(undefined)).toBeNull();
  });

  it('parses tokens and quoted strings', () => {
    expect(parseProvenanceHeader('source=ai; model="claude-opus-5-5"; agent="seo-bot"')).toEqual({
      source: 'ai',
      model: 'claude-opus-5-5',
      agent: 'seo-bot',
    });
  });

  it('keeps semicolons and escaped quotes inside quoted strings', () => {
    expect(parseProvenanceHeader('source=ai; agent="a;b \\"c\\""')).toEqual({
      source: 'ai',
      agent: 'a;b "c"',
    });
  });

  it('lowercases keys and ignores unknown keys and malformed pairs', () => {
    expect(parseProvenanceHeader('SOURCE=ai; prompt="secret"; broken; model=')).toEqual({
      source: 'ai',
    });
  });

  it('joins repeated headers', () => {
    expect(parseProvenanceHeader(['source=ai', 'model=m1'])).toEqual({ source: 'ai', model: 'm1' });
  });

  it('returns null when nothing is usable', () => {
    expect(parseProvenanceHeader('nothing-here')).toBeNull();
  });

  it('truncates long values', () => {
    const claim = parseProvenanceHeader(`model="${'x'.repeat(500)}"`);

    expect(claim?.model).toHaveLength(200);
  });
});

describe('parseProvenanceHeader, under-declaration', () => {
  it('keeps the AI source when a repeated header says otherwise', () => {
    expect(parseProvenanceHeader('source=ai;source=human')?.source).toBe('ai');
    // Node joins two headers with a comma
    expect(parseProvenanceHeader('source=human, source=ai')?.source).toBe('ai');
  });

  it('reads UTF-8 values that Node decoded as latin1', () => {
    const header = Buffer.from('source=ai; model="modèle-日本"', 'utf8').toString('latin1');

    expect(parseProvenanceHeader(header)?.model).toBe('modèle-日本');
  });
});

describe('parseBodyClaims', () => {
  it('keeps known string keys per field', () => {
    expect(
      parseBodyClaims({
        description: { source: 'ai', model: 'm1', other: 'dropped' },
        price: { source: 'import', system: 'erp' },
      })
    ).toEqual({
      description: { source: 'ai', model: 'm1' },
      price: { source: 'import' },
    });
  });

  it.each([null, 'ai', ['ai'], 42])('ignores %j', (value) => {
    expect(parseBodyClaims(value)).toEqual({});
  });

  it('skips fields whose claim is not an object', () => {
    expect(parseBodyClaims({ title: 'ai', body: { source: 'ai' } })).toEqual({
      body: { source: 'ai' },
    });
  });
});

describe('claimsAi', () => {
  it.each([
    [{ source: 'ai' }, true],
    [{ source: 'AI' }, true],
    [{ source: 'ai-generated' }, true],
    [{ source: 'ai-assisted' }, true],
    [{ source: 'human' }, false],
    [{ model: 'm1' }, false],
    [null, false],
  ])('%j -> %s', (claim, expected) => {
    expect(claimsAi(claim)).toBe(expected);
  });
});

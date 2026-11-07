import { describe, expect, it } from 'vitest';

import { collectText, findPastedFields } from '../paste';

const PASTED = 'Compost, mulch and native plants make a garden greener without effort.';

describe('collectText', () => {
  it('reads the text nodes of a Blocks value', () => {
    expect(
      collectText([
        { type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] },
        { type: 'paragraph', children: [{ type: 'text', text: 'world', bold: true }] },
      ])
    ).toContain('world');
  });

  it('ignores numbers, booleans and null', () => {
    expect(collectText({ a: 1, b: true, c: null })).toBe('  ');
  });
});

describe('findPastedFields', () => {
  const fields = ['title', 'markdownContent', 'blocksContent'];

  it('finds a plain text field', () => {
    expect(
      findPastedFields({
        fields,
        before: { title: 'Draft', markdownContent: 'Intro' },
        after: { title: 'Draft', markdownContent: `Intro\n\n${PASTED}` },
        pasted: PASTED,
      })
    ).toEqual(['markdownContent']);
  });

  it('finds a Blocks field, whatever the line breaks', () => {
    expect(
      findPastedFields({
        fields,
        before: { blocksContent: [] },
        after: {
          blocksContent: [
            {
              type: 'paragraph',
              children: [
                { type: 'text', text: 'Compost, mulch   and native plants make a garden' },
              ],
            },
          ],
        },
        pasted: 'Compost, mulch\nand native plants make a garden greener',
      })
    ).toEqual(['blocksContent']);
  });

  it('ignores fields that already contained the text', () => {
    expect(
      findPastedFields({
        fields,
        before: { title: PASTED },
        after: { title: PASTED },
        pasted: PASTED,
      })
    ).toEqual([]);
  });

  it('ignores fields that changed with other text', () => {
    expect(
      findPastedFields({
        fields,
        before: { title: 'a' },
        after: { title: 'b' },
        pasted: PASTED,
      })
    ).toEqual([]);
  });

  it('ignores an empty paste', () => {
    expect(findPastedFields({ fields, before: {}, after: { title: 'x' }, pasted: '   ' })).toEqual(
      []
    );
  });
});

import { createEditor, type Editor } from 'slate';
import { withReact } from 'slate-react';

import { normalizeBlocksState } from '../BlocksEditor';

import type { Schema } from '@strapi/types';

describe('normalizeBlocksState', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = withReact(createEditor());
  });

  it('should return null when the editor contains a single empty paragraph block', () => {
    const emptyState: Schema.Attribute.BlocksValue = [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
    ];

    const result = normalizeBlocksState(editor, emptyState);

    expect(result).toBeNull();
  });

  it('should return the state when the editor contains a paragraph with text', () => {
    const stateWithText: Schema.Attribute.BlocksValue = [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Hello world' }],
      },
    ];

    const result = normalizeBlocksState(editor, stateWithText);

    expect(result).toEqual(stateWithText);
  });

  it('should return a new cloned reference so in-place mutations in Slate are detected by form state', () => {
    const stateWithText: Schema.Attribute.BlocksValue = [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Hello world' }],
      },
    ];

    const result = normalizeBlocksState(editor, stateWithText);

    expect(result).toEqual(stateWithText);
    expect(result).not.toBe(stateWithText);
    expect(result?.[0]).not.toBe(stateWithText[0]);
    if (result && 'children' in result[0]) {
      expect(result[0].children[0]).not.toBe(stateWithText[0].children[0]);
    }
  });

  it('should preserve rich text formatting modifiers in the cloned state', () => {
    const stateWithFormatting: Schema.Attribute.BlocksValue = [
      {
        type: 'paragraph',
        children: [
          { type: 'text', text: 'Plain ' },
          { type: 'text', text: 'bold and italic', bold: true, italic: true },
          { type: 'text', text: ' underline and code', underline: true, code: true },
        ],
      },
    ];

    const result = normalizeBlocksState(editor, stateWithFormatting);

    expect(result).toEqual(stateWithFormatting);
    expect(result).not.toBe(stateWithFormatting);
  });
});

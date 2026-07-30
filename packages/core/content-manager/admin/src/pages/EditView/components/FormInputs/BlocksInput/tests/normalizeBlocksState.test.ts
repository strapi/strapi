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
});

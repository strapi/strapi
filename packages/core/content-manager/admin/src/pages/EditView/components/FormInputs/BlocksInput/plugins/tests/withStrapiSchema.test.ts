import { createEditor, Transforms } from 'slate';

import { withStrapiSchema } from '../withStrapiSchema';

const image = (name: string) => ({
  type: 'image' as const,
  image: { name, url: `/uploads/${name}` },
  children: [{ type: 'text' as const, text: '' }],
});

describe('withStrapiSchema', () => {
  it('puts back an empty paragraph, with the cursor in it, when every block is deleted', () => {
    const editor = withStrapiSchema(createEditor());
    // @ts-expect-error the image only needs the fields the test reads
    editor.children = [image('first.png'), image('second.png')];

    Transforms.select(editor, {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [1, 0], offset: 0 },
    });
    Transforms.removeNodes(editor, { at: [1] });
    Transforms.removeNodes(editor, { at: [0] });

    expect(editor.children).toEqual([
      { type: 'paragraph', children: [{ type: 'text', text: '' }] },
    ]);
    expect(editor.selection).toEqual({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });
  });

  it('leaves a document that still has blocks alone', () => {
    const editor = withStrapiSchema(createEditor());
    editor.children = [
      { type: 'paragraph', children: [{ type: 'text', text: 'Kept' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'Removed' }] },
    ];

    Transforms.removeNodes(editor, { at: [1] });

    expect(editor.children).toEqual([
      { type: 'paragraph', children: [{ type: 'text', text: 'Kept' }] },
    ]);
  });
});

/* eslint-disable testing-library/no-node-access */
import { render, screen } from '@testing-library/react';
import { Editor, Transforms, createEditor } from 'slate';

import { withStrapiSchema } from '../../plugins/withStrapiSchema';
import { linkBlocks } from '../Link';
import { paragraphBlocks } from '../Paragraph';

import { Wrapper } from './Wrapper';

describe('Paragraph', () => {
  it('renders a heading block properly', () => {
    render(
      paragraphBlocks.paragraph.renderElement({
        children: 'A line of text in a paragraph.',
        element: {
          type: 'paragraph',
          children: [{ type: 'text', text: 'A line of text in a paragraph.' }],
        },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      }),
      {
        wrapper: Wrapper,
      }
    );

    const paragraph = screen.getByText('A line of text in a paragraph.');
    expect(paragraph).toBeInTheDocument();
  });

  it('handles enter key on paragraph block', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of text',
          },
          {
            type: 'text',
            text: ' with modifiers too',
            bold: true,
          },
        ],
      },
    ];

    // Set the cursor after "Line of"
    Transforms.select(baseEditor, {
      /**
       * Docs about anchor and focus: https://docs.slatejs.org/v/v0.47/slate-core/range
       * In this case they are the same because no text is selected,
       * we're only setting the position of the cursor.
       */
      anchor: Editor.point(baseEditor, { path: [0, 0], offset: 7 }),
      focus: Editor.point(baseEditor, { path: [0, 0], offset: 7 }),
    });

    // Simulate the enter key
    paragraphBlocks.paragraph.handleEnterKey!(baseEditor);

    // Should insert a new paragraph with the content after the cursor
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of',
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: ' text',
          },
          {
            type: 'text',
            text: ' with modifiers too',
            bold: true,
          },
        ],
      },
    ]);
  });

  it('handles enter key called twice on paragraph block', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of text',
          },
          {
            type: 'text',
            text: ' with modifiers too',
            bold: true,
          },
        ],
      },
    ];

    // Set the cursor after "Line of"
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 7 },
      focus: { path: [0, 0], offset: 7 },
    });

    if (!baseEditor.selection) {
      throw new Error('selection is not defined');
    }

    const cursorInitialPosition = baseEditor.selection.anchor.path;
    // Simulate the enter key
    paragraphBlocks.paragraph.handleEnterKey!(baseEditor);

    const cursorPositionAfterFirstEnter = baseEditor.selection.anchor.path;

    // Check if the cursor is positioned in the new line
    expect(cursorPositionAfterFirstEnter[0]).toEqual(cursorInitialPosition[0] + 1);

    // Set the cursor after "Line of"
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 7 },
      focus: { path: [0, 0], offset: 7 },
    });

    // Simulate another the enter key
    paragraphBlocks.paragraph.handleEnterKey!(baseEditor);

    const cursorPositionAfterSecondEnter = baseEditor.selection.anchor.path;

    // Check if the cursor is positioned in the new line
    expect(cursorPositionAfterSecondEnter[0]).toEqual(cursorInitialPosition[0] + 1);
  });

  it('has no modifiers enabled when pressing enter key at the end of a paragraph', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of text with modifiers',
            bold: true,
            italic: true,
          },
        ],
      },
    ];

    // Set the cursor at the end of the block with modifiers
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, []),
      focus: Editor.end(baseEditor, []),
    });

    // Simulate the enter key
    paragraphBlocks.paragraph.handleEnterKey!(baseEditor);

    // Should insert a new paragraph without modifiers
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of text with modifiers',
            bold: true,
            italic: true,
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: '',
          },
        ],
      },
    ]);
  });

  it('keeps modifiers when creating a new line in the middle of a paragraph with modifiers', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of text with modifiers',
            bold: true,
            code: true,
            italic: true,
          },
        ],
      },
    ];

    // Set the cursor at the middle of the block with modifiers
    Transforms.select(baseEditor, {
      anchor: Editor.point(baseEditor, { path: [0, 0], offset: 10 }),
      focus: Editor.point(baseEditor, { path: [0, 0], offset: 10 }),
    });

    // Simulate the enter key
    paragraphBlocks.paragraph.handleEnterKey!(baseEditor);

    // Should insert a new line with modifiers
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of te',
            bold: true,
            code: true,
            italic: true,
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'xt with modifiers',
            bold: true,
            code: true,
            italic: true,
          },
        ],
      },
    ]);
  });

  it('converts a list to a paragraph', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'list',
        format: 'unordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'List item 1',
              },
            ],
          },
        ],
      },
    ];

    Transforms.select(baseEditor, {
      anchor: { path: [0, 0, 0], offset: 0 },
      focus: { path: [0, 0, 0], offset: 0 },
    });

    paragraphBlocks.paragraph.handleConvert!(baseEditor);

    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'List item 1',
          },
        ],
      },
    ]);
  });

  it('converts a heading to a paragraph', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'heading',
        level: 1,
        children: [
          {
            type: 'text',
            italic: true,
            text: 'Heading 1',
          },
        ],
      },
    ];

    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    paragraphBlocks.paragraph.handleConvert!(baseEditor);

    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            italic: true,
            text: 'Heading 1',
          },
        ],
      },
    ]);
  });

  it('preserves the link and trailing text when pressing enter inside a link', () => {
    const baseEditor = withStrapiSchema(linkBlocks.link.plugin!(createEditor()));
    baseEditor.children = [
      {
        type: 'paragraph',
        children: [
          { type: 'text', text: '' },
          {
            type: 'link',
            url: 'https://strapi.io',
            rel: '',
            target: '',
            children: [{ type: 'text', text: 'StrapiDocs' }],
          },
          { type: 'text', text: ' after' },
        ],
      },
    ];

    Transforms.select(baseEditor, {
      anchor: { path: [0, 1, 0], offset: 6 },
      focus: { path: [0, 1, 0], offset: 6 },
    });

    paragraphBlocks.paragraph.handleEnterKey!(baseEditor);

    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'text', text: '' },
          {
            type: 'link',
            url: 'https://strapi.io',
            rel: '',
            target: '',
            children: [{ type: 'text', text: 'Strapi' }],
          },
          { type: 'text', text: '' },
        ],
      },
      {
        type: 'paragraph',
        children: [
          { type: 'text', text: '' },
          {
            type: 'link',
            url: 'https://strapi.io',
            rel: '',
            target: '',
            children: [{ type: 'text', text: 'Docs' }],
          },
          { type: 'text', text: ' after' },
        ],
      },
    ]);
  });
});

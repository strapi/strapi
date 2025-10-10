/* eslint-disable testing-library/no-node-access */

import { ReactElement } from 'react';

import { act, render as renderRTL, screen } from '@tests/utils';
import { Editor, Transforms, createEditor } from 'slate';

import { mockImage } from '../../tests/mock-schema';
import { imageBlocks } from '../Image';

import { Wrapper } from './Wrapper';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useStrapiApp: jest.fn((_name: string, getter: (state: any) => any) =>
    getter({
      components: {
        'media-library': ({
          onSelectAssets,
        }: {
          onSelectAssets: (images: (typeof mockImage)[]) => void;
        }) => (
          <div>
            <p>{mockMediaLibraryTitle}</p>
            <button type="button" onClick={() => onSelectAssets([mockImage])}>
              {mockMediaLibrarySubmitButton}
            </button>
          </div>
        ),
      },
    })
  ),
}));

const mockMediaLibraryTitle = 'dialog component';
const mockMediaLibrarySubmitButton = 'upload images';

const render = (ui: ReactElement, { baseEditor }: { baseEditor?: Editor } = {}) =>
  renderRTL(ui, {
    renderOptions: {
      wrapper: ({ children }) => <Wrapper baseEditor={baseEditor}>{children}</Wrapper>,
    },
  });

describe('Image', () => {
  it('renders an image block properly', () => {
    render(
      imageBlocks.image.renderElement({
        children: 'A line of text in a paragraph.',
        element: {
          type: 'image',
          image: { url: 'https://example.com/image.png', alternativeText: 'Some image' },
          children: [{ type: 'text', text: '' }],
        },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      })
    );

    const image = screen.getByRole('img', { name: 'Some image' });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.png');
  });

  it('handles enter key on an image', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'image',
        image: mockImage,
        children: [{ type: 'text', text: '' }],
      },
    ];

    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    imageBlocks.image.handleEnterKey!(baseEditor);

    // Should insert a paragraph after the image
    expect(baseEditor.children).toEqual([
      {
        type: 'image',
        image: mockImage,
        children: [{ type: 'text', text: '' }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
    ]);
  });

  it('converts a paragraph block to an image', async () => {
    const baseEditor = createEditor();
    baseEditor.children = [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }];

    await act(async () =>
      Transforms.select(baseEditor, {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 0 },
      })
    );

    // Display the media library modal via handleConvert
    const modalComponent = imageBlocks.image.handleConvert!(baseEditor);
    expect(modalComponent).toBeDefined();
    const modalUi = modalComponent!();
    const { user } = render(modalUi, {
      baseEditor,
    });

    // No changes should have been made to the editor yet
    expect(baseEditor.children).toEqual([
      { type: 'paragraph', children: [{ type: 'text', text: '' }] },
    ]);

    // Fake an image upload, then nodes should be created
    expect(screen.getByText(mockMediaLibraryTitle)).toBeInTheDocument();
    await user.click(screen.getByText(mockMediaLibrarySubmitButton));

    expect(baseEditor.children).toEqual([
      {
        type: 'image',
        image: mockImage,
        children: [{ type: 'text', text: '' }],
      },
    ]);
  });

  it('splits a list in two when converting a list item to an image', async () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'list',
        format: 'ordered',
        children: [
          { type: 'list-item', children: [{ type: 'text', text: 'List item 1' }] },
          { type: 'list-item', children: [{ type: 'text', text: 'List item 2' }] },
          { type: 'list-item', children: [{ type: 'text', text: 'List item 3' }] },
        ],
      },
    ];

    await act(async () =>
      Transforms.select(baseEditor, {
        anchor: { path: [0, 1, 0], offset: 0 },
        focus: { path: [0, 1, 0], offset: 0 },
      })
    );

    // Display the media library modal via handleConvert
    const modalComponent = imageBlocks.image.handleConvert!(baseEditor);
    expect(modalComponent).toBeDefined();
    const modalUi = modalComponent!();
    const { user } = render(modalUi, {
      baseEditor,
    });

    // Fake an image upload, then nodes should be created
    expect(screen.getByText(mockMediaLibraryTitle)).toBeInTheDocument();
    await user.click(screen.getByText(mockMediaLibrarySubmitButton));
    expect(baseEditor.children).toEqual([
      {
        type: 'list',
        format: 'ordered',
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
      {
        type: 'image',
        image: mockImage,
        children: [{ type: 'text', text: '' }],
      },
      {
        type: 'list',
        format: 'ordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'List item 3',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('deletes image when backspace is pressed', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Some paragraph' }],
      },
      {
        type: 'image',
        image: mockImage,
        children: [{ type: 'text', text: '' }],
      },
    ];

    Transforms.select(baseEditor, {
      anchor: { path: [1, 0], offset: 0 },
      focus: { path: [1, 0], offset: 0 },
    });

    // @ts-expect-error we don't need a full event object
    imageBlocks.image.handleBackspaceKey!(baseEditor, {
      preventDefault: jest.fn(),
    });

    // Should delete the image
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Some paragraph' }],
      },
    ]);
  });

  it('deletes an image when it is the only block in the editor', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'image',
        image: mockImage,
        children: [{ type: 'text', text: '' }],
      },
    ];

    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    // @ts-expect-error we don't need a full event object
    imageBlocks.image.handleBackspaceKey!(baseEditor, {
      preventDefault: jest.fn(),
    });

    // Should have an empty paragraph as it's the default value
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
    ]);
  });
});

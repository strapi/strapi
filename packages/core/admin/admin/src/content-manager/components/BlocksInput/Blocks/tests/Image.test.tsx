/* eslint-disable testing-library/no-node-access */

import * as React from 'react';

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Transforms, createEditor } from 'slate';

import { mockImage } from '../../tests/mock-schema';
import { imageBlocks } from '../Image';

import { Wrapper } from './Wrapper';

const mockMediaLibraryTitle = 'dialog component';
const mockMediaLibrarySubmitButton = 'upload images';
const mockMediaLibraryImage = {
  name: 'Screenshot 2023-10-18 at 15.03.11.png',
  alternativeText: 'Screenshot 2023-10-18 at 15.03.11.png',
  caption: null,
  width: 437,
  height: 420,
  formats: {
    thumbnail: {
      name: 'thumbnail_Screenshot 2023-10-18 at 15.03.11.png',
      hash: 'thumbnail_Screenshot_2023_10_18_at_15_03_11_c6d21f899b',
      ext: '.png',
      mime: 'image/png',
      path: null,
      width: 162,
      height: 156,
      size: 45.75,
      url: '/uploads/thumbnail_Screenshot_2023_10_18_at_15_03_11_c6d21f899b.png',
    },
  },
  hash: 'Screenshot_2023_10_18_at_15_03_11_c6d21f899b',
  ext: '.png',
  mime: 'image/png',
  size: 47.67,
  url: 'http://localhost:1337/uploads/Screenshot_2023_10_18_at_15_03_11_c6d21f899b.png',
  previewUrl: null,
  provider: 'local',
  provider_metadata: null,
  createdAt: '2023-10-18T15:54:33.504Z',
  updatedAt: '2023-10-18T15:54:33.504Z',
};

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useLibrary: jest.fn().mockImplementation(() => ({
    components: {
      'media-library': ({
        onSelectAssets,
      }: {
        onSelectAssets: (images: (typeof mockMediaLibraryImage)[]) => void;
      }) => (
        <div>
          <p>{mockMediaLibraryTitle}</p>
          <button type="button" onClick={() => onSelectAssets([mockMediaLibraryImage])}>
            {mockMediaLibrarySubmitButton}
          </button>
        </div>
      ),
    },
  })),
}));

const user = userEvent.setup();

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
      }),
      {
        wrapper: Wrapper,
      }
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
    render(modalUi, {
      wrapper: ({ children }) => <Wrapper baseEditor={baseEditor}>{children}</Wrapper>,
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
        image: mockMediaLibraryImage,
        children: [{ type: 'text', text: '' }],
      },
      // An empty paragraph should have been created below the image since it was the last block
      {
        type: 'paragraph',
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
    render(modalUi, {
      wrapper: ({ children }) => <Wrapper baseEditor={baseEditor}>{children}</Wrapper>,
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
        image: mockMediaLibraryImage,
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
});

/* eslint-disable testing-library/no-node-access */

import { ReactElement } from 'react';

import { act, render as renderRTL, screen } from '@tests/utils';
import { Editor, Transforms, createEditor } from 'slate';

import { mockImage } from '../../tests/mock-schema';
import { formatBytes } from '../../utils/file';
import { fileBlocks } from '../File';

import { Wrapper } from './Wrapper';

const cleanExt = 'png';
const ext = '.png';
const url = 'https://example.com/image.png';
const name = 'Example File';
const size = 1024;

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useStrapiApp: jest.fn((_name: string, getter: (state: any) => any) =>
    getter({
      components: {
        'media-library': ({
          onSelectAssets,
        }: {
          onSelectAssets: (files: (typeof mockImage)[]) => void;
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
const mockMediaLibrarySubmitButton = 'upload files';

const render = (ui: ReactElement, { baseEditor }: { baseEditor?: Editor } = {}) =>
  renderRTL(ui, {
    renderOptions: {
      wrapper: ({ children }) => <Wrapper baseEditor={baseEditor}>{children}</Wrapper>,
    },
  });

describe('File', () => {
  it('renders a file block properly', () => {
    render(
      fileBlocks.file.renderElement({
        children: 'A line of text in a paragraph.',
        element: {
          type: 'file',
          file: { url, alternativeText: 'Some image but as file', name, size, ext },
          children: [{ type: 'text', text: '' }],
        },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      })
    );

    const extensionBox = screen.getByTestId('extension-box');

    const flexWrapper = extensionBox.parentElement;
    expect(flexWrapper).toBeInTheDocument();

    expect(extensionBox).toHaveStyle(`background: #AA2284`);
    expect(extensionBox).toHaveTextContent(cleanExt);

    const link = screen.getByRole('link', { name });
    expect(link).toHaveAttribute('href', url);
    expect(link).toHaveTextContent(name);

    const sizeText = screen.getByText(formatBytes(size));
    expect(sizeText).toBeInTheDocument();
  });

  it('handles enter key on a file', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'file',
        file: mockImage,
        children: [{ type: 'text', text: '' }],
      },
    ];

    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    fileBlocks.file.handleEnterKey!(baseEditor);

    // Should insert a paragraph after the file
    expect(baseEditor.children).toEqual([
      {
        type: 'file',
        file: mockImage,
        children: [{ type: 'text', text: '' }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
    ]);
  });

  /*   it('converts a paragraph block to a file', async () => {
    const baseEditor = createEditor();
    baseEditor.children = [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }];

    await act(async () =>
      Transforms.select(baseEditor, {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 0 },
      })
    );

    // Display the media library modal via handleConvert
    const modalComponent = fileBlocks.file.handleConvert!(baseEditor);
    expect(modalComponent).toBeDefined();
    const modalUi = modalComponent!();
    const { user } = render(modalUi, {
      baseEditor,
    });

    // No changes should have been made to the editor yet
    expect(baseEditor.children).toEqual([
      { type: 'paragraph', children: [{ type: 'text', text: '' }] },
    ]);

    // Fake an file upload, then nodes should be created
    expect(screen.getByText(mockMediaLibraryTitle)).toBeInTheDocument();
    await user.click(screen.getByText(mockMediaLibrarySubmitButton));

    expect(baseEditor.children).toEqual([
      {
        type: 'file',
        file: mockImage,
        children: [{ type: 'text', text: '' }],
      },
    ]);
  });

  it('splits a list in two when converting a list item to a file', async () => {
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
    const modalComponent = fileBlocks.file.handleConvert!(baseEditor);
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
        type: 'file',
        file: mockImage,
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
  }); */

  it('deletes file when backspace is pressed', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Some paragraph' }],
      },
      {
        type: 'file',
        file: mockImage,
        children: [{ type: 'text', text: '' }],
      },
    ];

    Transforms.select(baseEditor, {
      anchor: { path: [1, 0], offset: 0 },
      focus: { path: [1, 0], offset: 0 },
    });

    // @ts-expect-error we don't need a full event object
    fileBlocks.file.handleBackspaceKey!(baseEditor, {
      preventDefault: jest.fn(),
    });

    // Should delete the file
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Some paragraph' }],
      },
    ]);
  });

  it('deletes a file when it is the only block in the editor', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'file',
        file: mockImage,
        children: [{ type: 'text', text: '' }],
      },
    ];

    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    // @ts-expect-error we don't need a full event object
    fileBlocks.file.handleBackspaceKey!(baseEditor, {
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

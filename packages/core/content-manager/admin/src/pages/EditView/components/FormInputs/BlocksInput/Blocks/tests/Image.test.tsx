/* eslint-disable testing-library/no-node-access */

import { ReactElement } from 'react';

import { render as renderRTL, screen, waitFor } from '@tests/utils';
import { Editor, Transforms, createEditor } from 'slate';
import { ReactEditor } from 'slate-react';

import { withStrapiSchema } from '../../plugins/withStrapiSchema';
import { mockImage } from '../../tests/mock-schema';
import { createDroppedImagesInserter, imageBlocks } from '../Image';

import { Wrapper } from './Wrapper';

import type { Schema } from '@strapi/types';

type MediaLibraryProps = {
  onSelectAssets: (images: (typeof mockImage)[]) => void;
};

type MockStrapiAppState = {
  components: {
    'media-library': React.ComponentType<MediaLibraryProps>;
  };
};

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useStrapiApp: jest.fn((_name: string, getter: (state: MockStrapiAppState) => unknown) =>
    getter({
      components: {
        'media-library': ({ onSelectAssets }: MediaLibraryProps) => (
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

    await waitFor(() =>
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

  it('converts the only empty paragraph to an image without adding a paragraph after it', async () => {
    const baseEditor = withStrapiSchema(createEditor());
    baseEditor.children = [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }];

    await waitFor(() => Transforms.select(baseEditor, { path: [0, 0], offset: 0 }));

    const modalUi = imageBlocks.image.handleConvert!(baseEditor)!();
    const { user } = render(modalUi, { baseEditor });

    await user.click(screen.getByText(mockMediaLibrarySubmitButton));

    expect(baseEditor.children).toEqual([
      { type: 'image', image: mockImage, children: [{ type: 'text', text: '' }] },
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

    await waitFor(() =>
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

  const threeImages = () => [
    {
      type: 'image',
      image: { ...mockImage, name: 'first.png' },
      children: [{ type: 'text', text: '' }],
    },
    {
      type: 'image',
      image: { ...mockImage, name: 'second.png' },
      children: [{ type: 'text', text: '' }],
    },
    {
      type: 'image',
      image: { ...mockImage, name: 'third.png' },
      children: [{ type: 'text', text: '' }],
    },
  ];

  it("deletes only the selected image and stops Slate's own Backspace", () => {
    const baseEditor = createEditor();
    // @ts-expect-error the mock image is enough for the block
    baseEditor.children = threeImages();

    Transforms.select(baseEditor, { path: [1, 0], offset: 0 });

    const preventDefault = jest.fn();
    // @ts-expect-error we don't need a full event object
    imageBlocks.image.handleBackspaceKey!(baseEditor, { preventDefault });

    // Otherwise Slate deletes again, from wherever the removal left the cursor:
    // the image before.
    expect(preventDefault).toHaveBeenCalled();
    expect(
      baseEditor.children.map((node) => ('image' in node ? node.image.name : node.type))
    ).toEqual(['first.png', 'third.png']);
  });

  it('leaves a selection across several blocks to Slate', () => {
    const baseEditor = createEditor();
    // @ts-expect-error the mock image is enough for the block
    baseEditor.children = threeImages();

    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [2, 0], offset: 0 },
    });

    const preventDefault = jest.fn();
    // @ts-expect-error we don't need a full event object
    imageBlocks.image.handleBackspaceKey!(baseEditor, { preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(baseEditor.children).toHaveLength(3);
  });
});

describe('createDroppedImagesInserter', () => {
  const paragraph = (text: string) => ({
    type: 'paragraph' as const,
    children: [{ type: 'text' as const, text }],
  });
  const asset = (name: string) =>
    ({
      ...mockImage,
      name,
      url: `/uploads/${name}`,
    }) as unknown as Schema.Attribute.MediaValue<true>[number];
  const dropEvent = {} as React.DragEvent;

  /** What the editor holds, one entry per block: the image name or the paragraph text. */
  const summary = (editor: Editor) =>
    editor.children.map((node) =>
      'image' in node
        ? `image:${node.image.name}`
        : Editor.string(editor, [editor.children.indexOf(node)])
    );

  let findEventRange: jest.SpyInstance | undefined;

  const dropOnBlock = (index: number | null) => {
    findEventRange = jest.spyOn(ReactEditor, 'findEventRange').mockImplementation(() => {
      if (index === null) {
        throw new Error('No block under the pointer');
      }

      return { anchor: { path: [index, 0], offset: 0 }, focus: { path: [index, 0], offset: 0 } };
    });
  };

  // Only this spy: restoring every mock would also drop the test setup's global ones.
  afterEach(() => {
    findEventRange?.mockRestore();
  });

  it('inserts the images below the block they were dropped on, in order', () => {
    const editor = createEditor();
    editor.children = [paragraph('First'), paragraph('Second')];
    dropOnBlock(0);

    const insert = createDroppedImagesInserter(editor, dropEvent);
    insert(asset('one.png'));
    insert(asset('two.png'));

    expect(summary(editor)).toEqual(['First', 'image:one.png', 'image:two.png', 'Second']);
  });

  it('replaces the empty paragraph it was dropped on', () => {
    const editor = createEditor();
    editor.children = [paragraph('First'), paragraph('')];
    dropOnBlock(1);

    const insert = createDroppedImagesInserter(editor, dropEvent);
    insert(asset('one.png'));
    insert(asset('two.png'));

    expect(summary(editor)).toEqual(['First', 'image:one.png', 'image:two.png']);
  });

  it('replaces the only, empty paragraph without leaving one after the images', () => {
    const editor = withStrapiSchema(createEditor());
    editor.children = [paragraph('')];
    dropOnBlock(0);

    const insert = createDroppedImagesInserter(editor, dropEvent);
    insert(asset('one.png'));
    insert(asset('two.png'));

    expect(summary(editor)).toEqual(['image:one.png', 'image:two.png']);
  });

  it('appends the images when dropped below the content', () => {
    const editor = createEditor();
    editor.children = [paragraph('First'), paragraph('Second')];
    dropOnBlock(null);

    createDroppedImagesInserter(editor, dropEvent)(asset('one.png'));

    expect(summary(editor)).toEqual(['First', 'Second', 'image:one.png']);
  });

  it('keeps the drop position while the content is edited during the upload', () => {
    const editor = createEditor();
    editor.children = [paragraph('First'), paragraph('Second')];
    dropOnBlock(1);

    const insert = createDroppedImagesInserter(editor, dropEvent);
    Transforms.insertNodes(editor, paragraph('Typed meanwhile'), { at: [0] });
    insert(asset('one.png'));

    expect(summary(editor)).toEqual(['Typed meanwhile', 'First', 'Second', 'image:one.png']);
  });
});

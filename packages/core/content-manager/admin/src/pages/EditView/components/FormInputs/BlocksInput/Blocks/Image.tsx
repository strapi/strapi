import * as React from 'react';

import { useStrapiApp } from '@strapi/admin/strapi-admin';
import { Box, Flex, FlexComponent } from '@strapi/design-system';
import { Image as Picture } from '@strapi/icons';
import { type Element, Transforms, Editor } from 'slate';
import { useFocused, type RenderElementProps, useSelected } from 'slate-react';
import { styled, css } from 'styled-components';

import { prefixFileUrlWithBackendUrl } from '../../../../../../utils/urls';
import { useBlocksEditorContext, type BlocksStore } from '../BlocksEditor';
import { type Block } from '../utils/types';

import type { Schema } from '@strapi/types';

const ImageWrapper = styled<FlexComponent>(Flex)<{ $isFocused?: boolean }>`
  transition-property: box-shadow;
  transition-duration: 0.2s;
  ${(props) =>
    props.$isFocused &&
    css`
      box-shadow: ${props.theme.colors.primary600} 0px 0px 0px 3px;
    `}

  & > img {
    height: auto;
    // The max-height is decided with the design team, the 56px is the height of the toolbar
    max-height: calc(512px - 56px);
    max-width: 100%;
    object-fit: contain;
  }
`;

const IMAGE_SCHEMA_FIELDS = [
  'name',
  'alternativeText',
  'url',
  'caption',
  'width',
  'height',
  'formats',
  'hash',
  'ext',
  'mime',
  'size',
  'previewUrl',
  'provider',
  'provider_metadata',
  'createdAt',
  'updatedAt',
];

const pick = <T extends object, K extends keyof T>(object: T, keys: K[]): Pick<T, K> => {
  const entries = keys.map((key) => [key, object[key]]);
  return Object.fromEntries(entries);
};

// Type guard to force TypeScript to narrow the type of the element in Blocks component
const isImage = (element: Element): element is Block<'image'> => {
  return element.type === 'image';
};

// Added a background color to the image wrapper to make it easier to recognize the image block
const Image = ({ attributes, children, element }: RenderElementProps) => {
  const editorIsFocused = useFocused();
  const imageIsSelected = useSelected();

  if (!isImage(element)) {
    return null;
  }
  const { url, alternativeText, width, height } = element.image;

  return (
    <Box {...attributes}>
      {children}
      <ImageWrapper
        background="neutral100"
        contentEditable={false}
        justifyContent="center"
        $isFocused={editorIsFocused && imageIsSelected}
        hasRadius
      >
        <img src={url} alt={alternativeText} width={width} height={height} />
      </ImageWrapper>
    </Box>
  );
};

const ImageDialog = () => {
  const [isOpen, setIsOpen] = React.useState(true);
  const { editor } = useBlocksEditorContext('ImageDialog');
  const components = useStrapiApp('ImageDialog', (state) => state.components);

  if (!components || !isOpen) return null;

  const MediaLibraryDialog = components['media-library'] as React.ComponentType<{
    allowedTypes: Schema.Attribute.MediaKind[];
    onClose: () => void;
    onSelectAssets: (_images: Schema.Attribute.MediaValue<true>) => void;
  }>;

  const insertImages = (images: Block<'image'>['image'][]) => {
    // If the selection is inside a list, split the list so that the modified block is outside of it
    Transforms.unwrapNodes(editor, {
      match: (node) => !Editor.isEditor(node) && node.type === 'list',
      split: true,
    });

    // Save the path of the node that is being replaced by an image to insert the images there later
    // It's the closest full block node above the selection
    const nodeEntryBeingReplaced = Editor.above(editor, {
      match(node) {
        if (Editor.isEditor(node)) return false;

        const isInlineNode = ['text', 'link'].includes(node.type);

        return !isInlineNode;
      },
    });

    if (!nodeEntryBeingReplaced) return;
    const [, pathToInsert] = nodeEntryBeingReplaced;

    // Remove the previous node that is being replaced by an image
    Transforms.removeNodes(editor);

    // Convert images to nodes and insert them
    const nodesToInsert = images.map((image) => {
      const imageNode: Block<'image'> = {
        type: 'image',
        image,
        children: [{ type: 'text', text: '' }],
      };
      return imageNode;
    });
    Transforms.insertNodes(editor, nodesToInsert, { at: pathToInsert });

    // Set the selection on the image since it was cleared by calling removeNodes
    Transforms.select(editor, pathToInsert);
  };

  const handleSelectAssets = (images: Schema.Attribute.MediaValue<true>) => {
    const formattedImages = images.map((image) => {
      // Create an object with imageSchema defined and exclude unnecessary props coming from media library config
      const expectedImage = pick(image, IMAGE_SCHEMA_FIELDS);

      const nodeImage: Block<'image'>['image'] = {
        ...expectedImage,
        alternativeText: expectedImage.alternativeText || expectedImage.name,
        url: prefixFileUrlWithBackendUrl(image.url),
      };

      return nodeImage;
    });

    insertImages(formattedImages);
    setIsOpen(false);
  };

  return (
    <MediaLibraryDialog
      allowedTypes={['images']}
      onClose={() => setIsOpen(false)}
      onSelectAssets={handleSelectAssets}
    />
  );
};

const imageBlocks: Pick<BlocksStore, 'image'> = {
  image: {
    renderElement: (props) => <Image {...props} />,
    icon: Picture,
    label: {
      id: 'components.Blocks.blocks.image',
      defaultMessage: 'Image',
    },
    matchNode: (node) => node.type === 'image',
    isInBlocksSelector: true,
    handleBackspaceKey(editor) {
      // Prevent issue where the image remains when it's the only block in the document
      if (editor.children.length === 1) {
        Transforms.setNodes(editor, {
          type: 'paragraph',
          // @ts-expect-error we're only setting image as null so that Slate deletes it
          image: null,
          children: [{ type: 'text', text: '' }],
        });
      } else {
        Transforms.removeNodes(editor);
      }
    },
    handleEnterKey(editor) {
      Transforms.insertNodes(editor, {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      });
    },
    handleConvert: () => {
      /**
       * All the logic is managed inside the ImageDialog component,
       * because the blocks are only created when the user selects images in the modal and submits
       * and if he closes the modal, then no changes are made to the editor
       */
      return () => <ImageDialog />;
    },
    snippets: ['!['],
  },
};

export { imageBlocks };

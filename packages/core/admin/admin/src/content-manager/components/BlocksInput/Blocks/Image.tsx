import * as React from 'react';

import { Box, Flex } from '@strapi/design-system';
import { Picture } from '@strapi/icons';
import { Transforms, type Element } from 'slate';
import { type RenderElementProps } from 'slate-react';
import styled from 'styled-components';

import { type BlocksStore } from '../BlocksEditor';
import { type Block } from '../utils/types';

// The max-height is decided with the design team, the 56px is the height of the toolbar
const Img = styled.img`
  max-height: calc(512px - 56px);
  max-width: 100%;
  object-fit: contain;
`;

// Type guard to force TypeScript to narrow the type of the element in Blocks component
const isImage = (element: Element): element is Block<'image'> => {
  return element.type === 'image';
};

// Added a background color to the image wrapper to make it easier to recognize the image block
const Image = ({ attributes, children, element }: RenderElementProps) => {
  if (!isImage(element)) {
    return null;
  }
  const { url, alternativeText, width, height } = element.image;

  return (
    <Box {...attributes}>
      {children}
      <Flex background="neutral100" contentEditable={false} justifyContent="center">
        <Img src={url} alt={alternativeText} width={width} height={height} />
      </Flex>
    </Box>
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
    value: {
      type: 'image',
    },
    handleEnterKey(editor) {
      Transforms.insertNodes(editor, {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      });
    },
    matchNode: (node) => node.type === 'image',
    isInBlocksSelector: true,
  },
};

export { imageBlocks };

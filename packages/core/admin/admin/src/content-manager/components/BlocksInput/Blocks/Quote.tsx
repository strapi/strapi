import * as React from 'react';

import { Quote } from '@strapi/icons';
import styled from 'styled-components';

import { type BlocksStore } from '../BlocksEditor';
import { pressEnterTwiceToExit } from '../utils/enterKey';

const Blockquote = styled.blockquote.attrs({ role: 'blockquote' })`
  margin: ${({ theme }) => `${theme.spaces[4]} 0`};
  font-weight: ${({ theme }) => theme.fontWeights.regular};
  border-left: ${({ theme }) => `${theme.spaces[1]} solid ${theme.colors.neutral200}`};
  padding: ${({ theme }) => theme.spaces[2]} ${({ theme }) => theme.spaces[5]};
  color: ${({ theme }) => theme.colors.neutral600};
`;

const quoteBlocks: Pick<BlocksStore, 'quote'> = {
  quote: {
    renderElement: (props) => <Blockquote {...props.attributes}>{props.children}</Blockquote>,
    icon: Quote,
    label: {
      id: 'components.Blocks.blocks.quote',
      defaultMessage: 'Quote',
    },
    value: {
      type: 'quote',
    },
    matchNode: (node) => node.type === 'quote',
    isInBlocksSelector: true,
    handleEnterKey(editor) {
      pressEnterTwiceToExit(editor);
    },
  },
};

export { quoteBlocks };

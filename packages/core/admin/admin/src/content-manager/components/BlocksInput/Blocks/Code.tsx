import * as React from 'react';

import { Code } from '@strapi/icons';
import { Transforms } from 'slate';
import styled from 'styled-components';

import { type BlocksStore } from '../BlocksEditor';
import { insertEmptyBlockAtLast, isLastBlockType, baseHandleConvert } from '../utils/conversions';
import { type Block } from '../utils/types';

const CodeBlock = styled.pre.attrs({ role: 'code' })`
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ theme }) => theme.colors.neutral100};
  max-width: 100%;
  overflow: auto;
  padding: ${({ theme }) => `${theme.spaces[3]} ${theme.spaces[4]}`};
  flex-shrink: 0;
  & > code {
    font-family: 'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas,
      monospace;
    color: ${({ theme }) => theme.colors.neutral800};
    overflow: auto;
    max-width: 100%;
  }
`;

const codeBlocks: Pick<BlocksStore, 'code'> = {
  code: {
    renderElement: (props) => (
      <CodeBlock {...props.attributes}>
        <code>{props.children}</code>
      </CodeBlock>
    ),
    icon: Code,
    label: {
      id: 'components.Blocks.blocks.code',
      defaultMessage: 'Code',
    },
    matchNode: (node) => node.type === 'code',
    isInBlocksSelector: true,
    handleConvert(editor) {
      baseHandleConvert<Block<'code'>>(editor, { type: 'code' });

      if (isLastBlockType(editor, 'code')) {
        insertEmptyBlockAtLast(editor);
      }
    },
    handleEnterKey(editor) {
      // Insert a new line within the block
      Transforms.insertText(editor, '\n');
    },
  },
};

export { codeBlocks };

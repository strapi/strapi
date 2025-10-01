import React from 'react';
import styled from 'styled-components';
import { Editor, Transforms } from 'slate';

import { Flex } from '@strapi/design-system';

import { registerPreviewRoute } from './preview';
import { Information } from '@strapi/icons';

const config = {
  locales: ['it', 'es', 'en', 'en-GB'],
};

// Styled callout container
const CalloutContainer = styled.div.attrs({ role: 'note' })`
  background: ${({ theme }) => theme.colors.primary100};
  border: 1px solid ${({ theme }) => theme.colors.primary200};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => theme.spaces[4]};
  margin: ${({ theme }) => theme.spaces[2]} 0;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: ${({ theme }) => theme.colors.primary600};
    border-radius: ${({ theme }) => theme.borderRadius} 0 0 ${({ theme }) => theme.borderRadius};
  }
`;

const CalloutContent = styled.div`
  padding-left: ${({ theme }) => theme.spaces[1]};

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.neutral700};
    line-height: 1.6;
  }

  strong,
  b {
    font-weight: ${({ theme }) => theme.fontWeights.semiBold};
  }

  em,
  i {
    font-style: italic;
  }
`;

const CalloutIcon = styled.div`
  color: ${({ theme }) => theme.colors.primary600};
  margin-right: ${({ theme }) => theme.spaces[2]};
  flex-shrink: 0;
  margin-top: 2px;
`;

// Callout component
const Callout = (props) => (
  <CalloutContainer {...props.attributes}>
    <Flex alignItems="flex-start">
      <CalloutIcon>
        <Information width="16px" height="16px" />
      </CalloutIcon>
      <CalloutContent>{props.children}</CalloutContent>
    </Flex>
  </CalloutContainer>
);

// Utility function for block conversion (simplified version of baseHandleConvert)
const convertToCallout = (editor) => {
  if (!editor.selection) {
    const [_, lastNodePath] = Editor.last(editor, []);

    // Find the current block node
    const entry = Editor.above(editor, {
      match: (node) => !Editor.isEditor(node) && node.type !== 'text' && node.type !== 'link',
      at: lastNodePath,
    });

    if (entry && !Editor.isEditor(entry[0])) {
      const [, elementPath] = entry;
      Transforms.setNodes(editor, { type: 'callout' }, { at: elementPath });
    }
    return;
  }

  // Find the current block node at selection
  const entry = Editor.above(editor, {
    match: (node) => !Editor.isEditor(node) && node.type !== 'text' && node.type !== 'link',
  });

  if (entry && !Editor.isEditor(entry[0])) {
    const [, elementPath] = entry;
    Transforms.setNodes(editor, { type: 'callout' }, { at: elementPath });
  }
};

// Handle enter key behavior
const handleCalloutEnter = (editor) => {
  if (!editor.selection) return;

  const nodeEntry = Editor.above(editor, {
    match: (node) => !Editor.isEditor(node) && node.type === 'callout',
  });

  if (!nodeEntry) return;

  const [node, nodePath] = nodeEntry;
  const isNodeEnd = Editor.isEnd(editor, editor.selection.anchor, nodePath);

  // Check if we're at the end and the last text is empty or ends with newline
  const lastChild = node.children[node.children.length - 1];
  const isEmpty =
    lastChild &&
    lastChild.type === 'text' &&
    (lastChild.text === '' || lastChild.text.endsWith('\n'));

  if (isNodeEnd && isEmpty && lastChild.text.endsWith('\n')) {
    // Remove the trailing newline and exit the callout
    Transforms.delete(editor, { distance: 1, unit: 'character', reverse: true });
    Transforms.insertNodes(editor, {
      type: 'paragraph',
      children: [{ type: 'text', text: '' }],
    });
    return;
  }

  // Insert a line break within the callout
  Transforms.insertText(editor, '\n');

  // Remove formatting at the end of lines
  if (isNodeEnd) {
    ['bold', 'italic', 'underline', 'strikethrough', 'code'].forEach((modifier) => {
      Editor.removeMark(editor, modifier);
    });
  }
};

export default {
  config,
  register: (app) => {
    app.getPlugin('content-manager').apis.addBlocks([
      {
        key: 'callout',
        renderElement: (props) => <Callout {...props} />,
        icon: Information,
        label: { id: 'blocks.callout', defaultMessage: 'Callout' },
        matchNode: (node) => node.type === 'callout',
        isInBlocksSelector: true,
        handleConvert(editor) {
          convertToCallout(editor);
        },
        handleEnterKey(editor) {
          handleCalloutEnter(editor);
        },
        snippets: [':::callout'],
        dragHandleTopMargin: '10px',
      },
    ]);
    registerPreviewRoute(app);
  },
};

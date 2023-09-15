import * as React from 'react';

import { Typography } from '@strapi/design-system';
import { Bold, Italic, Underline, StrikeThrough, Code } from '@strapi/icons';
import { Editor } from 'slate';
import { useSlate } from 'slate-react';
import styled from 'styled-components';

const ItalicText = styled(Typography)`
  font-style: italic;
`;

const InlineCode = styled.code`
  background-color: ${({ theme }) => theme.colors.neutral150};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => `0 ${theme.spaces[2]}`};
  font-family: 'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas,
    monospace;
`;

export function useModifiersStore() {
  const editor = useSlate();
  const modifiers = Editor.marks(editor);

  const baseCheckIsActive = (name) => {
    if (!modifiers) return false;

    return Boolean(modifiers[name]);
  };

  const baseHandleToggle = (name) => {
    if (modifiers[name]) {
      Editor.removeMark(editor, name);
    } else {
      Editor.addMark(editor, name, true);
    }
  };

  return {
    bold: {
      icon: Bold,
      label: { id: 'components.Blocks.modifiers.bold', defaultMessage: 'Bold' },
      checkIsActive: () => baseCheckIsActive('bold'),
      handleToggle: () => baseHandleToggle('bold'),
      renderLeaf: (children) => <Typography fontWeight="bold">{children}</Typography>,
    },
    italic: {
      icon: Italic,
      label: { id: 'components.Blocks.modifiers.italic', defaultMessage: 'Italic' },
      checkIsActive: () => baseCheckIsActive('italic'),
      handleToggle: () => baseHandleToggle('italic'),
      renderLeaf: (children) => <ItalicText>{children}</ItalicText>,
    },
    underline: {
      icon: Underline,
      label: { id: 'components.Blocks.modifiers.underline', defaultMessage: 'Underline' },
      checkIsActive: () => baseCheckIsActive('underline'),
      handleToggle: () => baseHandleToggle('underline'),
      renderLeaf: (children) => <Typography textDecoration="underline">{children}</Typography>,
    },
    strikethrough: {
      icon: StrikeThrough,
      label: { id: 'components.Blocks.modifiers.strikethrough', defaultMessage: 'Strikethrough' },
      checkIsActive: () => baseCheckIsActive('strikethrough'),
      handleToggle: () => baseHandleToggle('strikethrough'),
      renderLeaf: (children) => <Typography textDecoration="line-through">{children}</Typography>,
    },
    code: {
      icon: Code,
      label: { id: 'components.Blocks.modifiers.code', defaultMessage: 'Code' },
      checkIsActive: () => baseCheckIsActive('code'),
      handleToggle: () => baseHandleToggle('code'),
      renderLeaf: (children) => <InlineCode>{children}</InlineCode>,
    },
  };
}

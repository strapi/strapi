import * as React from 'react';

import { Typography } from '@strapi/design-system';
import { Bold, Italic, Underline, StrikeThrough, Code } from '@strapi/icons';
import { Editor } from 'slate';
import { useSlate } from 'slate-react';
import styled, { css } from 'styled-components';

const stylesToInherit = css`
  font-size: inherit;
  color: inherit;
  line-height: inherit;
`;

const BoldText = styled(Typography).attrs({ fontWeight: 'bold' })`
  ${stylesToInherit}
`;

const ItalicText = styled(Typography)`
  font-style: italic;
  ${stylesToInherit}
`;

const UnderlineText = styled(Typography).attrs({ textDecoration: 'underline' })`
  ${stylesToInherit}
`;

const StrikeThroughText = styled(Typography).attrs({ textDecoration: 'line-through' })`
  ${stylesToInherit}
`;

const InlineCode = styled.code`
  background-color: ${({ theme }) => theme.colors.neutral150};
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: ${({ theme }) => `0 ${theme.spaces[2]}`};
  font-family: 'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas,
    monospace;
  color: inherit;
`;

/**
 * Manages a store of all the available modifiers.
 *
 * @returns {{
 *   [key: string]: {
 *     icon: IconComponent,
 *     label: {id: string, defaultMessage: string},
 *     checkIsActive: () => boolean,
 *     handleToggle: () => void,
 *     renderLeaf: (children: JSX.Element) => JSX.Element,
 *   }
 * }} An object containing rendering functions and metadata for different text modifiers, indexed by name.
 */
export function useModifiersStore() {
  const editor = useSlate();
  const modifiers = Editor.marks(editor);

  /**
   * The default handler for checking if a modifier is active
   *
   * @param {string} name - The name of the modifier to check
   */
  const baseCheckIsActive = (name) => {
    if (!modifiers) return false;

    return Boolean(modifiers[name]);
  };

  /**
   * The default handler for toggling a modifier
   *
   * @param {string} name - The name of the modifier to toggle
   */
  const baseHandleToggle = (name) => {
    if (modifiers?.[name]) {
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
      renderLeaf: (children) => <BoldText>{children}</BoldText>,
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
      renderLeaf: (children) => <UnderlineText>{children}</UnderlineText>,
    },
    strikethrough: {
      icon: StrikeThrough,
      label: { id: 'components.Blocks.modifiers.strikethrough', defaultMessage: 'Strikethrough' },
      checkIsActive: () => baseCheckIsActive('strikethrough'),
      handleToggle: () => baseHandleToggle('strikethrough'),
      renderLeaf: (children) => <StrikeThroughText>{children}</StrikeThroughText>,
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

import * as React from 'react';

import { Typography, TypographyComponent } from '@strapi/design-system';
import { Bold, Italic, Underline, StrikeThrough, Code } from '@strapi/icons';
import { type MessageDescriptor } from 'react-intl';
import { Editor, Text, Transforms } from 'slate';
import { styled, css } from 'styled-components';

const stylesToInherit = css`
  font-size: inherit;
  color: inherit;
  line-height: inherit;
`;

const BoldText = styled<TypographyComponent>(Typography).attrs({ fontWeight: 'bold' })`
  ${stylesToInherit}
`;

const ItalicText = styled<TypographyComponent>(Typography)`
  font-style: italic;
  ${stylesToInherit}
`;

const UnderlineText = styled<TypographyComponent>(Typography).attrs({
  textDecoration: 'underline',
})`
  ${stylesToInherit}
`;

const StrikeThroughText = styled<TypographyComponent>(Typography).attrs({
  textDecoration: 'line-through',
})`
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

type ModifierKey = Exclude<keyof Text, 'type' | 'text'>;

type ModifiersStore = {
  [K in ModifierKey]: {
    icon: React.ComponentType;
    isValidEventKey: (event: React.KeyboardEvent<HTMLElement>) => boolean;
    label: MessageDescriptor;
    checkIsActive: (editor: Editor) => boolean;
    handleToggle: (editor: Editor) => void;
    renderLeaf: (children: React.JSX.Element | string) => React.JSX.Element;
  };
};

/**
 * The default handler for checking if a modifier is active
 */
const baseCheckIsActive = (editor: Editor, name: ModifierKey) => {
  const marks = Editor.marks(editor);
  if (!marks) return false;

  return Boolean(marks[name]);
};

/**
 * The default handler for toggling a modifier
 */
const baseHandleToggle = (editor: Editor, name: ModifierKey) => {
  const marks = Editor.marks(editor);

  // If there is no selection, set selection to the end of line
  if (!editor.selection) {
    const endOfEditor = Editor.end(editor, []);
    Transforms.select(editor, endOfEditor);
  }

  // Toggle the modifier
  if (marks?.[name]) {
    Editor.removeMark(editor, name);
  } else {
    Editor.addMark(editor, name, true);
  }
};

const modifiers: ModifiersStore = {
  bold: {
    icon: Bold,
    isValidEventKey: (event) => event.key === 'b',
    label: { id: 'components.Blocks.modifiers.bold', defaultMessage: 'Bold' },
    checkIsActive: (editor) => baseCheckIsActive(editor, 'bold'),
    handleToggle: (editor) => baseHandleToggle(editor, 'bold'),
    renderLeaf: (children) => <BoldText>{children}</BoldText>,
  },
  italic: {
    icon: Italic,
    isValidEventKey: (event) => event.key === 'i',
    label: { id: 'components.Blocks.modifiers.italic', defaultMessage: 'Italic' },
    checkIsActive: (editor) => baseCheckIsActive(editor, 'italic'),
    handleToggle: (editor) => baseHandleToggle(editor, 'italic'),
    renderLeaf: (children) => <ItalicText>{children}</ItalicText>,
  },
  underline: {
    icon: Underline,
    isValidEventKey: (event) => event.key === 'u',
    label: { id: 'components.Blocks.modifiers.underline', defaultMessage: 'Underline' },
    checkIsActive: (editor) => baseCheckIsActive(editor, 'underline'),
    handleToggle: (editor) => baseHandleToggle(editor, 'underline'),
    renderLeaf: (children) => <UnderlineText>{children}</UnderlineText>,
  },
  strikethrough: {
    icon: StrikeThrough,
    isValidEventKey: (event) => event.key === 'S' && event.shiftKey,
    label: { id: 'components.Blocks.modifiers.strikethrough', defaultMessage: 'Strikethrough' },
    checkIsActive: (editor) => baseCheckIsActive(editor, 'strikethrough'),
    handleToggle: (editor) => baseHandleToggle(editor, 'strikethrough'),
    renderLeaf: (children) => <StrikeThroughText>{children}</StrikeThroughText>,
  },
  code: {
    icon: Code,
    isValidEventKey: (event) => event.key === 'e',
    label: { id: 'components.Blocks.modifiers.code', defaultMessage: 'Inline code' },
    checkIsActive: (editor) => baseCheckIsActive(editor, 'code'),
    handleToggle: (editor) => baseHandleToggle(editor, 'code'),
    renderLeaf: (children) => <InlineCode>{children}</InlineCode>,
  },
};

export { type ModifiersStore, modifiers };

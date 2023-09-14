import { Bold, Italic, Underline, StrikeThrough, Code } from '@strapi/icons';
import { Editor } from 'slate';
import { useSlate } from 'slate-react';

export function useModifiers() {
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

  return [
    {
      name: 'bold',
      icon: Bold,
      label: { id: 'components.Blocks.modifiers.bold', defaultMessage: 'Bold' },
      checkIsActive: () => baseCheckIsActive('bold'),
      handleToggle: () => baseHandleToggle('bold'),
    },
    {
      name: 'italic',
      icon: Italic,
      label: { id: 'components.Blocks.modifiers.italic', defaultMessage: 'Italic' },
      checkIsActive: () => baseCheckIsActive('italic'),
      handleToggle: () => baseHandleToggle('italic'),
    },
    {
      name: 'underline',
      icon: Underline,
      label: { id: 'components.Blocks.modifiers.underline', defaultMessage: 'Underline' },
      checkIsActive: () => baseCheckIsActive('underline'),
      handleToggle: () => baseHandleToggle('underline'),
    },
    {
      name: 'strikethrough',
      icon: StrikeThrough,
      label: { id: 'components.Blocks.modifiers.strikethrough', defaultMessage: 'Strikethrough' },
      checkIsActive: () => baseCheckIsActive('strikethrough'),
      handleToggle: () => baseHandleToggle('strikethrough'),
    },
    {
      name: 'code',
      icon: Code,
      label: { id: 'components.Blocks.modifiers.code', defaultMessage: 'Code' },
      checkIsActive: () => baseCheckIsActive('code'),
      handleToggle: () => baseHandleToggle('code'),
    },
  ];
}

import type { MutableRefObject } from 'react';

import { markdownHandler } from './utils';

import type CodeMirror from 'codemirror5';

type ShortcutHandler = (cm: CodeMirror.Editor) => void;

const createMarkdownShortcut =
  (
    editorRef: MutableRefObject<CodeMirror.EditorFromTextArea>,
    markdownType: string
  ): ShortcutHandler =>
  () => {
    markdownHandler(editorRef, markdownType);
  };

export const createMarkdownKeyboardShortcuts = (
  editorRef: MutableRefObject<CodeMirror.EditorFromTextArea>
): Record<string, ShortcutHandler> => ({
  'Cmd-B': createMarkdownShortcut(editorRef, 'Bold'),
  'Ctrl-B': createMarkdownShortcut(editorRef, 'Bold'),
  'Cmd-I': createMarkdownShortcut(editorRef, 'Italic'),
  'Ctrl-I': createMarkdownShortcut(editorRef, 'Italic'),
  'Cmd-U': createMarkdownShortcut(editorRef, 'Underline'),
  'Ctrl-U': createMarkdownShortcut(editorRef, 'Underline'),
  'Cmd-K': createMarkdownShortcut(editorRef, 'Link'),
  'Ctrl-K': createMarkdownShortcut(editorRef, 'Link'),
});

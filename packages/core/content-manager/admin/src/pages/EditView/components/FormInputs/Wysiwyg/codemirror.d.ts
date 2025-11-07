import 'codemirror5';

declare module 'codemirror5' {
  interface CommandActions {
    bold: () => void;
    italic: () => void;
    underline: () => void;
    link: () => void;
    newlineAndIndentContinueMarkdownList: (cm: Editor) => void;
  }
}

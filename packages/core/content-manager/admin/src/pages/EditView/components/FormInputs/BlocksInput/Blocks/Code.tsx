import * as React from 'react';

import { Box, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { Code } from '@strapi/icons';
import { useSelected, type RenderElementProps, useFocused, ReactEditor } from 'slate-react';
import { styled } from 'styled-components';

import { useBlocksEditorContext, type BlocksStore } from '../BlocksEditor';
import { baseHandleConvert } from '../utils/conversions';
import { pressEnterTwiceToExit } from '../utils/enterKey';
import { type Block } from '../utils/types';

const languages: { value: string; label: string }[] = [
  {
    value: 'asm',
    label: 'Assembly',
  },
  {
    value: 'bash',
    label: 'Bash',
  },
  {
    value: 'c',
    label: 'C',
  },
  {
    value: 'clojure',
    label: 'Clojure',
  },
  {
    value: 'cobol',
    label: 'COBOL',
  },
  {
    value: 'cpp',
    label: 'C++',
  },
  {
    value: 'csharp',
    label: 'C#',
  },
  {
    value: 'css',
    label: 'CSS',
  },
  {
    value: 'dart',
    label: 'Dart',
  },
  {
    value: 'dockerfile',
    label: 'Dockerfile',
  },
  {
    value: 'elixir',
    label: 'Elixir',
  },
  {
    value: 'erlang',
    label: 'Erlang',
  },
  {
    value: 'fortran',
    label: 'Fortran',
  },
  {
    value: 'fsharp',
    label: 'F#',
  },
  {
    value: 'go',
    label: 'Go',
  },
  {
    value: 'graphql',
    label: 'GraphQL',
  },
  {
    value: 'groovy',
    label: 'Groovy',
  },
  {
    value: 'haskell',
    label: 'Haskell',
  },
  {
    value: 'haxe',
    label: 'Haxe',
  },
  {
    value: 'html',
    label: 'HTML',
  },
  {
    value: 'ini',
    label: 'INI',
  },
  {
    value: 'java',
    label: 'Java',
  },
  {
    value: 'javascript',
    label: 'JavaScript',
  },
  {
    value: 'jsx',
    label: 'JavaScript (React)',
  },
  {
    value: 'json',
    label: 'JSON',
  },
  {
    value: 'julia',
    label: 'Julia',
  },
  {
    value: 'kotlin',
    label: 'Kotlin',
  },
  {
    value: 'latex',
    label: 'LaTeX',
  },
  {
    value: 'lua',
    label: 'Lua',
  },
  {
    value: 'markdown',
    label: 'Markdown',
  },
  {
    value: 'matlab',
    label: 'MATLAB',
  },
  {
    value: 'makefile',
    label: 'Makefile',
  },
  {
    value: 'objectivec',
    label: 'Objective-C',
  },
  {
    value: 'perl',
    label: 'Perl',
  },
  {
    value: 'php',
    label: 'PHP',
  },
  {
    value: 'plaintext',
    label: 'Plain Text',
  },
  {
    value: 'powershell',
    label: 'PowerShell',
  },
  {
    value: 'python',
    label: 'Python',
  },
  {
    value: 'r',
    label: 'R',
  },
  {
    value: 'ruby',
    label: 'Ruby',
  },
  {
    value: 'rust',
    label: 'Rust',
  },
  {
    value: 'sas',
    label: 'SAS',
  },
  {
    value: 'scala',
    label: 'Scala',
  },
  {
    value: 'scheme',
    label: 'Scheme',
  },
  {
    value: 'shell',
    label: 'Shell',
  },
  {
    value: 'sql',
    label: 'SQL',
  },
  {
    value: 'stata',
    label: 'Stata',
  },
  {
    value: 'swift',
    label: 'Swift',
  },
  {
    value: 'typescript',
    label: 'TypeScript',
  },
  {
    value: 'tsx',
    label: 'TypeScript (React)',
  },
  {
    value: 'vbnet',
    label: 'VB.NET',
  },
  {
    value: 'xml',
    label: 'XML',
  },
  {
    value: 'yaml',
    label: 'YAML',
  },
];

const CodeBlock = styled.pre`
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ theme }) => theme.colors.neutral100};
  max-width: 100%;
  overflow: auto;
  padding: ${({ theme }) => `${theme.spaces[3]} ${theme.spaces[4]}`};
  flex-shrink: 1;

  & > code {
    font-family: 'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas,
      monospace;
    color: ${({ theme }) => theme.colors.neutral800};
    overflow: auto;
    max-width: 100%;
  }
`;

const CodeEditor = (props: RenderElementProps) => {
  const { editor } = useBlocksEditorContext('ImageDialog');
  const editorIsFocused = useFocused();
  const imageIsSelected = useSelected();
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const shouldDisplayLanguageSelect = (editorIsFocused && imageIsSelected) || isSelectOpen;

  const [language, setSyntax] = React.useState('plaintext');

  return (
    <Box position="relative" width="100%">
      <CodeBlock {...props.attributes}>
        <code>{props.children}</code>
      </CodeBlock>
      {shouldDisplayLanguageSelect && (
        <Box
          position="absolute"
          background="neutral0"
          borderColor="neutral150"
          borderStyle="solid"
          borderWidth="0.5px"
          shadow="tableShadow"
          top="100%"
          marginTop={1}
          right={0}
          padding={1}
          hasRadius
        >
          <SingleSelect
            onChange={(open) => setSyntax(open.toString())}
            value={language}
            onOpenChange={(open) => {
              setIsSelectOpen(open);

              // Focus the editor again when closing the select so the user can continue typing
              if (!open) {
                ReactEditor.focus(editor);
              }
            }}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {languages.map(({ value, label }) => (
              <SingleSelectOption value={value} key={value}>
                {label}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        </Box>
      )}
    </Box>
  );
};

const codeBlocks: Pick<BlocksStore, 'code'> = {
  code: {
    renderElement: (props) => <CodeEditor {...props} />,
    icon: Code,
    label: {
      id: 'components.Blocks.blocks.code',
      defaultMessage: 'Code block',
    },
    matchNode: (node) => node.type === 'code',
    isInBlocksSelector: true,
    handleConvert(editor) {
      baseHandleConvert<Block<'code'>>(editor, { type: 'code' });
    },
    handleEnterKey(editor) {
      pressEnterTwiceToExit(editor);
    },
    snippets: ['```'],
    dragHandleTopMargin: '10px',
  },
};

export { codeBlocks };

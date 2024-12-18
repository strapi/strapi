import * as React from 'react';

import { Box, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { CodeBlock as CodeBlockIcon } from '@strapi/icons';
import * as Prism from 'prismjs';
import { useIntl } from 'react-intl';
import { BaseRange, Element, Editor, Node, NodeEntry, Transforms } from 'slate';
import { useSelected, type RenderElementProps, useFocused, ReactEditor } from 'slate-react';
import { styled } from 'styled-components';

import { useBlocksEditorContext, type BlocksStore } from '../BlocksEditor';
import { codeLanguages } from '../utils/constants';
import { baseHandleConvert } from '../utils/conversions';
import { pressEnterTwiceToExit } from '../utils/enterKey';
import { type Block } from '../utils/types';
// Import the PrismJS theme to highlight the code
import 'prismjs/themes/prism-solarizedlight.css';
import './utils/prismLanguages';

type BaseRangeCustom = BaseRange & { className: string };

export const decorateCode = ([node, path]: NodeEntry) => {
  const ranges: BaseRangeCustom[] = [];

  // make sure it is an Slate Element
  if (!Element.isElement(node) || node.type !== 'code') return ranges;
  // transform the Element into a string
  const text = Node.string(node);
  const language = codeLanguages.find((lang) => lang.value === node.language);
  const decorateKey = language?.decorate ?? language?.value;

  const selectedLanguage = Prism.languages[decorateKey || 'plaintext'];

  // create "tokens" with "prismjs" and put them in "ranges"
  const tokens = Prism.tokenize(text, selectedLanguage);
  let start = 0;
  for (const token of tokens) {
    const length = token.length;
    const end = start + length;
    if (typeof token !== 'string') {
      ranges.push({
        anchor: { path, offset: start },
        focus: { path, offset: end },
        className: `token ${token.type}`,
      });
    }
    start = end;
  }

  // these will be found in "renderLeaf" in "leaf" and their "className" will be applied
  return ranges;
};

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
  const { formatMessage } = useIntl();
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const shouldDisplayLanguageSelect = (editorIsFocused && imageIsSelected) || isSelectOpen;

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
            onChange={(open) => {
              Transforms.setNodes(
                editor,
                { language: open.toString() },
                { match: (node) => !Editor.isEditor(node) && node.type === 'code' }
              );
            }}
            value={(props.element.type === 'code' && props.element.language) || 'plaintext'}
            onOpenChange={(open) => {
              setIsSelectOpen(open);

              // Focus the editor again when closing the select so the user can continue typing
              if (!open) {
                ReactEditor.focus(editor);
              }
            }}
            onCloseAutoFocus={(e) => e.preventDefault()}
            aria-label={formatMessage({
              id: 'components.Blocks.blocks.code.languageLabel',
              defaultMessage: 'Select a language',
            })}
          >
            {codeLanguages.map(({ value, label }) => (
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
    icon: CodeBlockIcon,
    label: {
      id: 'components.Blocks.blocks.code',
      defaultMessage: 'Code block',
    },
    matchNode: (node) => node.type === 'code',
    isInBlocksSelector: true,
    handleConvert(editor) {
      baseHandleConvert<Block<'code'>>(editor, { type: 'code', language: 'plaintext' });
    },
    handleEnterKey(editor) {
      pressEnterTwiceToExit(editor);
    },
    snippets: ['```'],
  },
};

export { codeBlocks };

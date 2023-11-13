import * as React from 'react';

import { lightTheme } from '@strapi/design-system';
import { type Attribute } from '@strapi/types';
import { IntlProvider } from 'react-intl';
import { createEditor } from 'slate';
import { Slate, withReact } from 'slate-react';
import { ThemeProvider } from 'styled-components';

import { BlocksEditorProvider } from '../../BlocksEditor';
import { type BlocksStore } from '../../hooks/useBlocksStore';
import { codeBlocks } from '../Code';
import { headingBlocks } from '../Heading';
import { imageBlocks } from '../Image';
import { linkBlocks } from '../Link';
import { listBlocks } from '../List';
import { paragraphBlocks } from '../Paragraph';
import { quoteBlocks } from '../Quote';

const baseEditor = createEditor();

interface WrapperProps {
  initialValue?: Attribute.BlocksValue;
  children: React.ReactNode;
}

const Wrapper = ({ children, initialValue = [] }: WrapperProps) => {
  const [editor] = React.useState(() => withReact(baseEditor));

  const blocks: BlocksStore = {
    ...paragraphBlocks,
    ...headingBlocks,
    ...listBlocks,
    ...linkBlocks,
    ...imageBlocks,
    ...quoteBlocks,
    ...codeBlocks,
  };

  return (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider messages={{}} locale="en">
        <Slate initialValue={initialValue} editor={editor}>
          <BlocksEditorProvider blocks={blocks}>{children}</BlocksEditorProvider>
        </Slate>
      </IntlProvider>
    </ThemeProvider>
  );
};

export { Wrapper };

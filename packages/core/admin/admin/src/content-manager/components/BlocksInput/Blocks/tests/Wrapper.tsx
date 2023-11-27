import * as React from 'react';

import { lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { createEditor } from 'slate';
import { Slate, withReact } from 'slate-react';
import { ThemeProvider } from 'styled-components';

import { type BlocksStore, BlocksEditorProvider } from '../../BlocksEditor';
import { modifiers } from '../../Modifiers';
import { codeBlocks } from '../Code';
import { headingBlocks } from '../Heading';
import { imageBlocks } from '../Image';
import { linkBlocks } from '../Link';
import { listBlocks } from '../List';
import { paragraphBlocks } from '../Paragraph';
import { quoteBlocks } from '../Quote';

const baseEditor = createEditor();

interface WrapperProps {
  children: React.ReactNode;
}

const Wrapper = ({ children }: WrapperProps) => {
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
        <Slate initialValue={[]} editor={editor}>
          <BlocksEditorProvider
            modifiers={modifiers}
            blocks={blocks}
            disabled={false}
            name="blocks"
            setLiveText={() => {}}
          >
            {children}
          </BlocksEditorProvider>
        </Slate>
      </IntlProvider>
    </ThemeProvider>
  );
};

export { Wrapper };

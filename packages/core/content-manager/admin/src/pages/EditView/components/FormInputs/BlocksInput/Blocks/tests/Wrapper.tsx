import * as React from 'react';

import { DesignSystemProvider } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { type Editor, createEditor } from 'slate';
import { Slate, withReact } from 'slate-react';

import { codeBlocks } from '@content-manager/admin/pages/EditView/components/FormInputs/BlocksInput/Blocks/Code';
import { headingBlocks } from '@content-manager/admin/pages/EditView/components/FormInputs/BlocksInput/Blocks/Heading';
import { imageBlocks } from '@content-manager/admin/pages/EditView/components/FormInputs/BlocksInput/Blocks/Image';
import { linkBlocks } from '@content-manager/admin/pages/EditView/components/FormInputs/BlocksInput/Blocks/Link';
import { listBlocks } from '@content-manager/admin/pages/EditView/components/FormInputs/BlocksInput/Blocks/List';
import { paragraphBlocks } from '@content-manager/admin/pages/EditView/components/FormInputs/BlocksInput/Blocks/Paragraph';
import { quoteBlocks } from '@content-manager/admin/pages/EditView/components/FormInputs/BlocksInput/Blocks/Quote';
import {
  type BlocksStore,
  BlocksEditorProvider,
} from '@content-manager/admin/pages/EditView/components/FormInputs/BlocksInput/BlocksEditor';
import { modifiers } from '@content-manager/admin/pages/EditView/components/FormInputs/BlocksInput/Modifiers';

const defaultBaseEditor = createEditor();

interface WrapperProps {
  children: React.ReactNode;
  baseEditor?: Editor;
}

const Wrapper = ({ children, baseEditor = defaultBaseEditor }: WrapperProps) => {
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
    <DesignSystemProvider>
      <IntlProvider messages={{}} locale="en">
        <Slate initialValue={baseEditor.children} editor={editor}>
          <BlocksEditorProvider
            blocks={blocks}
            modifiers={modifiers}
            disabled={false}
            name="blocks"
            setLiveText={() => {}}
            isExpandedMode={false}
          >
            {children}
          </BlocksEditorProvider>
        </Slate>
      </IntlProvider>
    </DesignSystemProvider>
  );
};

export { Wrapper };

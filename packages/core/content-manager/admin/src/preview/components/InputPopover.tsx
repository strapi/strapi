import * as React from 'react';

import { createContext } from '@strapi/admin/strapi-admin';
import { Box, Popover } from '@strapi/design-system';

import { type UseDocument } from '../../hooks/useDocument';
import { InputRenderer } from '../../pages/EditView/components/InputRenderer';
import { usePreviewContext } from '../pages/Preview';

/**
 * No need for actual data in the context. It's just to let children check if they're rendered
 * inside of a preview InputPopover without relying on prop drilling.
 */
interface InputPopoverContextValue {}

const [InputPopoverProvider, useInputPopoverContext] =
  createContext<InputPopoverContextValue>('InputPopover');

const InputPopover = ({ documentResponse }: { documentResponse: ReturnType<UseDocument> }) => {
  const iframeRef = usePreviewContext('VisualEditingPopover', (state) => state.iframeRef);
  const popoverField = usePreviewContext('VisualEditingPopover', (state) => state.popoverField);
  const setPopoverField = usePreviewContext(
    'VisualEditingPopover',
    (state) => state.setPopoverField
  );

  if (!popoverField || !documentResponse.schema || !iframeRef.current) {
    return null;
  }

  const iframeRect = iframeRef.current.getBoundingClientRect();

  return (
    <>
      {popoverField && (
        <Box
          position={'fixed'}
          top={iframeRect.top + 'px'}
          left={iframeRect.left + 'px'}
          width={iframeRect.width + 'px'}
          height={iframeRect.height + 'px'}
          zIndex={4}
        />
      )}
      <InputPopoverProvider>
        <Popover.Root
          open={popoverField != null}
          onOpenChange={(open) => !open && setPopoverField(null)}
        >
          <Popover.Trigger>
            <Box
              id="popover-trigger"
              position="fixed"
              width={popoverField.position.width + 'px'}
              height={popoverField.position.height + 'px'}
              top={iframeRect.top + popoverField.position.top + 'px'}
              left={iframeRect.left + popoverField.position.left + 'px'}
            />
          </Popover.Trigger>
          <Popover.Content sideOffset={4}>
            <Box padding={4} width="400px">
              <InputRenderer
                document={documentResponse}
                attribute={documentResponse.schema.attributes[popoverField.path] as any}
                label={popoverField.path}
                name={popoverField.path}
                type={documentResponse.schema.attributes[popoverField.path].type}
                visible={true}
              />
            </Box>
          </Popover.Content>
        </Popover.Root>
      </InputPopoverProvider>
    </>
  );
};

function useHasInputPopoverParent() {
  const context = useInputPopoverContext('useHasInputPopoverParent', () => true, false);

  // useContext will return undefined if the called is not wrapped in the provider
  return context !== undefined;
}

export { InputPopover, useHasInputPopoverParent };

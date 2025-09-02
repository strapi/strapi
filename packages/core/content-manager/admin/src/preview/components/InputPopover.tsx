import * as React from 'react';

import { createContext } from '@strapi/admin/strapi-admin';
import { Box, Popover } from '@strapi/design-system';

import { type UseDocument } from '../../hooks/useDocument';
import { InputRenderer } from '../../pages/EditView/components/InputRenderer';
import { usePreviewContext } from '../pages/Preview';
import { parsePathWithIndices, getAttributeSchema } from '../utils/fieldUtils';

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

  const pathParts = parsePathWithIndices(popoverField.path);
  const attributeSchema = getAttributeSchema({
    pathParts,
    schema: documentResponse.schema,
    components: documentResponse.components,
  });

  if (!attributeSchema) {
    return null;
  }

  return (
    <>
      {/**
       * Overlay an empty div on top of the iframe while the popover is open so it can
       * intercept clicks. Without it, we wouldn't be able to close the popover by clicking outside,
       * because the click would be detected by the iframe window, not by the admin.
       **/}
      <Box
        position={'fixed'}
        top={iframeRect.top + 'px'}
        left={iframeRect.left + 'px'}
        width={iframeRect.width + 'px'}
        height={iframeRect.height + 'px'}
        zIndex={4}
      />
      <InputPopoverProvider>
        <Popover.Root open={true} onOpenChange={(open) => !open && setPopoverField(null)}>
          <Popover.Trigger>
            <Box
              position="fixed"
              width={popoverField.position.width + 'px'}
              height={popoverField.position.height + 'px'}
              top={0}
              left={0}
              transform={`translate(${iframeRect.left + popoverField.position.left}px, ${iframeRect.top + popoverField.position.top}px)`}
            />
          </Popover.Trigger>
          <Popover.Content sideOffset={4}>
            <Box padding={4} width="400px">
              {/* @ts-expect-error the "type" property clashes for some reason */}
              <InputRenderer
                document={documentResponse}
                attribute={attributeSchema}
                // TODO: retrieve the proper label from the layout
                label={popoverField.path}
                name={popoverField.path.replace('[', '.').replace(']', '')}
                type={attributeSchema.type}
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

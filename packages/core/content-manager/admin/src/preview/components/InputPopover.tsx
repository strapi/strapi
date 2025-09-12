import * as React from 'react';

import { createContext, useNotification } from '@strapi/admin/strapi-admin';
import { Box, Popover } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { type UseDocument } from '../../hooks/useDocument';
import { InputRenderer } from '../../pages/EditView/components/InputRenderer';
import { usePreviewContext } from '../pages/Preview';
import { INTERNAL_EVENTS, PREVIEW_ERROR_MESSAGES } from '../utils/constants';
import {
  parseFieldMetaData,
  getAttributeSchemaFromPath,
  PreviewFieldError,
} from '../utils/fieldUtils';

/* -------------------------------------------------------------------------------------------------
 * Context utils
 * -----------------------------------------------------------------------------------------------*/

/**
 * No need for actual data in the context. It's just to let children check if they're rendered
 * inside of a preview InputPopover without relying on prop drilling.
 */
interface InputPopoverContextValue {}

const [InputPopoverProvider, useInputPopoverContext] =
  createContext<InputPopoverContextValue>('InputPopover');

function useHasInputPopoverParent() {
  const context = useInputPopoverContext('useHasInputPopoverParent', () => true, false);

  // useContext will return undefined if the called is not wrapped in the provider
  return context !== undefined;
}

/* -------------------------------------------------------------------------------------------------
 * InputPopover
 * -----------------------------------------------------------------------------------------------*/

const InputPopover = ({ documentResponse }: { documentResponse: ReturnType<UseDocument> }) => {
  const iframeRef = usePreviewContext('InputPopover', (state) => state.iframeRef);
  const popoverField = usePreviewContext('InputPopover', (state) => state.popoverField);
  const setPopoverField = usePreviewContext('InputPopover', (state) => state.setPopoverField);
  const document = usePreviewContext('InputPopover', (state) => state.document);
  const schema = usePreviewContext('InputPopover', (state) => state.schema);
  const components = usePreviewContext('InputPopover', (state) => state.components);

  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();

  React.useEffect(() => {
    /**
     * We receive window events sent from the user's preview via the injected script.
     * We listen to the ones here that target a specific field.
     */
    const handleMessage = (event: MessageEvent) => {
      // Only listen to events from the preview iframe
      if (iframeRef.current) {
        const previewOrigin = new URL(iframeRef.current?.src).origin;
        if (event.origin !== previewOrigin) {
          return;
        }
      }

      if (event.data?.type === INTERNAL_EVENTS.STRAPI_FIELD_FOCUS_INTENT) {
        const fieldMetaData = parseFieldMetaData(event.data.payload.path);

        if (!fieldMetaData) {
          const { type, message } = PREVIEW_ERROR_MESSAGES.INCOMPLETE_STRAPI_SOURCE;
          toggleNotification({ type, message: formatMessage(message) });
          return;
        }

        /**
         * Ignore (for now) content that comes from separate API requests than the one for the
         * current document. This doesn't do anything about fields that may come from relations to
         * the current document however.
         */
        if (fieldMetaData.documentId !== document.documentId) {
          const { type, message } = PREVIEW_ERROR_MESSAGES.DIFFERENT_DOCUMENT;
          toggleNotification({ type, message: formatMessage(message) });
          return;
        }

        try {
          const attribute = getAttributeSchemaFromPath({
            path: fieldMetaData.path,
            components,
            schema,
            document,
          });

          // We're able to handle the field, set it in context so the popover can pick it up
          setPopoverField({ ...fieldMetaData, position: event.data.payload.position, attribute });
        } catch (error) {
          if (error instanceof PreviewFieldError) {
            const { type, message } = PREVIEW_ERROR_MESSAGES[error.messageKey];
            toggleNotification({ type, message: formatMessage(message) });
          } else if (error instanceof Error) {
            toggleNotification({ type: 'danger', message: error.message });
          }
        }
      }

      if (event.data?.type === INTERNAL_EVENTS.STRAPI_FIELD_SINGLE_CLICK_HINT) {
        toggleNotification({
          type: 'info',
          message: formatMessage({
            id: 'content-manager.preview.info.single-click-hint',
            defaultMessage: 'Double click to edit',
          }),
        });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [components, document, iframeRef, schema, setPopoverField, toggleNotification, formatMessage]);
  if (!popoverField || !iframeRef.current) {
    return null;
  }

  const iframeRect = iframeRef.current.getBoundingClientRect();

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
        onClick={() => iframeRef.current?.focus()}
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
              {/* @ts-expect-error the types of `attribute` clash for some reason */}
              <InputRenderer
                document={documentResponse}
                attribute={popoverField.attribute}
                // TODO: retrieve the proper label from the layout
                label={popoverField.path}
                name={popoverField.path}
                type={popoverField.attribute.type}
                visible={true}
              />
            </Box>
          </Popover.Content>
        </Popover.Root>
      </InputPopoverProvider>
    </>
  );
};

export { InputPopover, useHasInputPopoverParent };

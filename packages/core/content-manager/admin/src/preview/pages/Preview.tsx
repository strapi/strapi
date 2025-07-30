import * as React from 'react';

import {
  Page,
  useQueryParams,
  useRBAC,
  createContext,
  Form as FormContext,
  Blocker,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Flex,
  FocusTrap,
  IconButton,
  Popover,
  Portal,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import { ArrowLineLeft } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation, useParams } from 'react-router-dom';
import { styled } from 'styled-components';

import { GetPreviewUrl } from '../../../../shared/contracts/preview';
import { COLLECTION_TYPES } from '../../constants/collections';
import { DocumentRBAC } from '../../features/DocumentRBAC';
import { type UseDocument, useDocument } from '../../hooks/useDocument';
import { type EditLayout, useDocumentLayout } from '../../hooks/useDocumentLayout';
import { FormLayout } from '../../pages/EditView/components/FormLayout';
import { InputRenderer } from '../../pages/EditView/components/InputRenderer';
import { handleInvisibleAttributes } from '../../pages/EditView/utils/data';
import { buildValidParams } from '../../utils/api';
import { createYupSchema } from '../../utils/validation';
import { PreviewHeader } from '../components/PreviewHeader';
import { useGetPreviewUrlQuery } from '../services/preview';

import type { UID } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * Constants
 * -----------------------------------------------------------------------------------------------*/

const DEVICES = [
  {
    name: 'desktop',
    label: {
      id: 'content-manager.preview.device.desktop',
      defaultMessage: 'Desktop',
    },
    width: '100%',
    height: '100%',
  },
  {
    name: 'mobile',
    label: {
      id: 'content-manager.preview.device.mobile',
      defaultMessage: 'Mobile',
    },
    width: '375px',
    height: '667px',
  },
];

/* -------------------------------------------------------------------------------------------------
 * PreviewProvider
 * -----------------------------------------------------------------------------------------------*/

interface PreviewContextValue {
  url: string;
  title: string;
  document: NonNullable<ReturnType<UseDocument>['document']>;
  meta: NonNullable<ReturnType<UseDocument>['meta']>;
  schema: NonNullable<ReturnType<UseDocument>['schema']>;
  layout: EditLayout;
  onPreview: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement>;
}

const [PreviewProvider, usePreviewContext] = createContext<PreviewContextValue>('PreviewPage');

/* -------------------------------------------------------------------------------------------------
 * Preview injected script
 * -----------------------------------------------------------------------------------------------*/

const previewScript = () => {
  const HIGHLIGHT_PADDING = 2;
  // Remove existing overlay if it exists
  const existingOverlay = document.getElementById('strapi-preview-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Clean up any existing observers
  if ((window as any).__strapiPreviewCleanup) {
    (window as any).__strapiPreviewCleanup();
  }

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'strapi-preview-overlay';
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
  `;

  // Add overlay to document body
  document.body.appendChild(overlay);

  const elements = document.querySelectorAll('[data-strapisrc]');
  const highlights: HTMLElement[] = [];
  const resizeObserver = new ResizeObserver(() => {
    updateAllHighlights();
  });

  const drawOverlay = (target: Element, highlight: HTMLElement) => {
    if (!highlight) return;

    const rect = target.getBoundingClientRect();
    highlight.style.width = `${rect.width + HIGHLIGHT_PADDING * 2}px`;
    highlight.style.height = `${rect.height + HIGHLIGHT_PADDING * 2}px`;
    highlight.style.transform = `translate(${rect.left - HIGHLIGHT_PADDING + window.scrollX}px, ${rect.top - HIGHLIGHT_PADDING + window.scrollY}px)`;
  };

  const updateAllHighlights = () => {
    highlights.forEach((highlight, index) => {
      const element = elements[index];
      if (element && highlight) {
        drawOverlay(element, highlight);
      }
    });
  };

  // Create highlights for each element
  elements.forEach((element) => {
    if (element instanceof HTMLElement) {
      // Create highlight div for this element
      const highlight = document.createElement('div');
      highlight.style.cssText = `
        position: absolute;
        outline: 2px solid transparent;
        pointer-events: auto;
        border-radius: 2px 0 2px 2px;
        background-color: transparent;
        transition: outline-color 0.15s ease-in-out;
      `;

      // Create edit button
      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.style.cssText = `
        position: absolute;
        top: 0px;
        right: -${HIGHLIGHT_PADDING}px;
        transform: translateY(-100%);
        font-size: 12px;
        padding: 4px 8px;
        background: #4945ff;
        color: white;
        border: none;
        border-radius: 4px 4px 0 0;
        cursor: pointer;
        pointer-events: auto;
        display: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 10000;
      `;

      // Add hover functionality to show/hide outline and edit button
      highlight.addEventListener('mouseenter', () => {
        highlight.style.outlineColor = '#4945ff';
        editButton.style.display = 'block';
      });

      highlight.addEventListener('mouseleave', () => {
        highlight.style.outlineColor = 'transparent';
        editButton.style.display = 'none';
      });

      // Add click handler for edit button
      editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const fieldPath = element.getAttribute('data-strapisrc');
        if (fieldPath && window.parent) {
          const rect = element.getBoundingClientRect();
          window.parent.postMessage(
            {
              type: 'willEditField',
              payload: {
                path: fieldPath,
                position: {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                },
              },
            },
            '*'
          );
        }
      });

      highlight.appendChild(editButton);
      highlights.push(highlight);
      overlay.appendChild(highlight);

      // Initial draw
      drawOverlay(element, highlight);

      // Observe this element for resize/position changes
      resizeObserver.observe(element);
    }
  });

  // Also observe document element for scroll changes
  resizeObserver.observe(document.documentElement);

  // Update highlights on scroll and resize
  const updateOnScroll = () => {
    updateAllHighlights();
  };

  window.addEventListener('scroll', updateOnScroll);
  window.addEventListener('resize', updateOnScroll);

  // Listen for strapiFieldTyping messages from parent window
  const handleFieldTyping = (event: MessageEvent) => {
    if (event.data?.type === 'strapiFieldTyping') {
      const { field, value } = event.data.payload;
      if (field) {
        const matchingElements = document.querySelectorAll(`[data-strapisrc="${field}"]`);
        matchingElements.forEach((element) => {
          if (element instanceof HTMLElement) {
            element.textContent = value || '';
          }
        });
      }
    }
  };

  window.addEventListener('message', handleFieldTyping);

  // Store cleanup function on window for potential cleanup
  (window as any).__strapiPreviewCleanup = () => {
    resizeObserver.disconnect();
    window.removeEventListener('scroll', updateOnScroll);
    window.removeEventListener('resize', updateOnScroll);
    window.removeEventListener('message', handleFieldTyping);
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };
};

/* -------------------------------------------------------------------------------------------------
 * VisualEditingPopover
 * -----------------------------------------------------------------------------------------------*/

const VisualEditingPopover = ({
  popoverField,
  setPopoverField,
  documentResponse,
}: {
  popoverField: any;
  setPopoverField: (value: string | null) => void;
  documentResponse: ReturnType<UseDocument>;
}) => {
  const iframeRef = usePreviewContext('VisualEditingPopover', (state) => state.iframeRef);

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
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PreviewPage
 * -----------------------------------------------------------------------------------------------*/

const AnimatedArrow = styled(ArrowLineLeft)<{ $isSideEditorOpen: boolean }>`
  will-change: transform;
  rotate: ${(props) => (props.$isSideEditorOpen ? '0deg' : '180deg')};
  transition: rotate 0.2s ease-in-out;
`;

const PreviewPage = () => {
  const location = useLocation();
  const { formatMessage } = useIntl();

  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [isSideEditorOpen, setIsSideEditorOpen] = React.useState(true);

  // Read all the necessary data from the URL to find the right preview URL
  const {
    slug: model,
    id: documentId,
    collectionType,
  } = useParams<{
    slug: UID.ContentType;
    id: string;
    collectionType: string;
  }>();
  const [{ query }] = useQueryParams<{
    plugins?: Record<string, unknown>;
    status?: string;
  }>();

  const params = React.useMemo(() => buildValidParams(query), [query]);

  const [deviceName, setDeviceName] = React.useState<(typeof DEVICES)[number]['name']>(
    DEVICES[0].name
  );
  const device = DEVICES.find((d) => d.name === deviceName) ?? DEVICES[0];

  const [popoverField, setPopoverField] = React.useState<string | null>(null);

  // Listen for ready message from iframe before injecting script
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'strapiReady') {
        const script = `(${previewScript.toString()})()`;
        iframeRef?.current?.contentWindow?.postMessage(
          { type: 'strapiScript', script },
          new URL(iframeRef.current.src).origin
        );
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Listen for willEditField message from iframe
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'willEditField') {
        setPopoverField(event.data.payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!collectionType) {
    throw new Error('Could not find collectionType in url params');
  }

  if (!model) {
    throw new Error('Could not find model in url params');
  }

  // Only collection types must have a documentId
  if (collectionType === COLLECTION_TYPES && !documentId) {
    throw new Error('Could not find documentId in url params');
  }

  const previewUrlResponse = useGetPreviewUrlQuery({
    params: {
      contentType: model,
    },
    query: {
      documentId,
      locale: params.locale,
      status: params.status as GetPreviewUrl.Request['query']['status'],
    },
  });
  const documentResponse = useDocument({
    model,
    collectionType,
    documentId,
    params,
  });
  const documentLayoutResponse = useDocumentLayout(model);

  const isLoading =
    previewUrlResponse.isLoading || documentLayoutResponse.isLoading || documentResponse.isLoading;
  if (isLoading && (!documentResponse.document?.documentId || previewUrlResponse.isLoading)) {
    return <Page.Loading />;
  }

  const initialValues = documentResponse.getInitialFormValues();

  if (
    previewUrlResponse.error ||
    documentLayoutResponse.error ||
    !documentResponse.document ||
    !documentResponse.meta ||
    !documentResponse.schema ||
    !initialValues
  ) {
    return <Page.Error />;
  }

  if (!previewUrlResponse.data?.data?.url) {
    return <Page.NoData />;
  }

  const documentTitle = documentResponse.getTitle(documentLayoutResponse.edit.settings.mainField);

  const validateSync = (values: Record<string, unknown>, options: Record<string, string>) => {
    const { data: cleanedValues, removedAttributes } = handleInvisibleAttributes(values, {
      schema: documentResponse.schema,
      initialValues,
      components: documentResponse.components,
    });

    const yupSchema = createYupSchema(
      documentResponse.schema?.attributes,
      documentResponse.components,
      {
        status: documentResponse.document?.status,
        removedAttributes,
        ...options,
      }
    );

    return yupSchema.validateSync(cleanedValues, { abortEarly: false });
  };

  const previewUrl = previewUrlResponse.data.data.url;

  const onPreview = () => {
    iframeRef?.current?.contentWindow?.postMessage(
      { type: 'strapiUpdate' },
      // The iframe origin is safe to use since it must be provided through the allowedOrigins config
      new URL(iframeRef.current.src).origin
    );
  };

  const hasAdvancedPreview = window.strapi.features.isEnabled('cms-advanced-preview');

  return (
    <>
      <Page.Title>
        {formatMessage(
          {
            id: 'content-manager.preview.page-title',
            defaultMessage: '{contentType} preview',
          },
          {
            contentType: documentTitle,
          }
        )}
      </Page.Title>
      <PreviewProvider
        url={previewUrl}
        document={documentResponse.document}
        title={documentTitle}
        meta={documentResponse.meta}
        schema={documentResponse.schema}
        layout={documentLayoutResponse.edit}
        onPreview={onPreview}
        iframeRef={iframeRef}
      >
        <FormContext
          method="PUT"
          disabled={
            query.status === 'published' &&
            documentResponse &&
            documentResponse.document.status !== 'draft'
          }
          initialValues={documentResponse.getInitialFormValues()}
          initialErrors={location?.state?.forceValidation ? validateSync(initialValues, {}) : {}}
          height="100%"
          validate={(values: Record<string, unknown>, options: Record<string, string>) => {
            const { data: cleanedValues, removedAttributes } = handleInvisibleAttributes(values, {
              schema: documentResponse.schema,
              initialValues,
              components: documentResponse.components,
            });

            const yupSchema = createYupSchema(
              documentResponse.schema?.attributes,
              documentResponse.components,
              {
                status: documentResponse.document?.status,
                removedAttributes,
                ...options,
              }
            );

            return yupSchema.validate(cleanedValues, { abortEarly: false });
          }}
        >
          {({ resetForm }) => (
            <Flex direction="column" height="100%" alignItems="stretch">
              <Blocker onProceed={resetForm} />
              <PreviewHeader />
              <Flex flex={1} overflow="auto" alignItems="stretch">
                {hasAdvancedPreview && (
                  <Box
                    overflow="auto"
                    width={isSideEditorOpen ? '50%' : 0}
                    borderWidth="0 1px 0 0"
                    borderColor="neutral150"
                    paddingTop={6}
                    paddingBottom={6}
                    // Remove horizontal padding when the editor is closed or it won't fully disappear
                    paddingLeft={isSideEditorOpen ? 6 : 0}
                    paddingRight={isSideEditorOpen ? 6 : 0}
                    transition="all 0.2s ease-in-out"
                  >
                    <FormLayout
                      layout={documentLayoutResponse.edit.layout}
                      document={documentResponse}
                      hasBackground={false}
                    />
                  </Box>
                )}
                <Flex
                  direction="column"
                  alignItems="stretch"
                  flex={1}
                  height="100%"
                  overflow="hidden"
                >
                  <Flex
                    direction="row"
                    background="neutral0"
                    padding={2}
                    borderWidth="0 0 1px 0"
                    borderColor="neutral150"
                  >
                    {hasAdvancedPreview && (
                      <IconButton
                        variant="ghost"
                        label={formatMessage(
                          isSideEditorOpen
                            ? {
                                id: 'content-manager.preview.content.close-editor',
                                defaultMessage: 'Close editor',
                              }
                            : {
                                id: 'content-manager.preview.content.open-editor',
                                defaultMessage: 'Open editor',
                              }
                        )}
                        onClick={() => setIsSideEditorOpen((prev) => !prev)}
                      >
                        <AnimatedArrow $isSideEditorOpen={isSideEditorOpen} />
                      </IconButton>
                    )}
                    <Flex justifyContent="center" flex={1}>
                      <SingleSelect
                        value={deviceName}
                        onChange={(name) => setDeviceName(name.toString())}
                        aria-label={formatMessage({
                          id: 'content-manager.preview.device.select',
                          defaultMessage: 'Select device type',
                        })}
                      >
                        {DEVICES.map((deviceOption) => (
                          <SingleSelectOption key={deviceOption.name} value={deviceOption.name}>
                            {formatMessage(deviceOption.label)}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                    </Flex>
                  </Flex>
                  <Flex direction="column" justifyContent="center" background="neutral0" flex={1}>
                    <Box
                      data-testid="preview-iframe"
                      ref={iframeRef}
                      src={previewUrl}
                      /**
                       * For some reason, changing an iframe's src tag causes the browser to add a new item in the
                       * history stack. This is an issue for us as it means clicking the back button will not let us
                       * go back to the edit view. To fix it, we need to trick the browser into thinking this is a
                       * different iframe when the preview URL changes. So we set a key prop to force React
                       * to mount a different node when the src changes.
                       */
                      key={previewUrl}
                      title={formatMessage({
                        id: 'content-manager.preview.panel.title',
                        defaultMessage: 'Preview',
                      })}
                      width={device.width}
                      height={device.height}
                      borderWidth={0}
                      tag="iframe"
                    />
                  </Flex>
                </Flex>
              </Flex>
              <VisualEditingPopover
                popoverField={popoverField}
                setPopoverField={setPopoverField}
                documentResponse={documentResponse}
              />
            </Flex>
          )}
        </FormContext>
      </PreviewProvider>
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ProtectedPreviewPage
 * -----------------------------------------------------------------------------------------------*/

const ProtectedPreviewPageImpl = () => {
  const { slug: model } = useParams<{
    slug: string;
  }>();
  const {
    permissions = [],
    isLoading,
    error,
  } = useRBAC([
    { action: 'plugin::content-manager.explorer.read', subject: model },
    { action: 'plugin::content-manager.explorer.update', subject: model },
    { action: 'plugin::content-manager.explorer.publish', subject: model },
  ]);

  if (isLoading) {
    return <Page.Loading />;
  }

  if (error || !model) {
    return (
      <Box
        height="100vh"
        width="100vw"
        position="fixed"
        top={0}
        left={0}
        zIndex={2}
        background="neutral0"
      >
        <Page.Error />
      </Box>
    );
  }

  return (
    <Box
      height="100vh"
      width="100vw"
      position="fixed"
      top={0}
      left={0}
      zIndex={2}
      background="neutral0"
    >
      <Page.Protect
        permissions={permissions.filter((permission) =>
          permission.action.includes('explorer.read')
        )}
      >
        <DocumentRBAC permissions={permissions}>
          <PreviewPage />
        </DocumentRBAC>
      </Page.Protect>
    </Box>
  );
};

const ProtectedPreviewPage = () => {
  return (
    <Portal>
      <FocusTrap>
        <ProtectedPreviewPageImpl />
      </FocusTrap>
    </Portal>
  );
};

export { ProtectedPreviewPage, usePreviewContext };

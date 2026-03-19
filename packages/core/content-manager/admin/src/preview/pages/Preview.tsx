import * as React from 'react';

import {
  Page,
  useQueryParams,
  useRBAC,
  createContext,
  Form as FormContext,
  type FieldContentSourceMap,
  useNotification,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Flex,
  FocusTrap,
  IconButton,
  Portal,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import { ArrowLineLeft } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation, useParams } from 'react-router-dom';
import { styled, useTheme } from 'styled-components';

import { GetPreviewUrl } from '../../../../shared/contracts/preview';
import { COLLECTION_TYPES } from '../../constants/collections';
import { DocumentRBAC } from '../../features/DocumentRBAC';
import { type UseDocument, useDocument } from '../../hooks/useDocument';
import { type EditLayout, useDocumentLayout } from '../../hooks/useDocumentLayout';
import { Blocker } from '../../pages/EditView/components/Blocker';
import { FormLayout } from '../../pages/EditView/components/FormLayout';
import { handleInvisibleAttributes } from '../../pages/EditView/utils/data';
import { buildValidParams } from '../../utils/api';
import { createYupSchema } from '../../utils/validation';
import { InputPopover } from '../components/InputPopover';
import { PreviewHeader } from '../components/PreviewHeader';
import { useGetPreviewUrlQuery } from '../services/preview';
import { PUBLIC_EVENTS } from '../utils/constants';
import { getSendMessage } from '../utils/getSendMessage';
import { previewScript } from '../utils/previewScript';

import type { Schema, UID } from '@strapi/types';

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

interface PopoverField extends FieldContentSourceMap {
  position: DOMRect;
  attribute: Schema.Attribute.AnyAttribute;
}

interface PreviewContextValue {
  url: string;
  title: string;
  document: NonNullable<ReturnType<UseDocument>['document']>;
  meta: NonNullable<ReturnType<UseDocument>['meta']>;
  schema: NonNullable<ReturnType<UseDocument>['schema']>;
  components: NonNullable<ReturnType<UseDocument>['components']>;
  layout: EditLayout;
  onPreview: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  popoverField: PopoverField | null;
  setPopoverField: (value: PopoverField | null) => void;
}

const [PreviewProvider, usePreviewContext] = createContext<PreviewContextValue>('PreviewPage');

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
  const theme = useTheme();

  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [isSideEditorOpen, setIsSideEditorOpen] = React.useState(true);
  const [popoverField, setPopoverField] = React.useState<PopoverField | null>(null);
  const { toggleNotification } = useNotification();

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

  const previewHighlightColors = {
    highlightHoverColor: theme.colors.primary500,
    highlightActiveColor: theme.colors.primary600,
  };

  // Listen for ready message from iframe before injecting script
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only listen to events from the preview iframe
      if (iframeRef.current) {
        const previewOrigin = new URL(iframeRef.current?.src).origin;
        if (event.origin !== previewOrigin) {
          return;
        }
      }

      if (event.data?.type === PUBLIC_EVENTS.PREVIEW_READY) {
        const script = `(${previewScript.toString()})(${JSON.stringify({
          shouldRun: true,
          colors: previewHighlightColors,
        })})`;
        const sendMessage = getSendMessage(iframeRef);
        sendMessage(PUBLIC_EVENTS.STRAPI_SCRIPT, { script });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [documentId, toggleNotification, theme]);

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
        components={documentResponse.components}
        layout={documentLayoutResponse.edit}
        onPreview={onPreview}
        iframeRef={iframeRef}
        popoverField={popoverField}
        setPopoverField={setPopoverField}
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
          <Flex direction="column" height="100%" alignItems="stretch">
            <Blocker />
            <PreviewHeader />
            <InputPopover documentResponse={documentResponse} />
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
          </Flex>
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
        height="100dvh"
        width="100dvw"
        position="fixed"
        top={0}
        left={0}
        zIndex={5}
        background="neutral0"
      >
        <Page.Error />
      </Box>
    );
  }

  return (
    <Box
      height="100dvh"
      width="100dvw"
      position="fixed"
      top={0}
      left={0}
      zIndex={5}
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
export type { PreviewContextValue };

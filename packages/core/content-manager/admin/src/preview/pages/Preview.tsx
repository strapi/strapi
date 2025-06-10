import * as React from 'react';

import {
  Page,
  useQueryParams,
  useRBAC,
  createContext,
  Form as FormContext,
  Blocker,
} from '@strapi/admin/strapi-admin';
import { Box, Flex, FocusTrap, IconButton, Portal } from '@strapi/design-system';
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
import { buildValidParams } from '../../utils/api';
import { createYupSchema } from '../../utils/validation';
import { PreviewHeader } from '../components/PreviewHeader';
import { useGetPreviewUrlQuery } from '../services/preview';

import type { UID } from '@strapi/types';

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
}

const [PreviewProvider, usePreviewContext] = createContext<PreviewContextValue>('PreviewPage');

/* -------------------------------------------------------------------------------------------------
 * PreviewPage
 * -----------------------------------------------------------------------------------------------*/

const AnimatedArrow = styled(ArrowLineLeft)<{ isSideEditorOpen: boolean }>`
  will-change: transform;
  rotate: ${(props) => (props.isSideEditorOpen ? '0deg' : '180deg')};
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
  if (isLoading && !documentResponse.document?.documentId) {
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
    const yupSchema = createYupSchema(
      documentResponse.schema?.attributes,
      documentResponse.components,
      {
        status: documentResponse.document?.status,
        ...options,
      }
    );

    return yupSchema.validateSync(values, { abortEarly: false });
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
            const yupSchema = createYupSchema(
              documentResponse.schema?.attributes,
              documentResponse.components,
              {
                status: documentResponse.document?.status,
                ...options,
              }
            );

            return yupSchema.validate(values, { abortEarly: false });
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

                <Box position="relative" flex={1} height="100%" overflow="hidden">
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
                    width="100%"
                    height="100%"
                    borderWidth={0}
                    tag="iframe"
                  />
                  {hasAdvancedPreview && (
                    <IconButton
                      variant="tertiary"
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
                      position="absolute"
                      top={2}
                      left={2}
                    >
                      <AnimatedArrow isSideEditorOpen={isSideEditorOpen} />
                    </IconButton>
                  )}
                </Box>
              </Flex>
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

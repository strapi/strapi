import * as React from 'react';

import {
  Page,
  useQueryParams,
  useRBAC,
  createContext,
  Form as FormContext,
} from '@strapi/admin/strapi-admin';
import { Box, Flex, FocusTrap, Portal } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useLocation, useParams } from 'react-router-dom';

import { GetPreviewUrl } from '../../../../shared/contracts/preview';
import { COLLECTION_TYPES } from '../../constants/collections';
import { DocumentRBAC } from '../../features/DocumentRBAC';
import { type UseDocument, useDocument } from '../../hooks/useDocument';
import { type EditLayout, useDocumentLayout } from '../../hooks/useDocumentLayout';
import { buildValidParams } from '../../utils/api';
import { createYupSchema } from '../../utils/validation';
import { PreviewContent, UnstablePreviewContent } from '../components/PreviewContent';
import { PreviewHeader, UnstablePreviewHeader } from '../components/PreviewHeader';
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
}

const [PreviewProvider, usePreviewContext] = createContext<PreviewContextValue>('PreviewPage');

/* -------------------------------------------------------------------------------------------------
 * PreviewPage
 * -----------------------------------------------------------------------------------------------*/

const PreviewPage = () => {
  const location = useLocation();
  const { formatMessage } = useIntl();

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

  if (
    documentResponse.isLoading ||
    previewUrlResponse.isLoading ||
    documentLayoutResponse.isLoading
  ) {
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
        url={previewUrlResponse.data.data.url}
        document={documentResponse.document}
        title={documentTitle}
        meta={documentResponse.meta}
        schema={documentResponse.schema}
        layout={documentLayoutResponse.edit}
      >
        <FormContext
          method="PUT"
          disabled={
            query.status === 'published' &&
            documentResponse &&
            documentResponse.document.status === 'published'
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
          <Flex direction="column" height="100%" alignItems="stretch">
            {window.strapi.future.isEnabled('unstablePreviewSideEditor') ? (
              <>
                <UnstablePreviewHeader />
                <UnstablePreviewContent />
              </>
            ) : (
              <>
                <PreviewHeader />
                <PreviewContent />
              </>
            )}
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

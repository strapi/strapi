import * as React from 'react';

import {
  Flex,
  Grid,
  GridItem,
  Main,
  SetSelectedTabIndexHandler,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Tabs,
} from '@strapi/design-system';
import {
  LoadingIndicatorPage,
  useNotification,
  AnErrorOccurred,
  CheckPagePermissions,
  useQueryParams,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { useOnce } from '../../../hooks/useOnce';
import { Form } from '../../components/Form';
import { DocumentRBAC, useDocumentRBAC } from '../../features/DocumentRBAC';
import { type UseDocument, useDoc } from '../../hooks/useDocument';
import { useDocumentLayout } from '../../hooks/useDocumentLayout';
import { useLazyComponents } from '../../hooks/useLazyComponents';
import { useSyncRbac } from '../../hooks/useSyncRbac';
import { getTranslation } from '../../utils/translations';

import { FormLayout } from './components/FormLayout';
import { Header } from './components/Header';
import { Panels } from './components/Panels';
import { transformDocument } from './utils/data';
import { createDefaultForm } from './utils/forms';

// TODO: this seems suspicious
// const CTB_PERMISSIONS = [{ action: 'plugin::content-type-builder.read', subject: null }];

/* -------------------------------------------------------------------------------------------------
 * EditViewPage
 * -----------------------------------------------------------------------------------------------*/

const EditViewPage = () => {
  const location = useLocation();
  const [
    {
      query: { status },
    },
    setQuery,
  ] = useQueryParams<{ status: 'draft' | 'published' }>();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const tabApi = React.useRef<{
    _handlers: {
      setSelectedTabIndex: SetSelectedTabIndexHandler;
    };
  }>(null);

  React.useEffect(() => {
    if (tabApi.current) {
      tabApi.current._handlers.setSelectedTabIndex(!status || status === 'draft' ? 0 : 1);
    }
  }, [status]);

  useOnce(() => {
    /**
     * We only ever want to fire the notification once otherwise
     * whenever the app re-renders it'll pop up regardless of
     * what we do because the state comes from react-router-dom
     */
    if (location?.state && 'error' in location.state) {
      toggleNotification({
        type: 'warning',
        message: location.state.error,
        timeout: 5000,
      });
    }
  });

  const isLoadingActionsRBAC = useDocumentRBAC('EditViewPage', (state) => state.isLoading);
  const {
    document,
    meta,
    isLoading: isLoadingDocument,
    schema,
    components,
    collectionType,
    id,
    model,
  } = useDoc();

  const isSingleType = collectionType === 'single-types';

  /**
   * single-types don't current have an id, but because they're a singleton
   * we can simply use the update operation to continuously update the same
   * document with varying params.
   */
  const isCreatingDocument = !id && !isSingleType;

  const {
    isLoading: isLoadingLayout,
    edit: {
      layout,
      settings: { mainField },
    },
  } = useDocumentLayout(model);

  const { isLazyLoading } = useLazyComponents([]);

  const isLoading = isLoadingActionsRBAC || isLoadingDocument || isLoadingLayout || isLazyLoading;

  /**
   * Here we prepare the form for editing, we need to:
   * - remove prohibited fields from the document (passwords | ADD YOURS WHEN THERES A NEW ONE)
   * - swap out count objects on relations for empty arrays
   * - set __temp_key__ on array objects for drag & drop
   *
   * We also prepare the form for new documents, so we need to:
   * - set default values on fields
   */
  const initialValues = React.useMemo(() => {
    if ((!document && !isCreatingDocument) || !schema) {
      return undefined;
    }

    const form = document ?? createDefaultForm(schema, components);

    return transformDocument(schema, components)(form);
  }, [document, isCreatingDocument, schema, components]);

  if (isLoading) {
    return (
      <Main aria-busy={true}>
        <LoadingIndicatorPage />
      </Main>
    );
  }

  if (!initialValues) {
    return (
      <Main height="100%">
        <Flex alignItems="center" height="100%" justifyContent="center">
          <AnErrorOccurred />
        </Flex>
      </Main>
    );
  }

  const handleTabChange = (index: number) => {
    if (index === 0) {
      setQuery({ status: 'draft' });
    } else {
      setQuery({ status: 'published' });
    }
  };

  const documentTitle =
    mainField !== 'id' && document?.[mainField] ? document[mainField] : 'Untitled';

  return (
    <Main paddingLeft={10} paddingRight={10}>
      <Header
        isCreating={isCreatingDocument}
        status={getDocumentStatus(document, meta)}
        title={documentTitle}
      />
      <TabGroup
        ref={tabApi}
        variant="simple"
        label={formatMessage({
          id: getTranslation('containers.edit.tabs.label'),
          defaultMessage: 'Document status',
        })}
        initialSelectedTabIndex={status === 'published' ? 1 : 0}
        onTabChange={handleTabChange}
      >
        <Tabs>
          <StatusTab>
            {formatMessage({
              id: getTranslation('containers.edit.tabs.draft'),
              defaultMessage: 'draft',
            })}
          </StatusTab>
          <StatusTab disabled={meta?.availableStatus.length === 0}>
            {formatMessage({
              id: getTranslation('containers.edit.tabs.published'),
              defaultMessage: 'published',
            })}
          </StatusTab>
        </Tabs>
        <Form
          disabled={status === 'published'}
          initialValues={initialValues}
          method={isCreatingDocument ? 'POST' : 'PUT'}
        >
          <Grid paddingTop={8} gap={4}>
            <GridItem col={9} s={12}>
              <TabPanels>
                <TabPanel>
                  <FormLayout layout={layout} />
                </TabPanel>
                <TabPanel>
                  <FormLayout layout={layout} />
                </TabPanel>
              </TabPanels>
            </GridItem>
            <GridItem col={3} s={12}>
              <Panels />
            </GridItem>
          </Grid>
        </Form>
      </TabGroup>
    </Main>
  );
};

const StatusTab = styled(Tab)`
  text-transform: uppercase;
`;

/**
 * @internal
 * @description Returns the status of the document where it's latest state takes priority,
 * this typically will be "published" unless a user has edited their draft in which we should
 * display "modified".
 */
const getDocumentStatus = (
  document: ReturnType<UseDocument>['document'],
  meta: ReturnType<UseDocument>['meta']
): 'draft' | 'published' => {
  const docStatus = document?.status;
  const statuses = meta?.availableStatus ?? [];

  /**
   * Creating an entry
   */
  if (!docStatus) {
    return 'draft';
  }

  /**
   * We're viewing a draft, but the document could have a published version
   */
  if (docStatus === 'draft' && statuses.find((doc) => doc.publishedAt !== null)) {
    return 'published';
  }

  return docStatus;
};

/* -------------------------------------------------------------------------------------------------
 * ProtectedEditViewPage
 * -----------------------------------------------------------------------------------------------*/

const ProtectedEditViewPage = () => {
  const { model } = useDoc();
  const [{ query }] = useQueryParams();
  const { permissions = [], isLoading, isError } = useSyncRbac(model, query, 'editView');

  if (isLoading) {
    return (
      <Main aria-busy={true}>
        <LoadingIndicatorPage />
      </Main>
    );
  }

  if (!isLoading && isError) {
    return (
      <Main height="100%">
        <Flex alignItems="center" height="100%" justifyContent="center">
          <AnErrorOccurred />
        </Flex>
      </Main>
    );
  }

  return (
    <CheckPagePermissions permissions={permissions}>
      <DocumentRBAC permissions={permissions}>
        <EditViewPage />
      </DocumentRBAC>
    </CheckPagePermissions>
  );
};

export { EditViewPage, ProtectedEditViewPage };

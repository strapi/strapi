import * as React from 'react';

import {
  Box,
  Flex,
  Grid,
  GridItem,
  Main,
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
import { useLocation, useParams } from 'react-router-dom';
import styled from 'styled-components';

import { useOnce } from '../../../hooks/useOnce';
import { Form } from '../../components/Form';
import { DocumentRBAC, useDocumentRBAC } from '../../features/DocumentRBAC';
import { useDoc } from '../../hooks/useDocument';
import { useDocumentLayout } from '../../hooks/useDocumentLayout';
import { useLazyComponents } from '../../hooks/useLazyComponents';
import { useSyncRbac } from '../../hooks/useSyncRbac';
import { getTranslation } from '../../utils/translations';

import { Header } from './components/Header';
import { InputRenderer } from './components/InputRenderer';
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
  const { state = 'draft' } = useParams<{ state: 'draft' | 'published' }>();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();

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
    edit: { layout },
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

  const handleSubmit = async () => {};

  const status = document?.status ?? 'draft';

  return (
    <Main paddingLeft={10} paddingRight={10}>
      <Header isCreating={isCreatingDocument} status={status} />
      <TabGroup variant="simple" label="Document version">
        <Tabs>
          <StatusTab>
            {formatMessage({
              id: getTranslation('containers.edit.tabs.draft'),
              defaultMessage: 'draft',
            })}
          </StatusTab>
          <StatusTab>
            {formatMessage({
              id: getTranslation('containers.edit.tabs.published'),
              defaultMessage: 'published',
            })}
          </StatusTab>
        </Tabs>
        <TabPanels>
          <TabPanel>
            <Form
              initialValues={initialValues}
              onSubmit={handleSubmit}
              method={isCreatingDocument ? 'POST' : 'PUT'}
              // validate={validate}
            >
              <Grid paddingTop={8} gap={4}>
                <GridItem col={9} s={12}>
                  <Flex direction="column" alignItems="stretch" gap={6}>
                    {layout.map((panel, index) => {
                      if (panel.some((row) => row.some((field) => field.type === 'dynamiczone'))) {
                        const [row] = panel;
                        const [field] = row;
                        return (
                          <Grid key={field.name} gap={4}>
                            <GridItem col={12} s={12} xs={12}>
                              <InputRenderer {...field} />
                            </GridItem>
                          </Grid>
                        );
                      }

                      return (
                        <Box
                          key={index}
                          hasRadius
                          background="neutral0"
                          shadow="tableShadow"
                          paddingLeft={6}
                          paddingRight={6}
                          paddingTop={6}
                          paddingBottom={6}
                          borderColor="neutral150"
                        >
                          <Flex direction="column" alignItems="stretch" gap={6}>
                            {panel.map((row, gridRowIndex) => (
                              <Grid key={gridRowIndex} gap={4}>
                                {row.map(({ size, ...field }) => {
                                  return (
                                    <GridItem col={size} key={field.name} s={12} xs={12}>
                                      <InputRenderer {...field} />
                                    </GridItem>
                                  );
                                })}
                              </Grid>
                            ))}
                          </Flex>
                        </Box>
                      );
                    })}
                  </Flex>
                </GridItem>
                <GridItem col={3} s={12}>
                  <Panels activeTab={state} />
                </GridItem>
              </Grid>
            </Form>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </Main>
  );
};

const StatusTab = styled(Tab)`
  text-transform: uppercase;
`;

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

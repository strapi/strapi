/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  CheckPermissions,
  ConfirmDialog,
  LoadingIndicatorPage,
  stopPropagation,
  EmptyStateLayout,
  useFocusWhenNavigate,
  AnErrorOccurred,
} from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import {
  Button,
  Layout,
  HeaderLayout,
  ContentLayout,
  Main,
  IconButton,
  Typography,
  Flex,
  Table,
  Tr,
  Thead,
  Th,
  Tbody,
  Td,
  Box,
} from '@strapi/design-system';

import { Trash, Eye as Show, Refresh as Reload } from '@strapi/icons';

import permissions from '../../permissions';
import { getTrad } from '../../utils';
import openWithNewTab from '../../utils/openWithNewTab';
import useReactQuery from '../utils/useReactQuery';

const PluginPage = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const { data, isLoading, isError, deleteMutation, regenerateDocMutation } = useReactQuery();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isConfirmButtonLoading, setIsConfirmButtonLoading] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState();

  const colCount = 4;
  const rowCount = (data?.docVersions?.length || 0) + 1;

  const openDocVersion = (version) => {
    const slash = data?.prefix.startsWith('/') ? '' : '/';
    openWithNewTab(`${slash}${data?.prefix}/v${version}`);
  };

  const handleRegenerateDoc = (version) => {
    regenerateDocMutation.mutate({ version, prefix: data?.prefix });
  };

  const handleShowConfirmDelete = () => {
    setShowConfirmDelete(!showConfirmDelete);
  };

  const handleConfirmDelete = async () => {
    setIsConfirmButtonLoading(true);
    await deleteMutation.mutateAsync({ prefix: data?.prefix, version: versionToDelete });
    setShowConfirmDelete(!showConfirmDelete);
    setIsConfirmButtonLoading(false);
  };

  const handleClickDelete = (version) => {
    setVersionToDelete(version);
    setShowConfirmDelete(!showConfirmDelete);
  };

  const title = formatMessage({
    id: getTrad('plugin.name'),
    defaultMessage: 'Documentation',
  });

  if (isError) {
    return (
      <Layout>
        <ContentLayout>
          <Box paddingTop={8}>
            <AnErrorOccurred />
          </Box>
        </ContentLayout>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet title={title} />
      <Main aria-busy={isLoading}>
        <HeaderLayout
          title={title}
          subtitle={formatMessage({
            id: getTrad('pages.PluginPage.header.description'),
            defaultMessage: 'Configure the documentation plugin',
          })}
          primaryAction={
            //  eslint-disable-next-line
            <CheckPermissions permissions={permissions.open}>
              <Button onClick={() => openDocVersion(data?.currentVersion)} startIcon={<Show />}>
                {formatMessage({
                  id: getTrad('pages.PluginPage.Button.open'),
                  defaultMessage: 'Open Documentation',
                })}
              </Button>
            </CheckPermissions>
          }
        />
        <ContentLayout>
          {isLoading && <LoadingIndicatorPage>Plugin is loading</LoadingIndicatorPage>}
          {data?.docVersions.length ? (
            <Table colCount={colCount} rowCount={rowCount}>
              <Thead>
                <Tr>
                  <Th>
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage({
                        id: getTrad('pages.PluginPage.table.version'),
                        defaultMessage: 'Version',
                      })}
                    </Typography>
                  </Th>
                  <Th>
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage({
                        id: getTrad('pages.PluginPage.table.generated'),
                        defaultMessage: 'Last Generated',
                      })}
                    </Typography>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.docVersions
                  .sort((a, b) => (a.generatedDate < b.generatedDate ? 1 : -1))
                  .map((doc) => (
                    <Tr key={doc.version}>
                      <Td width="50%">
                        <Typography>{doc.version}</Typography>
                      </Td>
                      <Td width="50%">
                        <Typography>{doc.generatedDate}</Typography>
                      </Td>
                      <Td>
                        <Flex justifyContent="end" {...stopPropagation}>
                          <IconButton
                            onClick={() => openDocVersion(doc.version)}
                            noBorder
                            icon={<Show />}
                            label={formatMessage(
                              {
                                id: getTrad('pages.PluginPage.table.icon.show'),
                                defaultMessage: 'Open {target}',
                              },
                              { target: `${doc.version}` }
                            )}
                          />
                          <CheckPermissions permissions={permissions.regenerate}>
                            <IconButton
                              onClick={() => handleRegenerateDoc(doc.version)}
                              noBorder
                              icon={<Reload />}
                              label={formatMessage(
                                {
                                  id: getTrad('pages.PluginPage.table.icon.regenerate'),
                                  defaultMessage: 'Regenerate {target}',
                                },
                                { target: `${doc.version}` }
                              )}
                            />
                          </CheckPermissions>
                          <CheckPermissions permissions={permissions.update}>
                            {doc.version !== data.currentVersion && (
                              <IconButton
                                onClick={() => handleClickDelete(doc.version)}
                                noBorder
                                icon={<Trash />}
                                label={formatMessage(
                                  {
                                    id: 'global.delete-target',
                                    defaultMessage: 'Delete {target}',
                                  },
                                  { target: `${doc.version}` }
                                )}
                              />
                            )}
                          </CheckPermissions>
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
              </Tbody>
            </Table>
          ) : (
            <EmptyStateLayout />
          )}
        </ContentLayout>
        <ConfirmDialog
          isConfirmButtonLoading={isConfirmButtonLoading}
          onConfirm={handleConfirmDelete}
          onToggleDialog={handleShowConfirmDelete}
          isOpen={showConfirmDelete}
        />
      </Main>
    </Layout>
  );
};

export default PluginPage;

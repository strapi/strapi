import React, { useState } from 'react';

import {
  LinkButton,
  ContentLayout,
  Flex,
  HeaderLayout,
  IconButton,
  Layout,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  EmptyStateLayout,
} from '@strapi/design-system';
import { Eye as Show, Refresh as Reload, Trash } from '@strapi/icons';
import { ConfirmDialog, useRBAC, Page } from '@strapi/strapi/admin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { PERMISSIONS } from '../../constants';
import { useDocumentation } from '../../hooks/useDocumentation';
import { getTrad } from '../../utils';

const PluginPage = () => {
  const { formatMessage } = useIntl();
  const { data, isLoading, isError, remove, regenerate } = useDocumentation();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState();
  const { allowedActions } = useRBAC(PERMISSIONS);

  const colCount = 4;
  const rowCount = (data?.docVersions?.length || 0) + 1;

  const handleRegenerateDoc = (version) => {
    regenerate.mutate({ version, prefix: data?.prefix });
  };

  const handleShowConfirmDelete = () => {
    setShowConfirmDelete(!showConfirmDelete);
  };

  const handleConfirmDelete = async () => {
    await remove.mutateAsync({ prefix: data?.prefix, version: versionToDelete });
    setShowConfirmDelete(!showConfirmDelete);
  };

  const handleClickDelete = (version) => {
    setVersionToDelete(version);
    setShowConfirmDelete(!showConfirmDelete);
  };

  const title = formatMessage({
    id: getTrad('plugin.name'),
    defaultMessage: 'Documentation',
  });

  if (isLoading) {
    return <Page.Loading />;
  }

  if (isError) {
    return <Page.Error />;
  }

  return (
    <Layout>
      <Helmet title={title} />
      <Page.Main>
        <HeaderLayout
          title={title}
          subtitle={formatMessage({
            id: getTrad('pages.PluginPage.header.description'),
            defaultMessage: 'Configure the documentation plugin',
          })}
          primaryAction={
            <OpenDocLink
              disabled={!allowedActions.canOpen || !data?.currentVersion || !data?.prefix}
              href={createDocumentationHref(`${data?.prefix}/v${data?.currentVersion}`)}
              startIcon={<Show />}
            >
              {formatMessage({
                id: getTrad('pages.PluginPage.Button.open'),
                defaultMessage: 'Open Documentation',
              })}
            </OpenDocLink>
          }
        />
        <ContentLayout>
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
                        <Flex justifyContent="end" onClick={(e) => e.stopPropagation()}>
                          <IconButton
                            forwardedAs="a"
                            disabled={!allowedActions.canOpen}
                            href={createDocumentationHref(`${data.prefix}/v${doc.version}`)}
                            noBorder
                            icon={<Show />}
                            target="_blank"
                            rel="noopener noreferrer"
                            label={formatMessage(
                              {
                                id: getTrad('pages.PluginPage.table.icon.show'),
                                defaultMessage: 'Open {target}',
                              },
                              { target: `${doc.version}` }
                            )}
                          />
                          {allowedActions.canRegenerate ? (
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
                          ) : null}
                          {allowedActions.canUpdate && doc.version !== data.currentVersion ? (
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
                          ) : null}
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
          onConfirm={handleConfirmDelete}
          onClose={handleShowConfirmDelete}
          isOpen={showConfirmDelete}
        />
      </Page.Main>
    </Layout>
  );
};

/**
 * TODO: should this be fixed in the DS?
 */
const OpenDocLink = styled(LinkButton)`
  text-decoration: none;
`;

const createDocumentationHref = (path) => {
  if (path.startsWith('http')) {
    return path;
  }

  if (path.startsWith('/')) {
    return `${window.strapi.backendURL}${path}`;
  }

  return `${window.strapi.backendURL}/${path}`;
};

export default PluginPage;

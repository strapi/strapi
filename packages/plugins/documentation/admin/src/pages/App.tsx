/* eslint-disable import/no-default-export */
import * as React from 'react';

import {
  LinkButton,
  Flex,
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  EmptyStateLayout,
  Dialog,
} from '@strapi/design-system';
import { Eye as Show, ArrowClockwise as Reload, Trash } from '@strapi/icons';
import {
  ConfirmDialog,
  useRBAC,
  Page,
  useAPIErrorHandler,
  useNotification,
  Layouts,
} from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { PERMISSIONS } from '../constants';
import {
  useGetInfoQuery,
  useRegenerateDocMutation,
  useDeleteVersionMutation,
} from '../services/api';
import { getTrad } from '../utils';

const App = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const { data, isLoading: isLoadingInfo, isError } = useGetInfoQuery();
  const [regenerate] = useRegenerateDocMutation();
  const [deleteVersion] = useDeleteVersionMutation();
  const [showConfirmDelete, setShowConfirmDelete] = React.useState<boolean>(false);
  const [versionToDelete, setVersionToDelete] = React.useState<string>();
  const { allowedActions, isLoading: isLoadingRBAC } = useRBAC(PERMISSIONS);

  const isLoading = isLoadingInfo || isLoadingRBAC;

  const colCount = 4;
  const rowCount = (data?.docVersions?.length || 0) + 1;

  const handleRegenerateDoc = (version: string) => {
    regenerate({ version })
      .unwrap()
      .then(() => {
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: getTrad('notification.generate.success'),
            defaultMessage: 'Successfully generated documentation',
          }),
        });
      })
      .catch((err) => {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });
      });
  };

  const handleShowConfirmDelete = () => {
    setShowConfirmDelete(!showConfirmDelete);
  };

  const handleConfirmDelete = async () => {
    if (!versionToDelete) {
      // nothing to delete
      return;
    }

    await deleteVersion({ version: versionToDelete })
      .unwrap()
      .then(() => {
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: getTrad('notification.delete.success'),
            defaultMessage: 'Successfully deleted documentation',
          }),
        });
      })
      .catch((err) => {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });
      });

    setShowConfirmDelete(!showConfirmDelete);
  };

  const handleClickDelete = (version: string) => {
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
    <Layouts.Root>
      <Page.Title>{title}</Page.Title>
      <Page.Main>
        <Layouts.Header
          title={title}
          subtitle={formatMessage({
            id: getTrad('pages.PluginPage.header.description'),
            defaultMessage: 'Configure the documentation plugin',
          })}
          primaryAction={
            <OpenDocLink
              disabled={!allowedActions.canRead || !data?.currentVersion || !data?.prefix}
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
        <Layouts.Content>
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
                  .slice(0)
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
                            tag="a"
                            disabled={!allowedActions.canRead}
                            href={createDocumentationHref(`${data.prefix}/v${doc.version}`)}
                            variant="ghost"
                            target="_blank"
                            rel="noopener noreferrer"
                            label={formatMessage(
                              {
                                id: getTrad('pages.PluginPage.table.icon.show'),
                                defaultMessage: 'Open {target}',
                              },
                              { target: `${doc.version}` }
                            )}
                          >
                            <Show />
                          </IconButton>
                          {allowedActions.canRegenerate ? (
                            <IconButton
                              onClick={() => handleRegenerateDoc(doc.version)}
                              variant="ghost"
                              label={formatMessage(
                                {
                                  id: getTrad('pages.PluginPage.table.icon.regenerate'),
                                  defaultMessage: 'Regenerate {target}',
                                },
                                { target: `${doc.version}` }
                              )}
                            >
                              <Reload />
                            </IconButton>
                          ) : null}
                          {allowedActions.canUpdate && doc.version !== data.currentVersion ? (
                            <IconButton
                              onClick={() => handleClickDelete(doc.version)}
                              variant="ghost"
                              label={formatMessage(
                                {
                                  id: 'global.delete-target',
                                  defaultMessage: 'Delete {target}',
                                },
                                { target: `${doc.version}` }
                              )}
                            >
                              <Trash />
                            </IconButton>
                          ) : null}
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
              </Tbody>
            </Table>
          ) : (
            <EmptyStateLayout content="" icon={null} />
          )}
        </Layouts.Content>
        <Dialog.Root open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
          <ConfirmDialog onConfirm={handleConfirmDelete} />
        </Dialog.Root>
      </Page.Main>
    </Layouts.Root>
  );
};

/**
 * TODO: should this be fixed in the DS?
 */
const OpenDocLink = styled(LinkButton)`
  text-decoration: none;
`;

const createDocumentationHref = (path: string) => {
  if (path.startsWith('http')) {
    return path;
  }

  if (path.startsWith('/')) {
    return `${window.strapi.backendURL}${path}`;
  }

  return `${window.strapi.backendURL}/${path}`;
};

export { App };

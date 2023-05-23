import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useHistory } from 'react-router-dom';
import {
  CheckPagePermissions,
  ConfirmDialog,
  Link,
  LinkButton,
  onRowClick,
  pxToRem,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import {
  Flex,
  IconButton,
  Loader,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Pencil, Plus, Trash } from '@strapi/icons';

import { useReviewWorkflows } from '../../hooks/useReviewWorkflows';
import adminPermissions from '../../../../../../../../admin/src/permissions';
import { useContentTypes } from '../../../../../../../../admin/src/hooks/useContentTypes';

import * as Layout from '../../components/Layout';

const ActionLink = styled(Link)`
  align-items: center;
  height: ${pxToRem(32)};
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => `${theme.spaces[2]}}`};
  width: ${pxToRem(32)};

  svg {
    height: ${pxToRem(12)};
    width: ${pxToRem(12)};

    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }

  &:hover,
  &:focus {
    svg {
      path {
        fill: ${({ theme }) => theme.colors.neutral800};
      }
    }
  }
`;

export function ReviewWorkflowsListView() {
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const { collectionTypes, singleTypes, isLoading: isLoadingModels } = useContentTypes();
  const { workflows: workflowsData, refetchWorkflow } = useReviewWorkflows();
  const [workflowToDelete, setWorkflowToDelete] = React.useState(null);
  const { del } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();

  const { mutateAsync, isLoading } = useMutation(
    async ({ workflowId, stages }) => {
      const {
        data: { data },
      } = await del(`/admin/review-workflows/workflows/${workflowId}`, {
        data: stages,
      });

      return data;
    },
    {
      onSuccess() {
        toggleNotification({
          type: 'success',
          message: { id: 'notification.success.deleted', defaultMessage: 'Deleted' },
        });
      },
    }
  );

  const getContentTypeDisplayName = (uid) => {
    const contentType = [...collectionTypes, ...singleTypes].find(
      (contentType) => contentType.uid === uid
    );

    return contentType.info.displayName;
  };

  const handleDeleteWorkflow = (workflowId) => {
    setWorkflowToDelete(workflowId);
  };

  const toggleConfirmDeleteDialog = () => {
    setWorkflowToDelete(null);
  };

  const handleConfirmDeleteDialog = async () => {
    try {
      const res = await mutateAsync({ workflowId: workflowToDelete });

      await refetchWorkflow();
      setWorkflowToDelete(null);

      return res;
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });

      return null;
    }
  };

  return (
    <CheckPagePermissions permissions={adminPermissions.settings['review-workflows'].main}>
      <Layout.Header
        primaryAction={
          <LinkButton startIcon={<Plus />} size="S" to="/settings/review-workflows/create">
            {formatMessage({
              id: 'Settings.review-workflows.list.page.create',
              defaultMessage: 'Create new workflow',
            })}
          </LinkButton>
        }
        subtitle={formatMessage({
          id: 'Settings.review-workflows.list.page.subtitle',
          defaultMessage:
            'Manage content review stages and collaborate during content creation from draft to publication',
        })}
        title={formatMessage({
          id: 'Settings.review-workflows.list.page.title',
          defaultMessage: 'Review Workflows',
        })}
      />

      <Layout.Root>
        {workflowsData.status === 'loading' || isLoadingModels ? (
          <Loader>
            {formatMessage({
              id: 'Settings.review-workflows.page.list.isLoading',
              defaultMessage: 'Workflows are loading',
            })}
          </Loader>
        ) : (
          <Table colCount={3} rowCount={1}>
            <Thead>
              <Tr>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: 'Settings.review-workflows.list.page.list.column.name.title',
                      defaultMessage: 'Name',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: 'Settings.review-workflows.list.page.list.column.stages.title',
                      defaultMessage: 'Stages',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <Typography variant="sigma">
                    {formatMessage({
                      id: 'Settings.review-workflows.list.page.list.column.contentTypes.title',
                      defaultMessage: 'Content Types',
                    })}
                  </Typography>
                </Th>
                <Th>
                  <VisuallyHidden>
                    {formatMessage({
                      id: 'Settings.review-workflows.list.page.list.column.actions.title',
                      defaultMessage: 'Actions',
                    })}
                  </VisuallyHidden>
                </Th>
              </Tr>
            </Thead>

            <Tbody>
              {workflowsData.data.map((workflow) => (
                <Tr
                  {...onRowClick({
                    fn(event) {
                      // Abort row onClick event when the user click on the delete button
                      if (event.target.nodeName === 'BUTTON') {
                        return;
                      }

                      push(`/settings/review-workflows/${workflow.id}`);
                    },
                  })}
                  key={`workflow-${workflow.id}`}
                >
                  <Td width={pxToRem(250)}>
                    <Typography textColor="neutral800" fontWeight="bold" ellipsis>
                      {workflow.name}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{workflow.stages.length}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">
                      {(workflow?.contentTypes ?? []).map(getContentTypeDisplayName).join(', ')}
                    </Typography>
                  </Td>
                  <Td>
                    <Flex alignItems="center" justifyContent="end">
                      <ActionLink
                        to={`/settings/review-workflows/${workflow.id}`}
                        aria-label={formatMessage(
                          {
                            id: 'Settings.review-workflows.list.page.list.column.actions.edit.label',
                            defaultMessage: 'Edit {name}',
                          },
                          { name: workflow.name }
                        )}
                      >
                        <Pencil />
                      </ActionLink>

                      <IconButton
                        aria-label={formatMessage(
                          {
                            id: 'Settings.review-workflows.list.page.list.column.actions.delete.label',
                            defaultMessage: 'Delete {name}',
                          },
                          { name: 'Default workflow' }
                        )}
                        disabled={workflowsData.data.length === 1}
                        icon={<Trash />}
                        noBorder
                        onClick={() => {
                          handleDeleteWorkflow(workflow.id);
                        }}
                      />
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        <ConfirmDialog
          bodyText={{
            id: 'Settings.review-workflows.list.page.delete.confirm.body',
            defaultMessage:
              'If you remove this worfklow, all stage-related information will be removed for this content-type. Are you sure you want to remove it?',
          }}
          isConfirmButtonLoading={isLoading}
          isOpen={!!workflowToDelete}
          onToggleDialog={toggleConfirmDeleteDialog}
          onConfirm={handleConfirmDeleteDialog}
        />
      </Layout.Root>
    </CheckPagePermissions>
  );
}

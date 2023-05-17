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

import * as Layout from '../../components/Layout';

const ActionLink = styled(Link)`
  svg {
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
  const { workflows: workflowsData } = useReviewWorkflows();
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

  const handleDeleteWorkflow = (workflowId) => {
    setWorkflowToDelete(workflowId);
  };

  const toggleConfirmDeleteDialog = () => {
    setWorkflowToDelete(null);
  };

  const handleConfirmDeleteDialog = async () => {
    try {
      const res = await mutateAsync({ workflowId: workflowToDelete });

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
        {workflowsData.status === 'loading' ? (
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
              {workflowsData?.data?.map((workflow) => (
                <Tr
                  onRowClick={() => push(`/settings/review-workflows/${workflow.id}`)}
                  key={`workflow-${workflow.id}`}
                >
                  <Td width={pxToRem(250)}>
                    <Typography textColor="neutral800" fontWeight="bold" ellipsis>
                      {formatMessage({
                        id: 'Settings.review-workflows.list.page.list.column.name.defaultName',
                        defaultMessage: 'Default workflow',
                      })}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{workflow.stages.length}</Typography>
                  </Td>
                  <Td>
                    <Flex gap={2} justifyContent="end">
                      <IconButton
                        aria-label={formatMessage(
                          {
                            id: 'Settings.review-workflows.list.page.list.column.actions.delete.label',
                            defaultMessage: 'Delete {name}',
                          },
                          { name: 'Default workflow' }
                        )}
                        icon={<Trash />}
                        noBorder
                        onClick={() => {
                          handleDeleteWorkflow(workflow.id);
                        }}
                      />

                      <ActionLink
                        to={`/settings/review-workflows/${workflow.id}`}
                        aria-label={formatMessage(
                          {
                            id: 'Settings.review-workflows.list.page.list.column.actions.edit.label',
                            defaultMessage: 'Edit {name}',
                          },
                          { name: 'Default workflow' }
                        )}
                      >
                        <Pencil />
                      </ActionLink>
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

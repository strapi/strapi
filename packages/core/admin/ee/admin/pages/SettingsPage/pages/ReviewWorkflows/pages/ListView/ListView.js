import React from 'react';

import {
  Flex,
  IconButton,
  Loader,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  TFooter,
  Th,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import {
  ConfirmDialog,
  Link,
  LinkButton,
  onRowClick,
  pxToRem,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { Pencil, Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

import { useContentTypes } from '../../../../../../../../admin/src/hooks/useContentTypes';
import { selectAdminPermissions } from '../../../../../../../../admin/src/pages/App/selectors';
import { useLicenseLimits } from '../../../../../../hooks/useLicenseLimits';
import * as Layout from '../../components/Layout';
import * as LimitsModal from '../../components/LimitsModal';
import { CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME } from '../../constants';
import { useReviewWorkflows } from '../../hooks/useReviewWorkflows';

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
  const { meta, workflows, isLoading, refetch } = useReviewWorkflows();
  const [workflowToDelete, setWorkflowToDelete] = React.useState(null);
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const { del } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const { getFeature, isLoading: isLicenseLoading } = useLicenseLimits();
  const { trackUsage } = useTracking();
  const permissions = useSelector(selectAdminPermissions);
  const {
    allowedActions: { canCreate, canDelete },
  } = useRBAC(permissions.settings['review-workflows']);

  const limits = getFeature('review-workflows');

  const { mutateAsync, isLoading: isLoadingMutation } = useMutation(
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

      await refetch();
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

  /**
   * If the current license has a limit:
   * check if the total count of workflows or stages exceeds that limit and display
   * the limits modal on page load. It can be closed by the user, but the
   * API will throw an error in case they try to create a new workflow or update the
   * stages.
   *
   * If the current license does not have a limit (e.g. offline license):
   * do nothing (for now). In case they are trying to create the 201st workflow/ stage
   * the API will throw an error.
   *
   */

  React.useEffect(() => {
    if (!isLoading && !isLicenseLoading) {
      if (
        limits?.[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME] &&
        meta?.workflowCount > parseInt(limits[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME], 10)
      ) {
        setShowLimitModal(true);
      }
    }
  }, [isLicenseLoading, isLoading, limits, meta?.workflowCount, meta.workflowsTotal]);

  return (
    <>
      <Layout.Header
        primaryAction={
          canCreate && (
            <LinkButton
              startIcon={<Plus />}
              size="S"
              to="/settings/review-workflows/create"
              onClick={(event) => {
                /**
                 * If the current license has a workflow limit:
                 * check if the total count of workflows exceeds that limit. If so,
                 * prevent the navigation and show the limits overlay.
                 *
                 * If the current license does not have a limit (e.g. offline license):
                 * allow the user to navigate to the create-view. In case they exceed the
                 * current hard-limit of 200 they will see an error thrown by the API.
                 */

                if (
                  limits?.[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME] &&
                  meta?.workflowCount >= parseInt(limits[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME], 10)
                ) {
                  event.preventDefault();
                  setShowLimitModal(true);
                } else {
                  trackUsage('willCreateWorkflow');
                }
              }}
            >
              {formatMessage({
                id: 'Settings.review-workflows.list.page.create',
                defaultMessage: 'Create new workflow',
              })}
            </LinkButton>
          )
        }
        subtitle={formatMessage({
          id: 'Settings.review-workflows.list.page.subtitle',
          defaultMessage: 'Manage your content review process',
        })}
        title={formatMessage({
          id: 'Settings.review-workflows.list.page.title',
          defaultMessage: 'Review Workflows',
        })}
      />

      <Layout.Root>
        {isLoading || isLoadingModels ? (
          <Flex justifyContent="center">
            <Loader>
              {formatMessage({
                id: 'Settings.review-workflows.page.list.isLoading',
                defaultMessage: 'Workflows are loading',
              })}
            </Loader>
          </Flex>
        ) : (
          <Table
            colCount={3}
            footer={
              // TODO: we should be able to use a link here instead of an (inaccessible onClick) handler
              canCreate && (
                <TFooter
                  icon={<Plus />}
                  onClick={() => {
                    /**
                     * If the current license has a workflow limit:
                     * check if the total count of workflows exceeds that limit
                     *
                     * If the current license does not have a limit (e.g. offline license):
                     * allow the user to navigate to the create-view. In case they exceed the
                     * current hard-limit of 200 they will see an error thrown by the API.
                     */

                    if (
                      limits?.[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME] &&
                      meta?.workflowCount >=
                        parseInt(limits[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME], 10)
                    ) {
                      setShowLimitModal(true);
                    } else {
                      push('/settings/review-workflows/create');
                      trackUsage('willCreateWorkflow');
                    }
                  }}
                >
                  {formatMessage({
                    id: 'Settings.review-workflows.list.page.create',
                    defaultMessage: 'Create new workflow',
                  })}
                </TFooter>
              )
            }
            rowCount={1}
          >
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
              {workflows.map((workflow) => (
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

                      {workflows.length > 1 && canDelete && (
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
                      )}
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
          isConfirmButtonLoading={isLoadingMutation}
          isOpen={!!workflowToDelete}
          onToggleDialog={toggleConfirmDeleteDialog}
          onConfirm={handleConfirmDeleteDialog}
        />

        <LimitsModal.Root isOpen={showLimitModal} onClose={() => setShowLimitModal(false)}>
          <LimitsModal.Title>
            {formatMessage({
              id: 'Settings.review-workflows.list.page.workflows.limit.title',
              defaultMessage: 'You’ve reached the limit of workflows in your plan',
            })}
          </LimitsModal.Title>

          <LimitsModal.Body>
            {formatMessage({
              id: 'Settings.review-workflows.list.page.workflows.limit.body',
              defaultMessage: 'Delete a workflow or contact Sales to enable more workflows.',
            })}
          </LimitsModal.Body>
        </LimitsModal.Root>
      </Layout.Root>
    </>
  );
}

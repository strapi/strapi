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
  useNotification,
  useRBAC,
  useTracking,
  CheckPagePermissions,
} from '@strapi/helper-plugin';
import { Pencil, Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

import { useTypedSelector } from '../../../../../../../admin/src/core/store/hooks';
import { useContentTypes } from '../../../../../../../admin/src/hooks/useContentTypes';
import { useLicenseLimits } from '../../../../hooks/useLicenseLimits';

import * as Layout from './components/Layout';
import { LimitsModal } from './components/LimitsModal';
import { CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME } from './constants';
import { useReviewWorkflows } from './hooks/useReviewWorkflows';

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

export const ReviewWorkflowsListView = () => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const { trackUsage } = useTracking();
  const [workflowToDelete, setWorkflowToDelete] = React.useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = React.useState<boolean>(false);
  const { collectionTypes, singleTypes, isLoading: isLoadingModels } = useContentTypes();
  const { meta, workflows, isLoading, deleteWorkflow } = useReviewWorkflows();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const { getFeature, isLoading: isLicenseLoading } = useLicenseLimits();
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['review-workflows']
  );
  const {
    allowedActions: { canCreate, canDelete },
  } = useRBAC(permissions);

  const limits = getFeature('review-workflows');
  const numberOfWorkflows = limits?.[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME] as string;

  const getContentTypeDisplayName = (uid: string) => {
    const contentType = [...collectionTypes, ...singleTypes].find(
      (contentType) => contentType.uid === uid
    );

    return contentType?.info.displayName;
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    setWorkflowToDelete(workflowId);
  };

  const toggleConfirmDeleteDialog = () => {
    setWorkflowToDelete(null);
  };

  const handleConfirmDeleteDialog = async () => {
    if (!workflowToDelete) return;

    try {
      setIsDeleting(true);

      const res = await deleteWorkflow({ id: workflowToDelete });

      if ('error' in res) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(res.error),
        });

        return;
      }

      setWorkflowToDelete(null);

      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.deleted', defaultMessage: 'Deleted' },
      });
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error.unexpected',
          defaultMessage: 'An error occurred',
        },
      });
    } finally {
      setIsDeleting(false);
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
      if (numberOfWorkflows && meta && meta?.workflowCount > parseInt(numberOfWorkflows, 10)) {
        setShowLimitModal(true);
      }
    }
  }, [isLicenseLoading, isLoading, meta, meta?.workflowCount, numberOfWorkflows]);

  return (
    <>
      <Layout.Header
        primaryAction={
          canCreate && (
            <LinkButton
              startIcon={<Plus />}
              size="S"
              // @ts-expect-error - types are not inferred correctly through the as prop.
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
                  numberOfWorkflows &&
                  meta &&
                  meta?.workflowCount >= parseInt(numberOfWorkflows, 10)
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
                      numberOfWorkflows &&
                      meta &&
                      meta?.workflowCount >= parseInt(numberOfWorkflows, 10)
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
              {workflows?.map((workflow) => (
                <Tr
                  {...onRowClick({
                    fn(event) {
                      const el = event.target as HTMLElement;
                      // Abort row onClick event when the user click on the delete button
                      if (el.nodeName === 'BUTTON') {
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
                            handleDeleteWorkflow(String(workflow.id));
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
          isConfirmButtonLoading={isDeleting}
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
};

export const ProtectedReviewWorkflowsPage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['review-workflows']?.main
  );

  return (
    <CheckPagePermissions permissions={permissions}>
      <ReviewWorkflowsListView />
    </CheckPagePermissions>
  );
};

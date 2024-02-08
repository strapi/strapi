import * as React from 'react';

import { Button, Flex, Loader, Typography } from '@strapi/design-system';
import { ConfirmDialog, useAPIErrorHandler, useNotification, useRBAC } from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { useFormik, Form, FormikProvider, FormikErrors } from 'formik';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { useAdminRoles } from '../../../../../../../admin/src/hooks/useAdminRoles';
import { useContentTypes } from '../../../../../../../admin/src/hooks/useContentTypes';
import { useInjectReducer } from '../../../../../../../admin/src/hooks/useInjectReducer';
import { selectAdminPermissions } from '../../../../../../../admin/src/selectors';
import { isBaseQueryError } from '../../../../../../../admin/src/utils/baseQuery';
import { Stage } from '../../../../../../../shared/contracts/review-workflows';
import { useLicenseLimits } from '../../../../hooks/useLicenseLimits';
import { useUpdateWorkflowMutation } from '../../../../services/reviewWorkflows';

import {
  resetWorkflow,
  setIsLoading,
  setWorkflow,
  setContentTypes,
  setRoles,
  setWorkflows,
} from './actions';
import * as Layout from './components/Layout';
import { LimitsModal } from './components/LimitsModal';
import { Stages } from './components/Stages';
import { WorkflowAttributes } from './components/WorkflowAttributes';
import {
  CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME,
  CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME,
  REDUX_NAMESPACE,
} from './constants';
import { useReviewWorkflows } from './hooks/useReviewWorkflows';
import { CurrentWorkflow, reducer } from './reducer';
import {
  selectIsWorkflowDirty,
  selectCurrentWorkflow,
  selectHasDeletedServerStages,
  selectIsLoading,
  selectRoles,
  selectServerState,
} from './selectors';
import { validateWorkflow } from './utils/validateWorkflow';

export const ReviewWorkflowsEditPage = () => {
  const { workflowId } = useParams<{ workflowId: string }>();
  const permissions = useSelector(selectAdminPermissions);
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const { isLoading: isLoadingWorkflow, meta, workflows } = useReviewWorkflows();
  const { collectionTypes, singleTypes, isLoading: isLoadingContentTypes } = useContentTypes();
  const serverState = useSelector(selectServerState);
  const currentWorkflowIsDirty = useSelector(selectIsWorkflowDirty);
  const currentWorkflow = useSelector(selectCurrentWorkflow);
  const hasDeletedServerStages = useSelector(selectHasDeletedServerStages);
  const roles = useSelector(selectRoles);
  const isLoading = useSelector(selectIsLoading);
  const {
    allowedActions: { canDelete, canUpdate },
  } = useRBAC(permissions.settings?.['review-workflows']);
  const [savePrompts, setSavePrompts] = React.useState<{
    hasDeletedServerStages?: boolean;
    hasReassignedContentTypes?: boolean;
  }>({});
  const { getFeature, isLoading: isLicenseLoading } = useLicenseLimits();
  const { isLoading: isLoadingRoles, roles: serverRoles } = useAdminRoles(undefined);
  const [showLimitModal, setShowLimitModal] = React.useState<'workflow' | 'stage' | null>(null);
  const [initialErrors, setInitialErrors] = React.useState<FormikErrors<CurrentWorkflow>>();
  const [saving, setSaving] = React.useState(false);

  const workflow = workflows?.find((workflow) => workflow.id === parseInt(workflowId, 10));
  const contentTypesFromOtherWorkflows = workflows
    ?.filter((workflow) => workflow.id !== parseInt(workflowId, 10))
    .flatMap((workflow) => workflow.contentTypes);

  const limits = getFeature<string>('review-workflows');
  const numberOfWorkflows = limits?.[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME];
  const stagesPerWorkflow = limits?.[CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME];

  const [updateWorkflow] = useUpdateWorkflowMutation();

  const submitForm = async () => {
    // reset the error messages
    setInitialErrors(undefined);
    setSaving(true);

    try {
      const res = await updateWorkflow({
        id: workflowId!,
        data: {
          ...currentWorkflow,

          // compare permissions of stages and only submit them if at least one has
          // changed; this enables partial updates e.g. for users who don't have
          // permissions to see roles
          stages: currentWorkflow.stages?.map((stage) => {
            let hasUpdatedPermissions = true;
            const serverStage = serverState.workflow?.stages?.find(
              (serverStage) => serverStage.id === stage?.id
            );

            if (serverStage) {
              hasUpdatedPermissions =
                serverStage.permissions?.length !== stage.permissions?.length ||
                !serverStage.permissions?.every(
                  (serverPermission) =>
                    !!stage.permissions?.find(
                      (permission) => permission.role === serverPermission.role
                    )
                );
            }

            return {
              ...stage,
              permissions: hasUpdatedPermissions ? stage.permissions : undefined,
            } satisfies Stage;
          }),
        },
      });

      if ('error' in res) {
        if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
          setInitialErrors(formatValidationErrors(res.error));
        }

        toggleNotification({
          type: 'warning',
          message: formatAPIError(res.error),
        });

        return;
      }

      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
      });
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        },
      });
    } finally {
      setSaving(false);
    }

    setSavePrompts({});
  };

  const handleConfirmDeleteDialog = async () => {
    await submitForm();
  };

  const handleConfirmClose = () => {
    setSavePrompts({});
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialErrors,
    initialValues: currentWorkflow,
    async onSubmit() {
      const isContentTypeReassignment = currentWorkflow.contentTypes?.some((contentType) =>
        contentTypesFromOtherWorkflows?.includes(contentType)
      );

      if (meta && numberOfWorkflows && meta?.workflowCount > parseInt(numberOfWorkflows, 10)) {
        /**
         * If the current license has a limit, check if the total count of workflows
         * exceeds that limit and display the limits modal instead of sending the
         * update, because it would throw an API error.
         */
        setShowLimitModal('workflow');

        /**
         * If the current license has a limit, check if the total count of stages
         * exceeds that limit and display the limits modal instead of sending the
         * update, because it would throw an API error.
         */
      } else if (
        currentWorkflow.stages &&
        stagesPerWorkflow &&
        currentWorkflow.stages.length > parseInt(stagesPerWorkflow, 10)
      ) {
        setShowLimitModal('stage');
      } else if (hasDeletedServerStages || isContentTypeReassignment) {
        if (hasDeletedServerStages) {
          setSavePrompts((prev) => ({ ...prev, hasDeletedServerStages: true }));
        }

        if (isContentTypeReassignment) {
          setSavePrompts((prev) => ({ ...prev, hasReassignedContentTypes: true }));
        }
      } else {
        submitForm();
      }
    },
    validate(values) {
      return validateWorkflow({ values, formatMessage });
    },
  });

  useInjectReducer(REDUX_NAMESPACE, reducer);

  React.useEffect(() => {
    if (!isLoadingWorkflow && workflow && workflows) {
      dispatch(setWorkflow({ workflow }));
      dispatch(setWorkflows({ workflows }));
    }

    if (!isLoadingContentTypes) {
      dispatch(setContentTypes({ collectionTypes, singleTypes }));
    }

    if (!isLoadingRoles) {
      dispatch(setRoles(serverRoles));
    }

    dispatch(setIsLoading(isLoadingWorkflow || isLoadingContentTypes || isLoadingRoles));

    // reset the state to the initial state to avoid flashes if a user
    // navigates from an edit-view to a create-view
    return () => {
      dispatch(resetWorkflow());
    };
  }, [
    collectionTypes,
    dispatch,
    isLoadingContentTypes,
    isLoadingWorkflow,
    isLoadingRoles,
    serverRoles,
    singleTypes,
    workflow,
    workflows,
  ]);

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
    if (!isLoadingWorkflow && !isLicenseLoading) {
      if (meta && numberOfWorkflows && meta?.workflowCount > parseInt(numberOfWorkflows, 10)) {
        setShowLimitModal('workflow');
      } else if (
        currentWorkflow.stages &&
        stagesPerWorkflow &&
        currentWorkflow.stages.length > parseInt(stagesPerWorkflow, 10)
      ) {
        setShowLimitModal('stage');
      }
    }
  }, [
    currentWorkflow.stages,
    isLicenseLoading,
    isLoadingWorkflow,
    limits,
    meta,
    numberOfWorkflows,
    stagesPerWorkflow,
  ]);

  React.useEffect(() => {
    if (!isLoading && roles?.length === 0) {
      toggleNotification({
        blockTransition: true,
        type: 'warning',
        message: formatMessage({
          id: 'Settings.review-workflows.stage.permissions.noPermissions.description',
          defaultMessage: 'You don’t have the permission to see roles',
        }),
      });
    }
  }, [formatMessage, isLoading, roles, toggleNotification]);

  // TODO: redirect back to list-view if workflow is not found?

  return (
    <>
      <Layout.DragLayerRendered />

      <FormikProvider value={formik}>
        <Form onSubmit={formik.handleSubmit}>
          <Layout.Header
            navigationAction={<Layout.Back href="/settings/review-workflows" />}
            primaryAction={
              canUpdate && (
                <Button
                  startIcon={<Check />}
                  type="submit"
                  size="M"
                  disabled={!currentWorkflowIsDirty}
                  // if the confirm dialog is open the loading state is on
                  // the confirm button already
                  loading={!Boolean(Object.keys(savePrompts).length > 0) && saving}
                >
                  {formatMessage({
                    id: 'global.save',
                    defaultMessage: 'Save',
                  })}
                </Button>
              )
            }
            subtitle={
              !isLoading &&
              formatMessage(
                {
                  id: 'Settings.review-workflows.page.subtitle',
                  defaultMessage: '{count, plural, one {# stage} other {# stages}}',
                },
                { count: currentWorkflow.stages?.length }
              )
            }
            title={currentWorkflow.name || ''}
          />

          <Layout.Root>
            {isLoading ? (
              <Flex justifyContent="center">
                <Loader>
                  {formatMessage({
                    id: 'Settings.review-workflows.page.isLoading',
                    defaultMessage: 'Workflow is loading',
                  })}
                </Loader>
              </Flex>
            ) : (
              <Flex alignItems="stretch" direction="column" gap={7}>
                <WorkflowAttributes canUpdate={canUpdate} />
                <Stages
                  canDelete={canDelete}
                  canUpdate={canUpdate}
                  stages={formik.values?.stages}
                />
              </Flex>
            )}
          </Layout.Root>
        </Form>
      </FormikProvider>

      <ConfirmDialog.Root
        isConfirmButtonLoading={isLoading}
        isOpen={Object.keys(savePrompts).length > 0}
        onToggleDialog={handleConfirmClose}
        onConfirm={handleConfirmDeleteDialog}
      >
        <ConfirmDialog.Body>
          <Flex direction="column" gap={5}>
            {savePrompts.hasDeletedServerStages && (
              <Typography textAlign="center" variant="omega">
                {formatMessage({
                  id: 'Settings.review-workflows.page.delete.confirm.stages.body',
                  defaultMessage:
                    'All entries assigned to deleted stages will be moved to the previous stage.',
                })}
              </Typography>
            )}

            {savePrompts.hasReassignedContentTypes && (
              <Typography textAlign="center" variant="omega">
                {formatMessage(
                  {
                    id: 'Settings.review-workflows.page.delete.confirm.contentType.body',
                    defaultMessage:
                      '{count} {count, plural, one {content-type} other {content-types}} {count, plural, one {is} other {are}} already mapped to {count, plural, one {another workflow} other {other workflows}}. If you save changes, {count, plural, one {this} other {these}} {count, plural, one {content-type} other {{count} content-types}} will no more be mapped to the {count, plural, one {another workflow} other {other workflows}} and all corresponding information will be removed.',
                  },
                  {
                    count: contentTypesFromOtherWorkflows?.filter((contentType) =>
                      currentWorkflow.contentTypes?.includes(contentType)
                    ).length,
                  }
                )}
              </Typography>
            )}

            <Typography textAlign="center" variant="omega">
              {formatMessage({
                id: 'Settings.review-workflows.page.delete.confirm.confirm',
                defaultMessage: 'Are you sure you want to save?',
              })}
            </Typography>
          </Flex>
        </ConfirmDialog.Body>
      </ConfirmDialog.Root>

      <LimitsModal.Root
        isOpen={showLimitModal === 'workflow'}
        onClose={() => setShowLimitModal(null)}
      >
        <LimitsModal.Title>
          {formatMessage({
            id: 'Settings.review-workflows.edit.page.workflows.limit.title',
            defaultMessage: 'You’ve reached the limit of workflows in your plan',
          })}
        </LimitsModal.Title>

        <LimitsModal.Body>
          {formatMessage({
            id: 'Settings.review-workflows.edit.page.workflows.limit.body',
            defaultMessage: 'Delete a workflow or contact Sales to enable more workflows.',
          })}
        </LimitsModal.Body>
      </LimitsModal.Root>

      <LimitsModal.Root isOpen={showLimitModal === 'stage'} onClose={() => setShowLimitModal(null)}>
        <LimitsModal.Title>
          {formatMessage({
            id: 'Settings.review-workflows.edit.page.stages.limit.title',
            defaultMessage: 'You have reached the limit of stages for this workflow in your plan',
          })}
        </LimitsModal.Title>

        <LimitsModal.Body>
          {formatMessage({
            id: 'Settings.review-workflows.edit.page.stages.limit.body',
            defaultMessage: 'Try deleting some stages or contact Sales to enable more stages.',
          })}
        </LimitsModal.Body>
      </LimitsModal.Root>
    </>
  );
};

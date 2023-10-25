import * as React from 'react';

import { Button, Flex, Loader, Typography } from '@strapi/design-system';
import {
  ConfirmDialog,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { useFormik, Form, FormikProvider } from 'formik';
import set from 'lodash/set';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { useAdminRoles } from '../../../../../../../../admin/src/hooks/useAdminRoles';
import { useContentTypes } from '../../../../../../../../admin/src/hooks/useContentTypes';
import { useInjectReducer } from '../../../../../../../../admin/src/hooks/useInjectReducer';
import { useLicenseLimits } from '../../../../../../hooks/useLicenseLimits';
import {
  addStage,
  resetWorkflow,
  setContentTypes,
  setIsLoading,
  setRoles,
  setWorkflows,
} from '../../actions';
import * as Layout from '../../components/Layout';
import * as LimitsModal from '../../components/LimitsModal';
import { Stages } from '../../components/Stages';
import { WorkflowAttributes } from '../../components/WorkflowAttributes';
import {
  CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME,
  CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME,
  REDUX_NAMESPACE,
} from '../../constants';
import { useReviewWorkflows } from '../../hooks/useReviewWorkflows';
import { reducer } from '../../reducer';
import {
  selectIsLoading,
  selectIsWorkflowDirty,
  selectCurrentWorkflow,
  selectRoles,
} from '../../selectors';
import { validateWorkflow } from '../../utils/validateWorkflow';

export function ReviewWorkflowsCreateView() {
  const { formatMessage } = useIntl();
  const { post } = useFetchClient();
  const { push } = useHistory();
  const { formatAPIError } = useAPIErrorHandler();
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const { collectionTypes, singleTypes, isLoading: isLoadingContentTypes } = useContentTypes();
  const { isLoading: isLoadingWorkflow, meta, workflows } = useReviewWorkflows();
  const { isLoading: isLoadingRoles, roles: serverRoles } = useAdminRoles(undefined, {
    retry: false,
  });
  const isLoading = useSelector(selectIsLoading);
  const currentWorkflowIsDirty = useSelector(selectIsWorkflowDirty);
  const currentWorkflow = useSelector(selectCurrentWorkflow);
  const roles = useSelector(selectRoles);
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const { isLoading: isLicenseLoading, getFeature } = useLicenseLimits();
  const [initialErrors, setInitialErrors] = React.useState(null);
  const [savePrompts, setSavePrompts] = React.useState({});

  const limits = getFeature('review-workflows');
  const contentTypesFromOtherWorkflows = workflows.flatMap((workflow) => workflow.contentTypes);

  const { mutateAsync, isLoading: isLoadingMutation } = useMutation(
    async ({ workflow }) => {
      const {
        data: { data },
      } = await post(`/admin/review-workflows/workflows`, {
        data: workflow,
      });

      return data;
    },
    {
      onSuccess() {
        toggleNotification({
          type: 'success',
          message: {
            id: 'Settings.review-workflows.create.page.notification.success',
            defaultMessage: 'Workflow successfully created',
          },
        });
      },
    }
  );

  const submitForm = async () => {
    setSavePrompts({});

    try {
      const workflow = await mutateAsync({ workflow: currentWorkflow });

      push(`/settings/review-workflows/${workflow.id}`);

      return workflow;
    } catch (error) {
      // TODO: this would benefit from a utility to get a formik error
      // representation from an API error
      if (
        error.response.data?.error?.name === 'ValidationError' &&
        error.response.data?.error?.details?.errors?.length > 0
      ) {
        setInitialErrors(
          error.response.data?.error?.details?.errors.reduce((acc, error) => {
            set(acc, error.path, error.message);

            return acc;
          }, {})
        );
      }

      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });

      return null;
    }
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
      const isContentTypeReassignment = currentWorkflow.contentTypes.some((contentType) =>
        contentTypesFromOtherWorkflows.includes(contentType)
      );

      /**
       * If the current license has a limit, check if the total count of workflows
       * exceeds that limit and display the limits modal instead of sending the
       * update, because it would throw an API error.
       */

      if (
        limits?.[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME] &&
        meta?.workflowCount >= parseInt(limits[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME], 10)
      ) {
        setShowLimitModal('workflow');

        /**
         * If the current license has a limit, check if the total count of stages
         * exceeds that limit and display the limits modal instead of sending the
         * update, because it would throw an API error.
         */
      } else if (
        limits?.[CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME] &&
        currentWorkflow.stages.length >=
          parseInt(limits[CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME], 10)
      ) {
        setShowLimitModal('stage');
      } else if (isContentTypeReassignment) {
        setSavePrompts((prev) => ({ ...prev, hasReassignedContentTypes: true }));
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
    dispatch(resetWorkflow());

    if (!isLoadingWorkflow) {
      dispatch(setWorkflows({ workflows }));
    }

    if (!isLoadingContentTypes) {
      dispatch(setContentTypes({ collectionTypes, singleTypes }));
    }

    if (!isLoadingRoles) {
      dispatch(setRoles(serverRoles));
    }

    dispatch(setIsLoading(isLoadingContentTypes || isLoadingRoles));

    // Create an empty default stage
    dispatch(
      addStage({
        name: '',
      })
    );
  }, [
    collectionTypes,
    dispatch,
    isLoadingContentTypes,
    isLoadingRoles,
    isLoadingWorkflow,
    serverRoles,
    singleTypes,
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
      if (
        limits?.[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME] &&
        meta?.workflowsTotal >= parseInt(limits[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME], 10)
      ) {
        setShowLimitModal('workflow');
      } else if (
        limits?.[CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME] &&
        currentWorkflow.stages.length >=
          parseInt(limits[CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME], 10)
      ) {
        setShowLimitModal('stage');
      }
    }
  }, [
    isLicenseLoading,
    isLoadingWorkflow,
    limits,
    meta?.workflowsTotal,
    currentWorkflow.stages.length,
  ]);

  React.useEffect(() => {
    if (!isLoading && roles.length === 0) {
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

  return (
    <>
      <Layout.DragLayerRendered />

      <FormikProvider value={formik}>
        <Form onSubmit={formik.handleSubmit}>
          <Layout.Header
            navigationAction={<Layout.Back href="/settings/review-workflows" />}
            primaryAction={
              <Button
                startIcon={<Check />}
                type="submit"
                size="M"
                disabled={!currentWorkflowIsDirty}
                isLoading={isLoadingMutation}
              >
                {formatMessage({
                  id: 'global.save',
                  defaultMessage: 'Save',
                })}
              </Button>
            }
            title={formatMessage({
              id: 'Settings.review-workflows.create.page.title',
              defaultMessage: 'Create Review Workflow',
            })}
            subtitle={formatMessage(
              {
                id: 'Settings.review-workflows.page.subtitle',
                defaultMessage: '{count, plural, one {# stage} other {# stages}}',
              },
              { count: currentWorkflow?.stages?.length ?? 0 }
            )}
          />
          <Layout.Root>
            <Flex alignItems="stretch" direction="column" gap={7}>
              {isLoading ? (
                <Loader>
                  {formatMessage({
                    id: 'Settings.review-workflows.page.isLoading',
                    defaultMessage: 'Workflow is loading',
                  })}
                </Loader>
              ) : (
                <Flex alignItems="stretch" direction="column" gap={7}>
                  <WorkflowAttributes />
                  <Stages stages={formik.values?.stages} />
                </Flex>
              )}
            </Flex>
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
            {savePrompts.hasReassignedContentTypes && (
              <Typography textAlign="center" variant="omega">
                {formatMessage(
                  {
                    id: 'Settings.review-workflows.page.delete.confirm.contentType.body',
                    defaultMessage:
                      '{count} {count, plural, one {content-type} other {content-types}} {count, plural, one {is} other {are}} already mapped to {count, plural, one {another workflow} other {other workflows}}. If you save changes, {count, plural, one {this} other {these}} {count, plural, one {content-type} other {{count} content-types}} will no more be mapped to the {count, plural, one {another workflow} other {other workflows}} and all corresponding information will be removed.',
                  },
                  {
                    count: contentTypesFromOtherWorkflows.filter((contentType) =>
                      currentWorkflow.contentTypes.includes(contentType)
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
        onClose={() => setShowLimitModal(false)}
      >
        <LimitsModal.Title>
          {formatMessage({
            id: 'Settings.review-workflows.create.page.workflows.limit.title',
            defaultMessage: 'You’ve reached the limit of workflows in your plan',
          })}
        </LimitsModal.Title>

        <LimitsModal.Body>
          {formatMessage({
            id: 'Settings.review-workflows.create.page.workflows.limit.body',
            defaultMessage: 'Delete a workflow or contact Sales to enable more workflows.',
          })}
        </LimitsModal.Body>
      </LimitsModal.Root>

      <LimitsModal.Root
        isOpen={showLimitModal === 'stage'}
        onClose={() => setShowLimitModal(false)}
      >
        <LimitsModal.Title>
          {formatMessage({
            id: 'Settings.review-workflows.create.page.stages.limit.title',
            defaultMessage: 'You have reached the limit of stages for this workflow in your plan',
          })}
        </LimitsModal.Title>

        <LimitsModal.Body>
          {formatMessage({
            id: 'Settings.review-workflows.create.page.stages.limit.body',
            defaultMessage: 'Try deleting some stages or contact Sales to enable more stages.',
          })}
        </LimitsModal.Body>
      </LimitsModal.Root>
    </>
  );
}

import * as React from 'react';

import { Button, Flex, Loader, Typography } from '@strapi/design-system';
import {
  ConfirmDialog,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useRBAC,
} from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { useFormik, Form, FormikProvider } from 'formik';
import set from 'lodash/set';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { useContentTypes } from '../../../../../../../../admin/src/hooks/useContentTypes';
import { useInjectReducer } from '../../../../../../../../admin/src/hooks/useInjectReducer';
import { selectAdminPermissions } from '../../../../../../../../admin/src/pages/App/selectors';
import { useLicenseLimits } from '../../../../../../hooks';
import { resetWorkflow, setWorkflow } from '../../actions';
import * as Layout from '../../components/Layout';
import * as LimitsModal from '../../components/LimitsModal';
import { Stages } from '../../components/Stages';
import { WorkflowAttributes } from '../../components/WorkflowAttributes';
import {
  CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME,
  CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME,
  REDUX_NAMESPACE,
} from '../../constants';
import { useReviewWorkflows } from '../../hooks/useReviewWorkflows';
import { reducer, initialState } from '../../reducer';
import { validateWorkflow } from '../../utils/validateWorkflow';

export function ReviewWorkflowsEditView() {
  const { workflowId } = useParams();
  const permissions = useSelector(selectAdminPermissions);
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const { put } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const {
    isLoading: isWorkflowLoading,
    meta,
    workflows,
    status: workflowStatus,
    refetch,
  } = useReviewWorkflows();
  const { collectionTypes, singleTypes, isLoading: isLoadingModels } = useContentTypes();
  const {
    status,
    clientState: {
      currentWorkflow: {
        data: currentWorkflow,
        isDirty: currentWorkflowIsDirty,
        hasDeletedServerStages,
      },
    },
  } = useSelector((state) => state?.[REDUX_NAMESPACE] ?? initialState);
  const {
    allowedActions: { canDelete, canUpdate },
  } = useRBAC(permissions.settings['review-workflows']);
  const [savePrompts, setSavePrompts] = React.useState({});
  const { getFeature, isLoading: isLicenseLoading } = useLicenseLimits();
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const [initialErrors, setInitialErrors] = React.useState(null);

  const workflow = workflows.find((workflow) => workflow.id === parseInt(workflowId, 10));
  const contentTypesFromOtherWorkflows = workflows
    .filter((workflow) => workflow.id !== parseInt(workflowId, 10))
    .flatMap((workflow) => workflow.contentTypes);

  const { mutateAsync, isLoading } = useMutation(
    async ({ workflow }) => {
      const {
        data: { data },
      } = await put(`/admin/review-workflows/workflows/${workflow.id}`, {
        data: workflow,
      });

      return data;
    },
    {
      onSuccess() {
        toggleNotification({
          type: 'success',
          message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
        });
      },
    }
  );

  const updateWorkflow = async (workflow) => {
    // reset the error messages
    setInitialErrors(null);

    try {
      const res = await mutateAsync({ workflow });

      return res;
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

  const submitForm = async () => {
    await updateWorkflow(currentWorkflow);
    await refetch();

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
      const isContentTypeReassignment = currentWorkflow.contentTypes.some((contentType) =>
        contentTypesFromOtherWorkflows.includes(contentType)
      );

      if (
        limits?.[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME] &&
        meta?.workflowCount > parseInt(limits[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME], 10)
      ) {
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
        limits?.[CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME] &&
        currentWorkflow.stages.length >
          parseInt(limits[CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME], 10)
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

  const limits = getFeature('review-workflows');

  React.useEffect(() => {
    dispatch(setWorkflow({ status: workflowStatus, data: workflow }));

    // reset the state to the initial state to avoid flashes if a user
    // navigates from an edit-view to a create-view
    return () => {
      dispatch(resetWorkflow());
    };
  }, [workflowStatus, workflow, dispatch]);

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
    if (!isWorkflowLoading && !isLicenseLoading) {
      if (
        limits?.[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME] &&
        meta?.workflowCount > parseInt(limits[CHARGEBEE_WORKFLOW_ENTITLEMENT_NAME], 10)
      ) {
        setShowLimitModal('workflow');
      } else if (
        limits?.[CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME] &&
        currentWorkflow.stages.length >
          parseInt(limits[CHARGEBEE_STAGES_PER_WORKFLOW_ENTITLEMENT_NAME], 10)
      ) {
        setShowLimitModal('stage');
      }
    }
  }, [
    currentWorkflow.stages.length,
    isLicenseLoading,
    isWorkflowLoading,
    limits,
    meta?.workflowCount,
    meta.workflowsTotal,
  ]);

  // TODO: redirect back to list-view if workflow is not found?

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
                disabled={!currentWorkflowIsDirty || !canUpdate}
                // if the confirm dialog is open the loading state is on
                // the confirm button already
                loading={!Object.keys(savePrompts).length > 0 && isLoading}
              >
                {formatMessage({
                  id: 'global.save',
                  defaultMessage: 'Save',
                })}
              </Button>
            }
            subtitle={
              currentWorkflow.stages.length > 0 &&
              formatMessage(
                {
                  id: 'Settings.review-workflows.page.subtitle',
                  defaultMessage: '{count, plural, one {# stage} other {# stages}}',
                },
                { count: currentWorkflow.stages.length }
              )
            }
            title={currentWorkflow.name}
          />

          <Layout.Root>
            {isLoadingModels || status === 'loading' ? (
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
                <WorkflowAttributes
                  canUpdate={canUpdate}
                  contentTypes={{ collectionTypes, singleTypes }}
                  currentWorkflow={currentWorkflow}
                  workflows={workflows}
                />
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

      <LimitsModal.Root
        isOpen={showLimitModal === 'stage'}
        onClose={() => setShowLimitModal(false)}
      >
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
}

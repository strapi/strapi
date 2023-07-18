import * as React from 'react';

import { Button, Flex, Loader } from '@strapi/design-system';
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
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { useContentTypes } from '../../../../../../../../admin/src/hooks/useContentTypes';
import { useInjectReducer } from '../../../../../../../../admin/src/hooks/useInjectReducer';
import { useLicenseLimits } from '../../../../../../hooks';
import { setWorkflow } from '../../actions';
import * as Layout from '../../components/Layout';
import * as LimitsModal from '../../components/LimitsModal';
import { Stages } from '../../components/Stages';
import { WorkflowAttributes } from '../../components/WorkflowAttributes';
import { REDUX_NAMESPACE } from '../../constants';
import { useReviewWorkflows } from '../../hooks/useReviewWorkflows';
import { reducer, initialState } from '../../reducer';
import { getWorkflowValidationSchema } from '../../utils/getWorkflowValidationSchema';

export function ReviewWorkflowsEditView() {
  const { workflowId } = useParams();
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const { put } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const {
    isLoading: isWorkflowLoading,
    meta,
    workflows: [workflow],
    status: workflowStatus,
    refetch,
  } = useReviewWorkflows({ id: workflowId });
  const { collectionTypes, singleTypes, isLoading: isLoadingModels } = useContentTypes();
  const {
    status,
    clientState: {
      currentWorkflow: {
        data: currentWorkflow,
        isDirty: currentWorkflowIsDirty,
        hasDeletedServerStages: currentWorkflowHasDeletedServerStages,
      },
    },
  } = useSelector((state) => state?.[REDUX_NAMESPACE] ?? initialState);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = React.useState(false);
  const { getFeature, isLoading: isLicenseLoading } = useLicenseLimits();
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const [initialErrors, setInitialErrors] = React.useState(null);

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
      // TODO: the current implementation of `formatAPIError` prints all error messages of all details,
      // which get's hairy when we have duplicated-name errors, because the same error message is printed
      // several times. What we want instead in these scenarios is to print only the error summary and
      // display the individual error messages for each field. This is a workaround, until we change the
      // implementation of `formatAPIError`.
      if (
        error.response.data?.error?.name === 'ValidationError' &&
        error.response.data?.error?.details?.errors?.length > 0
      ) {
        toggleNotification({
          type: 'warning',
          message: error.response.data.error.message,
        });

        setInitialErrors(
          error.response.data?.error?.details?.errors.reduce((acc, error) => {
            set(acc, error.path, error.message);

            return acc;
          }, {})
        );
      } else {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      }

      return null;
    }
  };

  const submitForm = async () => {
    await updateWorkflow(currentWorkflow);
    await refetch();

    setIsConfirmDeleteDialogOpen(false);
  };

  const handleConfirmDeleteDialog = async () => {
    await submitForm();
  };

  const toggleConfirmDeleteDialog = () => {
    setIsConfirmDeleteDialogOpen((prev) => !prev);
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialErrors,
    initialValues: currentWorkflow,
    async onSubmit() {
      if (currentWorkflowHasDeletedServerStages) {
        setIsConfirmDeleteDialogOpen(true);
      } else if (limits?.workflows && meta?.workflowCount > parseInt(limits.workflows, 10)) {
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
        limits?.stagesPerWorkflow &&
        currentWorkflow.stages.length > parseInt(limits.stagesPerWorkflow, 10)
      ) {
        setShowLimitModal('stage');
      } else {
        submitForm();
      }
    },
    validationSchema: getWorkflowValidationSchema({ formatMessage }),
  });

  useInjectReducer(REDUX_NAMESPACE, reducer);

  const limits = getFeature('review-workflows');

  React.useEffect(() => {
    dispatch(setWorkflow({ status: workflowStatus, data: workflow }));
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
      if (limits?.workflows && meta?.workflowCount > parseInt(limits.workflows, 10)) {
        setShowLimitModal('workflow');
      } else if (
        limits?.stagesPerWorkflow &&
        currentWorkflow.stages.length > parseInt(limits.stagesPerWorkflow, 10)
      ) {
        setShowLimitModal('stage');
      }
    }
  }, [
    currentWorkflow.stages.length,
    isLicenseLoading,
    isWorkflowLoading,
    limits.stagesPerWorkflow,
    limits.workflows,
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
                disabled={!currentWorkflowIsDirty}
                // if the confirm dialog is open the loading state is on
                // the confirm button already
                loading={!isConfirmDeleteDialogOpen && isLoading}
              >
                {formatMessage({
                  id: 'global.save',
                  defaultMessage: 'Save',
                })}
              </Button>
            }
            subtitle={formatMessage(
              {
                id: 'Settings.review-workflows.page.subtitle',
                defaultMessage: '{count, plural, one {# stage} other {# stages}}',
              },
              { count: currentWorkflow?.stages?.length ?? 0 }
            )}
            title={currentWorkflow.name}
          />

          <Layout.Root>
            {isLoadingModels || status === 'loading' ? (
              <Loader>
                {formatMessage({
                  id: 'Settings.review-workflows.page.isLoading',
                  defaultMessage: 'Workflow is loading',
                })}
              </Loader>
            ) : (
              <Flex alignItems="stretch" direction="column" gap={7}>
                <WorkflowAttributes contentTypes={{ collectionTypes, singleTypes }} />
                <Stages stages={formik.values?.stages} />
              </Flex>
            )}
          </Layout.Root>
        </Form>
      </FormikProvider>

      <ConfirmDialog
        bodyText={{
          id: 'Settings.review-workflows.page.delete.confirm.body',
          defaultMessage:
            'All entries assigned to deleted stages will be moved to the previous stage. Are you sure you want to save?',
        }}
        isConfirmButtonLoading={isLoading}
        isOpen={isConfirmDeleteDialogOpen}
        onToggleDialog={toggleConfirmDeleteDialog}
        onConfirm={handleConfirmDeleteDialog}
      />

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

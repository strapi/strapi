import * as React from 'react';

import { Button, Flex, Loader } from '@strapi/design-system';
import {
  ConfirmDialog,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useTracking,
} from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { useFormik, Form, FormikProvider } from 'formik';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

import { useContentTypes } from '../../../../../../../../admin/src/hooks/useContentTypes';
import { useInjectReducer } from '../../../../../../../../admin/src/hooks/useInjectReducer';
import { setWorkflow } from '../../actions';
import * as Layout from '../../components/Layout';
import { Stages } from '../../components/Stages';
import { WorkflowAttributes } from '../../components/WorkflowAttributes';
import { REDUX_NAMESPACE } from '../../constants';
import { useReviewWorkflows } from '../../hooks/useReviewWorkflows';
import { reducer, initialState } from '../../reducer';
import { getWorkflowValidationSchema } from '../../utils/getWorkflowValidationSchema';

export function ReviewWorkflowsEditView() {
  const { trackUsage } = useTracking();
  const { workflowId } = useParams();
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const { put } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const {
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
    try {
      const res = await mutateAsync({ workflow });

      return res;
    } catch (error) {
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
    initialValues: currentWorkflow,
    async onSubmit() {
      if (currentWorkflowHasDeletedServerStages) {
        setIsConfirmDeleteDialogOpen(true);
      } else {
        submitForm();
      }
    },
    validationSchema: getWorkflowValidationSchema({ formatMessage }),
  });

  useInjectReducer(REDUX_NAMESPACE, reducer);

  React.useEffect(() => {
    trackUsage('didViewWorkflow');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    dispatch(setWorkflow({ status: workflowStatus, data: workflow }));
  }, [workflowStatus, workflow, dispatch]);

  // TODO redirect back to list-view if workflow is not found?

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
    </>
  );
}

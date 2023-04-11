import React, { useEffect, useState } from 'react';
import { FormikProvider, useFormik, Form } from 'formik';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { useMutation } from 'react-query';

import {
  CheckPagePermissions,
  ConfirmDialog,
  SettingsPageTitle,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useTracking,
} from '@strapi/helper-plugin';
import { Button, ContentLayout, HeaderLayout, Layout, Loader, Main } from '@strapi/design-system';
import { Check } from '@strapi/icons';

import { Stages } from './components/Stages';
import { reducer, initialState } from './reducer';
import { REDUX_NAMESPACE } from './constants';
import { useInjectReducer } from '../../../../../../admin/src/hooks/useInjectReducer';
import { useReviewWorkflows } from './hooks/useReviewWorkflows';
import { setWorkflows } from './actions';
import { getWorkflowValidationSchema } from './utils/getWorkflowValidationSchema';
import adminPermissions from '../../../../../../admin/src/permissions';

export function ReviewWorkflowsPage() {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const { put } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const toggleNotification = useNotification();
  const { workflows: workflowsData, refetchWorkflow } = useReviewWorkflows();
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
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);

  const { mutateAsync, isLoading } = useMutation(
    async ({ workflowId, stages }) => {
      try {
        const {
          data: { data },
        } = await put(`/admin/review-workflows/workflows/${workflowId}/stages`, {
          data: stages,
        });

        return data;
      } catch (error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      }

      return null;
    },
    {
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },

      onSuccess() {
        toggleNotification({
          type: 'success',
          message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
        });
      },
    }
  );

  const updateWorkflowStages = (workflowId, stages) => {
    return mutateAsync({ workflowId, stages });
  };

  const submitForm = async () => {
    setIsConfirmDeleteDialogOpen(false);

    await updateWorkflowStages(currentWorkflow.id, currentWorkflow.stages);
    refetchWorkflow();
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
    validateOnChange: false,
  });

  useInjectReducer(REDUX_NAMESPACE, reducer);

  useEffect(() => {
    dispatch(setWorkflows({ status: workflowsData.status, data: workflowsData.data }));
  }, [workflowsData.status, workflowsData.data, dispatch]);

  useEffect(() => {
    trackUsage('didViewWorkflow');
  }, [trackUsage]);

  return (
    <CheckPagePermissions permissions={adminPermissions.settings['review-workflows'].main}>
      <Layout>
        <SettingsPageTitle
          name={formatMessage({
            id: 'Settings.review-workflows.page.title',
            defaultMessage: 'Review Workflows',
          })}
        />
        <Main tabIndex={-1}>
          <FormikProvider value={formik}>
            <Form onSubmit={formik.handleSubmit}>
              <HeaderLayout
                primaryAction={
                  <Button
                    startIcon={<Check />}
                    type="submit"
                    size="M"
                    disabled={!currentWorkflowIsDirty}
                    loading={isLoading}
                  >
                    {formatMessage({
                      id: 'global.save',
                      defaultMessage: 'Save',
                    })}
                  </Button>
                }
                title={formatMessage({
                  id: 'Settings.review-workflows.page.title',
                  defaultMessage: 'Review Workflows',
                })}
                subtitle={formatMessage(
                  {
                    id: 'Settings.review-workflows.page.subtitle',
                    defaultMessage: '{count, plural, one {# stage} other {# stages}}',
                  },
                  { count: currentWorkflow?.stages?.length ?? 0 }
                )}
              />
              <ContentLayout>
                {status === 'loading' && (
                  <Loader>
                    {formatMessage({
                      id: 'Settings.review-workflows.page.isLoading',
                      defaultMessage: 'Workflow is loading',
                    })}
                  </Loader>
                )}

                <Stages stages={formik.values?.stages} />
              </ContentLayout>
            </Form>
          </FormikProvider>

          <ConfirmDialog
            bodyText={{
              id: 'Settings.review-workflows.page.delete.confirm.body',
              defaultMessage:
                'All entries assigned to deleted stages will be moved to the first stage. Are you sure you want to save this?',
            }}
            isConfirmButtonLoading={isLoading}
            isOpen={isConfirmDeleteDialogOpen}
            onToggleDialog={toggleConfirmDeleteDialog}
            onConfirm={handleConfirmDeleteDialog}
          />
        </Main>
      </Layout>
    </CheckPagePermissions>
  );
}

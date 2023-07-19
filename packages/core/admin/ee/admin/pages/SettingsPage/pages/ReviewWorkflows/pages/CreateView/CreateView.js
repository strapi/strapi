import * as React from 'react';

import { Button, Flex, Loader } from '@strapi/design-system';
import {
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
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';

import { useContentTypes } from '../../../../../../../../admin/src/hooks/useContentTypes';
import { useInjectReducer } from '../../../../../../../../admin/src/hooks/useInjectReducer';
import { selectAdminPermissions } from '../../../../../../../../admin/src/pages/App/selectors';
import { useLicenseLimits } from '../../../../../../hooks';
import { resetWorkflow } from '../../actions';
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
import { reducer, initialState } from '../../reducer';
import { validateWorkflow } from '../../utils/validateWorkflow';

export function ReviewWorkflowsCreateView() {
  const { formatMessage } = useIntl();
  const { post } = useFetchClient();
  const { push } = useHistory();
  const { formatAPIError } = useAPIErrorHandler();
  const dispatch = useDispatch();
  const permissions = useSelector(selectAdminPermissions);
  const toggleNotification = useNotification();
  const { collectionTypes, singleTypes, isLoading: isLoadingModels } = useContentTypes();
  const {
    clientState: {
      currentWorkflow: { data: currentWorkflow, isDirty: currentWorkflowIsDirty },
    },
  } = useSelector((state) => state?.[REDUX_NAMESPACE] ?? initialState);
  const {
    allowedActions: { canCreate },
  } = useRBAC(permissions.settings['review-workflows']);
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const { isLoading: isLicenseLoading, getFeature } = useLicenseLimits();
  const { meta, isLoading: isWorkflowLoading } = useReviewWorkflows();
  const [initialErrors, setInitialErrors] = React.useState(null);

  const { mutateAsync, isLoading } = useMutation(
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
    try {
      const workflow = await mutateAsync({ workflow: currentWorkflow });

      push(`/settings/review-workflows/${workflow.id}`);

      return workflow;
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

  const limits = getFeature('review-workflows');

  const formik = useFormik({
    enableReinitialize: true,
    initialErrors,
    initialValues: currentWorkflow,
    async onSubmit() {
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
  }, [dispatch]);

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
    isWorkflowLoading,
    limits,
    meta?.workflowsTotal,
    currentWorkflow.stages.length,
  ]);

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
                disabled={!currentWorkflowIsDirty || !canCreate}
                isLoading={isLoading}
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
              {isLoadingModels ? (
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
            </Flex>
          </Layout.Root>
        </Form>
      </FormikProvider>

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

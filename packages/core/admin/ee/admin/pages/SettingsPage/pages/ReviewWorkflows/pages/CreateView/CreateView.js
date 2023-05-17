import * as React from 'react';
import { useFormik, Form, FormikProvider } from 'formik';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation } from 'react-query';

import {
  CheckPagePermissions,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import { Button, Flex, Loader } from '@strapi/design-system';
import { Check } from '@strapi/icons';

import { useModels } from '../../../../../../../../admin/src/hooks';
import { WorkflowAttributes } from '../../components/WorkflowAttributes';
import { Stages } from '../../components/Stages';
import { reducer, initialState } from '../../reducer';
import { REDUX_NAMESPACE } from '../../constants';
import { resetWorkflow } from '../../actions';
import { useInjectReducer } from '../../../../../../../../admin/src/hooks/useInjectReducer';
import { getWorkflowValidationSchema } from '../../utils/getWorkflowValidationSchema';
import adminPermissions from '../../../../../../../../admin/src/permissions';

import * as Layout from '../../components/Layout';

export function ReviewWorkflowsCreateView() {
  const { formatMessage } = useIntl();
  const { post } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const { collectionTypes, singleTypes, isLoading: isLoadingModels } = useModels();
  const {
    clientState: {
      currentWorkflow: { data: currentWorkflow, isDirty: currentWorkflowIsDirty },
    },
  } = useSelector((state) => state?.[REDUX_NAMESPACE] ?? initialState);

  const { mutateAsync, isLoading } = useMutation(
    async ({ workflow }) => {
      const {
        data: { data },
      } = await post(`/admin/review-workflows/workflow`, {
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

  const submitForm = async () => {
    try {
      const res = await mutateAsync({ workflow: currentWorkflow });

      return res;
    } catch (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });

      return null;
    }

    // TODO: redirect to edit view
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: currentWorkflow,
    async onSubmit() {
      submitForm();
    },
    validationSchema: getWorkflowValidationSchema({ formatMessage }),
    validateOnChange: false,
  });

  useInjectReducer(REDUX_NAMESPACE, reducer);

  React.useEffect(() => {
    dispatch(resetWorkflow());
  }, [dispatch, collectionTypes, singleTypes]);

  return (
    <CheckPagePermissions permissions={adminPermissions.settings['review-workflows'].main}>
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
    </CheckPagePermissions>
  );
}

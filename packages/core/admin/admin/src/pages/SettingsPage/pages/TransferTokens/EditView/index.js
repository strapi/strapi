import React, { useState, useRef, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Formik } from 'formik';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
  SettingsPageTitle,
  useFocusWhenNavigate,
  Form,
  useOverlayBlocker,
  useNotification,
  useTracking,
  useGuidedTour,
  useRBAC,
  useFetchClient,
} from '@strapi/helper-plugin';
import { ContentLayout, Main, Flex } from '@strapi/design-system';
import { formatAPIErrors } from '../../../../../utils';
import { schema } from './utils';
import LoadingView from './components/LoadingView';
import adminPermissions from '../../../../../permissions';
import FormTransferTokenContainer from './components/FormTransferTokenContainer';
import TokenBox from '../../../components/Tokens/TokenBox';
import FormHead from '../../../components/Tokens/FormHead';
import { TRANSFER_TOKEN_TYPE } from '../../../components/Tokens/constants';

const MSG_ERROR_NAME_TAKEN = 'Name already taken';

const TransferTokenCreateView = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  const history = useHistory();
  const [transferToken, setTransferToken] = useState(
    history.location.state?.transferToken.accessKey
      ? {
          ...history.location.state.transferToken,
        }
      : null
  );
  const { trackUsage } = useTracking();
  const trackUsageRef = useRef(trackUsage);
  const { setCurrentStep } = useGuidedTour();
  const {
    allowedActions: { canCreate, canUpdate, canRegenerate },
  } = useRBAC(adminPermissions.settings['transfer-tokens']);
  const {
    params: { id },
  } = useRouteMatch('/settings/transfer-tokens/:id');
  const { get, post, put } = useFetchClient();

  const isCreating = id === 'create';

  useEffect(() => {
    trackUsageRef.current(isCreating ? 'didAddTokenFromList' : 'didEditTokenFromList', {
      tokenType: TRANSFER_TOKEN_TYPE,
    });
  }, [isCreating]);

  const { status } = useQuery(
    ['transfer-token', id],
    async () => {
      const {
        data: { data },
      } = await get(`/admin/transfer/tokens/${id}`);

      setTransferToken({
        ...data,
      });

      return data;
    },
    {
      enabled: !isCreating && !transferToken,
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      },
    }
  );

  const handleSubmit = async (body, actions) => {
    trackUsageRef.current(isCreating ? 'willCreateToken' : 'willEditToken', {
      tokenType: TRANSFER_TOKEN_TYPE,
    });
    lockApp();
    const lifespanVal =
      body.lifespan && parseInt(body.lifespan, 10) && body.lifespan !== '0'
        ? parseInt(body.lifespan, 10)
        : null;

    try {
      const {
        data: { data: response },
      } = isCreating
        ? await post(`/admin/transfer/tokens`, {
            ...body,
            lifespan: lifespanVal,
            permissions: ['push'],
          })
        : await put(`/admin/transfer/tokens/${id}`, {
            name: body.name,
            description: body.description,
            type: body.type,
            permissions: ['push'],
          });

      unlockApp();

      if (isCreating) {
        history.replace(`/settings/transfer-tokens/${response.id}`, { transferToken: response });
        setCurrentStep('transferTokens.success');
      }
      setTransferToken({
        ...response,
      });

      toggleNotification({
        type: 'success',
        message: isCreating
          ? formatMessage({
              id: 'notification.success.transfertokencreated',
              defaultMessage: 'Transfer Token successfully created',
            })
          : formatMessage({
              id: 'notification.success.transfertokenedited',
              defaultMessage: 'Transfer Token successfully edited',
            }),
      });

      trackUsageRef.current(isCreating ? 'didCreateToken' : 'didEditToken', {
        type: transferToken?.type,
        tokenType: TRANSFER_TOKEN_TYPE,
      });
    } catch (err) {
      const errors = formatAPIErrors(err.response.data);
      actions.setErrors(errors);

      if (err?.response?.data?.error?.message === MSG_ERROR_NAME_TAKEN) {
        toggleNotification({
          type: 'warning',
          message: err.response.data.message || 'notification.error.tokennamenotunique',
        });
      } else {
        toggleNotification({
          type: 'warning',
          message: err?.response?.data?.message || 'notification.error',
        });
      }
      unlockApp();
    }
  };

  const canEditInputs = (canUpdate && !isCreating) || (canCreate && isCreating);
  const isLoading = !isCreating && !transferToken && status !== 'success';

  if (isLoading) {
    return <LoadingView transferTokenName={transferToken?.name} />;
  }

  return (
    <Main>
      <SettingsPageTitle name="Transfer Tokens" />
      <Formik
        validationSchema={schema}
        validateOnChange={false}
        initialValues={{
          name: transferToken?.name || '',
          description: transferToken?.description || '',
          lifespan: transferToken?.lifespan
            ? transferToken.lifespan.toString()
            : transferToken?.lifespan,
        }}
        enableReinitialize
        onSubmit={(body, actions) => handleSubmit(body, actions)}
      >
        {({ errors, handleChange, isSubmitting, values }) => {
          return (
            <Form>
              <FormHead
                backUrl="/settings/transfer-tokens"
                title={{
                  id: 'Settings.transferTokens.createPage.title',
                  defaultMessage: 'Create Transfer Token',
                }}
                token={transferToken}
                setToken={setTransferToken}
                canEditInputs={canEditInputs}
                canRegenerate={canRegenerate}
                isSubmitting={isSubmitting}
                regenerateUrl="/admin/transfer/tokens/"
              />
              <ContentLayout>
                <Flex direction="column" alignItems="stretch" gap={6}>
                  {Boolean(transferToken?.name) && (
                    <TokenBox token={transferToken?.accessKey} tokenType={TRANSFER_TOKEN_TYPE} />
                  )}
                  <FormTransferTokenContainer
                    errors={errors}
                    onChange={handleChange}
                    canEditInputs={canEditInputs}
                    isCreating={isCreating}
                    values={values}
                    transferToken={transferToken}
                  />
                </Flex>
              </ContentLayout>
            </Form>
          );
        }}
      </Formik>
    </Main>
  );
};

export default TransferTokenCreateView;

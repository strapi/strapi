import React, { useEffect, useRef, useState } from 'react';

import { ContentLayout, Flex, Main } from '@strapi/design-system';
import {
  Form,
  SettingsPageTitle,
  useAPIErrorHandler,
  useFetchClient,
  useFocusWhenNavigate,
  useGuidedTour,
  useNotification,
  useOverlayBlocker,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { useHistory, useRouteMatch } from 'react-router-dom';

import { formatAPIErrors } from '../../../../../utils/formatAPIErrors';
import { selectAdminPermissions } from '../../../../App/selectors';
import { TRANSFER_TOKEN_TYPE } from '../../../components/Tokens/constants';
import FormHead from '../../../components/Tokens/FormHead';
import TokenBox from '../../../components/Tokens/TokenBox';

import FormTransferTokenContainer from './components/FormTransferTokenContainer';
import LoadingView from './components/LoadingView';
import { schema } from './utils';

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
  const permissions = useSelector(selectAdminPermissions);
  const {
    allowedActions: { canCreate, canUpdate, canRegenerate },
  } = useRBAC(permissions.settings['transfer-tokens']);
  const {
    params: { id },
  } = useRouteMatch('/settings/transfer-tokens/:id');
  const { get, post, put } = useFetchClient();

  const isCreating = id === 'create';

  const { formatAPIError } = useAPIErrorHandler();

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
      onError(err) {
        if (err.response.data.error.details?.code === 'INVALID_TOKEN_SALT') {
          toggleNotification({
            type: 'warning',
            message: {
              id: 'notification.error.invalid.configuration',
              defaultMessage:
                'You have an invalid configuration, check your server log for more information.',
            },
          });
        } else {
          toggleNotification({
            type: 'warning',
            message: formatAPIError(err),
          });
        }
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

    const permissions = body.permissions.split('-');

    try {
      const {
        data: { data: response },
      } = isCreating
        ? await post(`/admin/transfer/tokens`, {
            ...body,
            lifespan: lifespanVal,
            permissions,
          })
        : await put(`/admin/transfer/tokens/${id}`, {
            name: body.name,
            description: body.description,
            permissions,
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
        type: transferToken?.permissions,
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
      } else if (err?.response?.data?.error?.details?.code === 'INVALID_TOKEN_SALT') {
        toggleNotification({
          type: 'warning',
          message: {
            id: 'notification.error.invalid.configuration',
            defaultMessage:
              'You have an invalid configuration, check your server log for more information.',
          },
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

  const handleErrorRegenerate = (err) => {
    if (err?.response?.data?.error?.details?.code === 'INVALID_TOKEN_SALT') {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error.invalid.configuration',
          defaultMessage:
            'You have an invalid configuration, check your server log for more information.',
        },
      });
    } else {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(err),
      });
    }
  };

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
          permissions: transferToken?.permissions.join('-'),
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
                onErrorRegenerate={handleErrorRegenerate}
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

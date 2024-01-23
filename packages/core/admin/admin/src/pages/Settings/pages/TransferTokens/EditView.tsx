import * as React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Main,
  Typography,
} from '@strapi/design-system';
import {
  CheckPagePermissions,
  Form,
  LoadingIndicatorPage,
  SettingsPageTitle,
  useAPIErrorHandler,
  useFetchClient,
  useFocusWhenNavigate,
  useGuidedTour,
  useNotification,
  useOverlayBlocker,
  useRBAC,
  useTracking,
  translatedErrors,
} from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { AxiosError, AxiosResponse } from 'axios';
import { Formik, FormikErrors, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import * as yup from 'yup';

import { selectAdminPermissions } from '../../../../selectors';
import { formatAPIErrors } from '../../../../utils/formatAPIErrors';
import { TRANSFER_TOKEN_TYPE } from '../../components/Tokens/constants';
import { FormHead } from '../../components/Tokens/FormHead';
import { LifeSpanInput } from '../../components/Tokens/LifeSpanInput';
import { TokenBox } from '../../components/Tokens/TokenBox';
import { TokenDescription } from '../../components/Tokens/TokenDescription';
import { TokenName } from '../../components/Tokens/TokenName';
import { TokenTypeSelect } from '../../components/Tokens/TokenTypeSelect';

import type {
  TokenCreate,
  TokenGetById,
  TransferToken,
  TokenUpdate,
  SanitizedTransferToken,
} from '../../../../../../shared/contracts/transfer';

const schema = yup.object().shape({
  name: yup.string().max(100).required(translatedErrors.required),
  description: yup.string().nullable(),
  lifespan: yup.number().integer().min(0).nullable().defined(translatedErrors.required),
  permissions: yup.string().required(translatedErrors.required),
});

const MSG_ERROR_NAME_TAKEN = 'Name already taken';

/* -------------------------------------------------------------------------------------------------
 * EditView
 * -----------------------------------------------------------------------------------------------*/

const EditView = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  const history = useHistory();
  const { state: locationState } = useLocation<{ transferToken: TransferToken }>();
  const [transferToken, setTransferToken] = React.useState<
    TransferToken | SanitizedTransferToken | null
  >(
    locationState && 'accessKey' in locationState.transferToken
      ? {
          ...locationState.transferToken,
        }
      : null
  );
  const { trackUsage } = useTracking();
  const { setCurrentStep } = useGuidedTour();
  const permissions = useSelector(selectAdminPermissions);
  const {
    allowedActions: { canCreate, canUpdate, canRegenerate },
    // @ts-expect-error this is fine
  } = useRBAC(permissions.settings['transfer-tokens']);
  const match = useRouteMatch<{ id: string }>('/settings/transfer-tokens/:id');
  const { get, post, put } = useFetchClient();

  const id = match?.params?.id;
  const isCreating = id === 'create';

  const { formatAPIError } = useAPIErrorHandler();

  React.useEffect(() => {
    trackUsage(isCreating ? 'didAddTokenFromList' : 'didEditTokenFromList', {
      tokenType: TRANSFER_TOKEN_TYPE,
    });
  }, [isCreating, trackUsage]);

  useQuery(
    ['transfer-token', id],
    async () => {
      const {
        data: { data },
      } = await get<TokenGetById.Response>(`/admin/transfer/tokens/${id}`);

      setTransferToken({
        ...data,
      });

      return data;
    },
    {
      enabled: !isCreating && !transferToken,
      onError(err) {
        if (err instanceof AxiosError) {
          // @ts-expect-error this is fine
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
        }
      },
    }
  );

  const handleSubmit = async (body: FormValues, actions: FormikHelpers<FormValues>) => {
    trackUsage(isCreating ? 'willCreateToken' : 'willEditToken', {
      tokenType: TRANSFER_TOKEN_TYPE,
    });
    // @ts-expect-error context assertation
    lockApp();

    const permissions = body.permissions.split('-');

    const isPermissionsTransferPermission = (
      permission: string[]
    ): permission is Array<'push' | 'pull'> => {
      if (permission.length === 1) {
        return permission[0] === 'push' || permission[0] === 'pull';
      }

      return permission[0] === 'push' && permission[1] === 'pull';
    };

    // this type-guard is necessary to satisfy the type for `permissions` in the request body,
    // because String.split returns stringp[]
    if (isPermissionsTransferPermission(permissions)) {
      try {
        let response: TransferToken | SanitizedTransferToken;

        if (isCreating) {
          const { data } = await post<
            TokenCreate.Response,
            AxiosResponse<TokenCreate.Response>,
            TokenCreate.Request['body']
          >(`/admin/transfer/tokens`, {
            ...body,
            permissions,
          });

          response = data.data;
        } else {
          const { data } = await put<
            TokenUpdate.Response,
            AxiosResponse<TokenUpdate.Response>,
            TokenUpdate.Request['body']
          >(`/admin/transfer/tokens/${id}`, {
            name: body.name,
            description: body.description,
            permissions,
          });

          response = data.data;
        }

        // @ts-expect-error context assertation
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

        trackUsage(isCreating ? 'didCreateToken' : 'didEditToken', {
          type: transferToken?.permissions,
          tokenType: TRANSFER_TOKEN_TYPE,
        });
      } catch (err) {
        if (err instanceof AxiosError) {
          // @ts-expect-error this is fine
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
        }

        // @ts-expect-error context assertation
        unlockApp();
      }
    }
  };

  const canEditInputs = (canUpdate && !isCreating) || (canCreate && isCreating);
  const isLoading = !isCreating && !transferToken;

  if (isLoading) {
    return <LoadingView />;
  }

  const handleErrorRegenerate = (err: unknown) => {
    if (err instanceof AxiosError) {
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
    }
  };

  return (
    <Main>
      <SettingsPageTitle name="Transfer Tokens" />
      <Formik
        validationSchema={schema}
        validateOnChange={false}
        initialValues={
          {
            name: transferToken?.name || '',
            description: transferToken?.description || '',
            lifespan: transferToken?.lifespan ?? null,
            /**
             * We need to cast the permissions to satisfy the type for `permissions`
             * in the request body incase we don't have a transferToken and instead
             * use an empty string.
             */
            permissions: (transferToken?.permissions.join('-') ?? '') as FormValues['permissions'],
          } satisfies FormValues
        }
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
                  defaultMessage: 'TokenCreate Transfer Token',
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
                  {transferToken &&
                    Boolean(transferToken?.name) &&
                    'accessKey' in transferToken && (
                      <TokenBox token={transferToken.accessKey} tokenType={TRANSFER_TOKEN_TYPE} />
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

/* -------------------------------------------------------------------------------------------------
 * ProtectedEditView
 * -----------------------------------------------------------------------------------------------*/

const ProtectedEditView = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings?.['transfer-tokens'].read}>
      <EditView />
    </CheckPagePermissions>
  );
};

/* -------------------------------------------------------------------------------------------------
 * FormTransferTokenContainer
 * -----------------------------------------------------------------------------------------------*/

interface FormValues extends Pick<TransferToken, 'description' | 'name' | 'lifespan'> {
  permissions: Extract<TransferToken['permissions'][number], string>;
}

interface FormTransferTokenContainerProps {
  errors: FormikErrors<FormValues>;
  onChange: ({ target: { name, value } }: { target: { name: string; value: string } }) => void;
  canEditInputs: boolean;
  values: FormValues;
  isCreating: boolean;
  transferToken: Partial<TransferToken> | null;
}

const FormTransferTokenContainer = ({
  errors = {},
  onChange,
  canEditInputs,
  isCreating,
  values,
  transferToken = {},
}: FormTransferTokenContainerProps) => {
  const { formatMessage } = useIntl();

  const typeOptions = [
    {
      value: 'push',
      label: {
        id: 'Settings.transferTokens.types.push',
        defaultMessage: 'Push',
      },
    },
    {
      value: 'pull',
      label: {
        id: 'Settings.transferTokens.types.pull',
        defaultMessage: 'Pull',
      },
    },
    {
      value: 'push-pull',
      label: {
        id: 'Settings.transferTokens.types.push-pull',
        defaultMessage: 'Full Access',
      },
    },
  ];

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="delta" as="h2">
          {formatMessage({
            id: 'global.details',
            defaultMessage: 'Details',
          })}
        </Typography>
        <Grid gap={5}>
          <GridItem key="name" col={6} xs={12}>
            <TokenName
              error={errors['name']}
              value={values['name']}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </GridItem>
          <GridItem key="description" col={6} xs={12}>
            <TokenDescription
              error={errors['description']}
              value={values['description']}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </GridItem>
          <GridItem key="lifespan" col={6} xs={12}>
            <LifeSpanInput
              isCreating={isCreating}
              error={errors['lifespan']}
              value={values['lifespan']}
              onChange={onChange}
              token={transferToken}
            />
          </GridItem>
          <GridItem key="permissions" col={6} xs={12}>
            <TokenTypeSelect
              name="permissions"
              value={values['permissions']}
              error={errors['permissions']}
              label={{
                id: 'Settings.tokens.form.type',
                defaultMessage: 'Token type',
              }}
              // @ts-expect-error – DS Select passes number | string, will be fixed in V2
              onChange={(value: string) => {
                onChange({ target: { name: 'permissions', value } });
              }}
              options={typeOptions}
              canEditInputs={canEditInputs}
            />
          </GridItem>
        </Grid>
      </Flex>
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * LoadingView
 * -----------------------------------------------------------------------------------------------*/
interface LoadingViewProps {
  transferTokenName?: string;
}

export const LoadingView = ({ transferTokenName }: LoadingViewProps) => {
  const { formatMessage } = useIntl();
  useFocusWhenNavigate();

  return (
    <Main aria-busy="true">
      <SettingsPageTitle name="Transfer Tokens" />
      <HeaderLayout
        primaryAction={
          <Button disabled startIcon={<Check />} type="button" size="L">
            {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
          </Button>
        }
        title={
          transferTokenName ||
          formatMessage({
            id: 'Settings.transferTokens.createPage.title',
            defaultMessage: 'Create Transfer Token',
          })
        }
      />
      <ContentLayout>
        <LoadingIndicatorPage />
      </ContentLayout>
    </Main>
  );
};

export { EditView, ProtectedEditView };

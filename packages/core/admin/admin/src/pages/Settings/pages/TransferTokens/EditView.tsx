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
// @ts-expect-error not converted yet
import FormHead from '../../components/Tokens/FormHead';
// @ts-expect-error not converted yet
import LifeSpanInput from '../../components/Tokens/LifeSpanInput';
// @ts-expect-error not converted yet
import TokenBox from '../../components/Tokens/TokenBox';
// @ts-expect-error not converted yet
import TokenDescription from '../../components/Tokens/TokenDescription';
// @ts-expect-error not converted yet
import TokenName from '../../components/Tokens/TokenName';
// @ts-expect-error not converted yet
import TokenTypeSelect from '../../components/Tokens/TokenTypeSelect';

import type {
  Create,
  Get,
  TransferToken,
  Update,
} from '../../../../../../shared/contracts/transfer/token';

const schema = yup.object().shape({
  name: yup.string().max(100).required(translatedErrors.required),
  description: yup.string().nullable(),
  lifespan: yup.number().integer().min(0).nullable().defined(translatedErrors.required),
  permissions: yup.string().required(translatedErrors.required),
});

const MSG_ERROR_NAME_TAKEN = 'Name already taken';

interface EditViewProps {
  transferTokenName?: string | null;
}

export const EditView = ({ transferTokenName = null }: EditViewProps) => {
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

interface FormTransferTokenContainerProps {
  errors: FormikErrors<Pick<TransferToken, 'description' | 'name' | 'lifespan' | 'permissions'>>;
  onChange: ({ target: { name, value } }: { target: { name: string; value: string } }) => void;
  canEditInputs: boolean;
  values: Partial<TransferToken>;
  isCreating: boolean;
  transferToken: Partial<TransferToken>;
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
              errors={errors}
              values={values}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </GridItem>
          <GridItem key="description" col={6} xs={12}>
            <TokenDescription
              errors={errors}
              values={values}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </GridItem>
          <GridItem key="lifespan" col={6} xs={12}>
            <LifeSpanInput
              isCreating={isCreating}
              errors={errors}
              values={values}
              onChange={onChange}
              token={transferToken}
            />
          </GridItem>
          <GridItem key="permissions" col={6} xs={12}>
            <TokenTypeSelect
              name="permissions"
              values={values}
              errors={errors}
              label={{
                id: 'Settings.tokens.form.type',
                defaultMessage: 'Token type',
              }}
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

export const CreateView = () => {
  useFocusWhenNavigate();
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  const history = useHistory();
  const { state: locationState } = useLocation<{ transferToken: TransferToken }>();
  const [transferToken, setTransferToken] = React.useState(
    locationState?.transferToken.accessKey
      ? {
          ...locationState.transferToken,
        }
      : null
  );
  const { trackUsage } = useTracking();
  const trackUsageRef = React.useRef(trackUsage);
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
    trackUsageRef.current(isCreating ? 'didAddTokenFromList' : 'didEditTokenFromList', {
      tokenType: TRANSFER_TOKEN_TYPE,
    });
  }, [isCreating]);

  const { status } = useQuery(
    ['transfer-token', id],
    async () => {
      const {
        data: { data },
      } = await get<Get.Response>(`/admin/transfer/tokens/${id}`);

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

  const handleSubmit = async (
    body: Pick<TransferToken, 'description' | 'name' | 'lifespan'> & {
      permissions: TransferToken['permissions'][number];
    },
    actions: FormikHelpers<Pick<TransferToken, 'description' | 'name' | 'lifespan' | 'permissions'>>
  ) => {
    trackUsageRef.current(isCreating ? 'willCreateToken' : 'willEditToken', {
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
        const {
          data: { data: response },
        } = isCreating
          ? await post<Create.Response, AxiosResponse<Create.Response>, Create.Request['body']>(
              `/admin/transfer/tokens`,
              {
                ...body,
                permissions,
              }
            )
          : await put<Update.Response, AxiosResponse<Update.Response>, Update.Request['body']>(
              `/admin/transfer/tokens/${id}`,
              {
                name: body.name,
                description: body.description,
                permissions,
              }
            );

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

        trackUsageRef.current(isCreating ? 'didCreateToken' : 'didEditToken', {
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
  const isLoading = !isCreating && !transferToken && status !== 'success';

  if (isLoading) {
    return <LoadingView transferTokenName={transferToken?.name} />;
  }

  const handleErrorRegenerate = (err: AxiosError) => {
    // @ts-expect-error this is fine
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

export const ProtectedEditView = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings?.['transfer-tokens'].read}>
      <EditView />
    </CheckPagePermissions>
  );
};

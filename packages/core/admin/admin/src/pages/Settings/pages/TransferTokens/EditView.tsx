import * as React from 'react';

import { Box, Flex, Grid, Typography } from '@strapi/design-system';
import { Formik, Form, FormikErrors, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { useLocation, useNavigate, useMatch } from 'react-router-dom';
import * as yup from 'yup';

import { useGuidedTour } from '../../../../components/GuidedTour/Provider';
import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useNotification } from '../../../../features/Notifications';
import { useTracking } from '../../../../features/Tracking';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import { useRBAC } from '../../../../hooks/useRBAC';
import {
  useCreateTransferTokenMutation,
  useGetTransferTokenQuery,
  useUpdateTransferTokenMutation,
} from '../../../../services/transferTokens';
import { isBaseQueryError } from '../../../../utils/baseQuery';
import { translatedErrors } from '../../../../utils/translatedErrors';
import { TRANSFER_TOKEN_TYPE } from '../../components/Tokens/constants';
import { FormHead } from '../../components/Tokens/FormHead';
import { LifeSpanInput } from '../../components/Tokens/LifeSpanInput';
import { TokenBox } from '../../components/Tokens/TokenBox';
import { TokenDescription } from '../../components/Tokens/TokenDescription';
import { TokenName } from '../../components/Tokens/TokenName';
import { TokenTypeSelect } from '../../components/Tokens/TokenTypeSelect';

import type {
  TransferToken,
  SanitizedTransferToken,
} from '../../../../../../shared/contracts/transfer';

const schema = yup.object().shape({
  name: yup.string().max(100).required(translatedErrors.required.id),
  description: yup.string().nullable(),
  lifespan: yup.number().integer().min(0).nullable().defined(translatedErrors.required.id),
  permissions: yup.string().required(translatedErrors.required.id),
});

/* -------------------------------------------------------------------------------------------------
 * EditView
 * -----------------------------------------------------------------------------------------------*/

const EditView = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
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
  const setCurrentStep = useGuidedTour('EditView', (state) => state.setCurrentStep);
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['transfer-tokens']
  );
  const {
    allowedActions: { canCreate, canUpdate, canRegenerate },
  } = useRBAC(permissions);
  const match = useMatch('/settings/transfer-tokens/:id');

  const id = match?.params?.id;
  const isCreating = id === 'create';

  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();

  React.useEffect(() => {
    trackUsage(isCreating ? 'didAddTokenFromList' : 'didEditTokenFromList', {
      tokenType: TRANSFER_TOKEN_TYPE,
    });
  }, [isCreating, trackUsage]);

  const { data, error } = useGetTransferTokenQuery(id!, {
    skip: isCreating || transferToken !== null || !id,
  });

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  React.useEffect(() => {
    if (data) {
      setTransferToken(data);
    }
  }, [data]);

  const [createToken] = useCreateTransferTokenMutation();
  const [updateToken] = useUpdateTransferTokenMutation();

  const handleSubmit = async (body: FormValues, formik: FormikHelpers<FormValues>) => {
    trackUsage(isCreating ? 'willCreateToken' : 'willEditToken', {
      tokenType: TRANSFER_TOKEN_TYPE,
    });

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
        if (isCreating) {
          const res = await createToken({
            ...body,
            // lifespan must be "null" for unlimited (0 would mean instantly expired and isn't accepted)
            lifespan:
              body?.lifespan && body.lifespan !== '0'
                ? parseInt(body.lifespan.toString(), 10)
                : null,
            permissions,
          });

          if ('error' in res) {
            if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
              formik.setErrors(formatValidationErrors(res.error));
            } else {
              toggleNotification({
                type: 'danger',
                message: formatAPIError(res.error),
              });
            }

            return;
          }

          setTransferToken(res.data);

          toggleNotification({
            type: 'success',
            message: formatMessage({
              id: 'notification.success.transfertokencreated',
              defaultMessage: 'Transfer Token successfully created',
            }),
          });

          trackUsage('didCreateToken', {
            type: transferToken?.permissions,
            tokenType: TRANSFER_TOKEN_TYPE,
          });

          navigate(`../transfer-tokens/${res.data.id.toString()}`, {
            replace: true,
            state: { transferToken: res.data },
          });
        } else {
          const res = await updateToken({
            id: id!,
            name: body.name,
            description: body.description,
            permissions,
          });

          if ('error' in res) {
            if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
              formik.setErrors(formatValidationErrors(res.error));
            } else {
              toggleNotification({
                type: 'danger',
                message: formatAPIError(res.error),
              });
            }

            return;
          }

          setTransferToken(res.data);

          toggleNotification({
            type: 'success',
            message: formatMessage({
              id: 'notification.success.transfertokenedited',
              defaultMessage: 'Transfer Token successfully edited',
            }),
          });

          trackUsage('didEditToken', {
            type: transferToken?.permissions,
            tokenType: TRANSFER_TOKEN_TYPE,
          });
        }
      } catch (err) {
        toggleNotification({
          type: 'danger',
          message: formatMessage({
            id: 'notification.error',
            defaultMessage: 'Something went wrong',
          }),
        });
      }
    }
  };

  const canEditInputs = (canUpdate && !isCreating) || (canCreate && isCreating);
  const isLoading = !isCreating && !transferToken;

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'Transfer Tokens',
          }
        )}
      </Page.Title>
      <Formik
        validationSchema={schema}
        validateOnChange={false}
        initialValues={
          {
            name: transferToken?.name || '',
            description: transferToken?.description || '',
            lifespan: transferToken?.lifespan || null,
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
              />
              <Layouts.Content>
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
              </Layouts.Content>
            </Form>
          );
        }}
      </Formik>
    </Page.Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ProtectedEditView
 * -----------------------------------------------------------------------------------------------*/

const ProtectedEditView = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['transfer-tokens'].read
  );

  return (
    <Page.Protect permissions={permissions}>
      <EditView />
    </Page.Protect>
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
        <Typography variant="delta" tag="h2">
          {formatMessage({
            id: 'global.details',
            defaultMessage: 'Details',
          })}
        </Typography>
        <Grid.Root gap={5}>
          <Grid.Item key="name" col={6} xs={12} direction="column" alignItems="stretch">
            <TokenName
              error={errors['name']}
              value={values['name']}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </Grid.Item>
          <Grid.Item key="description" col={6} xs={12} direction="column" alignItems="stretch">
            <TokenDescription
              error={errors['description']}
              value={values['description']}
              canEditInputs={canEditInputs}
              onChange={onChange}
            />
          </Grid.Item>
          <Grid.Item key="lifespan" col={6} xs={12} direction="column" alignItems="stretch">
            <LifeSpanInput
              isCreating={isCreating}
              error={errors['lifespan']}
              value={values['lifespan']}
              onChange={onChange}
              token={transferToken}
            />
          </Grid.Item>
          <Grid.Item key="permissions" col={6} xs={12} direction="column" alignItems="stretch">
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
          </Grid.Item>
        </Grid.Root>
      </Flex>
    </Box>
  );
};

export { EditView, ProtectedEditView };

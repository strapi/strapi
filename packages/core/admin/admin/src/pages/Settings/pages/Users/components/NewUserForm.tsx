import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  Typography,
} from '@strapi/design-system';
import { Breadcrumbs, Crumb } from '@strapi/design-system/v2';
import {
  Form,
  GenericInput,
  useFetchClient,
  useNotification,
  useOverlayBlocker,
  translatedErrors,
  useAPIErrorHandler,
} from '@strapi/helper-plugin';
import { Entity } from '@strapi/types';
import { AxiosError, AxiosResponse } from 'axios';
import { Formik, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import * as yup from 'yup';

import { Create } from '../../../../../../../shared/contracts/user';
import { useEnterprise } from '../../../../../hooks/useEnterprise';
import { FormLayout } from '../../../../../types/form';

import { MagicLinkCE } from './MagicLinkCE';
import { SelectRoles } from './SelectRoles';

interface ModalFormProps {
  onSuccess: () => Promise<void>;
  onToggle: () => void;
}

const ModalForm = ({ onSuccess, onToggle }: ModalFormProps) => {
  const [currentStep, setStep] = React.useState<keyof typeof STEPPER>('create');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [registrationToken, setRegistrationToken] = React.useState('');
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { post } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();
  const roleLayout = useEnterprise(
    ROLE_LAYOUT,
    async () =>
      (
        await import(
          '../../../../../../../ee/admin/src/pages/SettingsPage/pages/Users/components/ModalForm'
        )
      ).ROLE_LAYOUT,
    {
      combine(ceRoles, eeRoles) {
        return [...ceRoles, ...eeRoles];
      },

      defaultValue: [],
    }
  );

  const initialValues = useEnterprise<InitialData>(
    FORM_INITIAL_VALUES,
    async () =>
      (
        await import(
          '../../../../../../../ee/admin/src/pages/SettingsPage/pages/Users/components/ModalForm'
        )
      ).FORM_INITIAL_VALUES,
    {
      combine(ceValues, eeValues) {
        return {
          ...ceValues,
          ...eeValues,
        };
      },

      defaultValue: FORM_INITIAL_VALUES,
    }
  );
  const MagicLink = useEnterprise(
    MagicLinkCE,
    async () =>
      (
        await import(
          '../../../../../../../ee/admin/src/pages/SettingsPage/pages/Users/components/MagicLinkEE'
        )
      ).MagicLinkEE
  );
  const postMutation = useMutation<
    AxiosResponse<Create.Response>,
    AxiosError<Required<Create.Response>>,
    Pick<Create.Request['body'], 'email' | 'firstname' | 'lastname' | 'roles'>
  >(
    (body) =>
      post<Create.Response, AxiosResponse<Create.Response>, Create.Request['body']>(
        '/admin/users',
        body
      ),
    {
      onMutate() {
        if (lockApp) {
          lockApp();
        }

        setIsSubmitting(true);
      },
      async onSuccess({ data: { data } }) {
        if (data.registrationToken) {
          setRegistrationToken(data.registrationToken);
          await onSuccess();

          goNext();
        } else {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error', defaultMessage: 'An error occured' },
          });
        }
      },
      onError(err) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });

        throw err;
      },
      onSettled() {
        if (unlockApp) {
          unlockApp();
        }

        setIsSubmitting(false);
      },
    }
  );

  const headerTitle = formatMessage({
    id: 'Settings.permissions.users.create',
    defaultMessage: 'Invite new user',
  });

  const handleSubmit = async (body: InitialData, { setErrors }: FormikHelpers<InitialData>) => {
    try {
      await postMutation.mutateAsync({
        ...body,
        roles: body.roles ?? [],
      });
    } catch (err) {
      if (
        err instanceof AxiosError &&
        err.response?.data?.error.message === 'Email already taken'
      ) {
        setErrors({ email: err.response.data.error.message });
      }
    }
  };

  const goNext = () => {
    if (next) {
      setStep(next);
    } else {
      onToggle();
    }
  };

  const { buttonSubmitLabel, isDisabled, next } = STEPPER[currentStep];
  const endActions =
    currentStep === 'create' ? (
      <Button type="submit" loading={isSubmitting}>
        {formatMessage(buttonSubmitLabel)}
      </Button>
    ) : (
      <Button type="button" loading={isSubmitting} onClick={onToggle}>
        {formatMessage(buttonSubmitLabel)}
      </Button>
    );

  // block rendering until the EE component is fully loaded
  if (!MagicLink) {
    return null;
  }

  return (
    <ModalLayout onClose={onToggle} labelledBy="title">
      <ModalHeader>
        {/**
         * TODO: this is not semantically correct and should be amended.
         */}
        <Breadcrumbs label={headerTitle}>
          <Crumb isCurrent>{headerTitle}</Crumb>
        </Breadcrumbs>
      </ModalHeader>
      <Formik
        enableReinitialize
        initialValues={initialValues ?? {}}
        onSubmit={handleSubmit}
        validationSchema={FORM_SCHEMA}
        validateOnChange={false}
      >
        {({ errors, handleChange, values }) => {
          return (
            <Form>
              <ModalBody>
                <Flex direction="column" alignItems="stretch" gap={6}>
                  {currentStep !== 'create' && <MagicLink registrationToken={registrationToken} />}
                  <Box>
                    <Typography variant="beta" as="h2">
                      {formatMessage({
                        id: 'app.components.Users.ModalCreateBody.block-title.details',
                        defaultMessage: 'User details',
                      })}
                    </Typography>
                    <Box paddingTop={4}>
                      <Flex direction="column" alignItems="stretch" gap={1}>
                        <Grid gap={5}>
                          {FORM_LAYOUT.map((row) => {
                            return row.map((input) => {
                              return (
                                <GridItem key={input.name} {...input.size}>
                                  <GenericInput
                                    {...input}
                                    disabled={isDisabled}
                                    error={errors[input.name as keyof InitialData]}
                                    onChange={handleChange}
                                    value={values[input.name as keyof InitialData]}
                                  />
                                </GridItem>
                              );
                            });
                          })}
                        </Grid>
                      </Flex>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="beta" as="h2">
                      {formatMessage({
                        id: 'global.roles',
                        defaultMessage: "User's role",
                      })}
                    </Typography>
                    <Box paddingTop={4}>
                      <Grid gap={5}>
                        <GridItem col={6} xs={12}>
                          <SelectRoles
                            disabled={isDisabled}
                            error={errors.roles}
                            onChange={handleChange}
                            value={values.roles ?? []}
                          />
                        </GridItem>
                        {roleLayout.map((row) => {
                          return row.map((input) => {
                            return (
                              <GridItem key={input.name} {...input.size}>
                                <GenericInput
                                  {...input}
                                  disabled={isDisabled}
                                  onChange={handleChange}
                                  value={values[input.name]}
                                />
                              </GridItem>
                            );
                          });
                        })}
                      </Grid>
                    </Box>
                  </Box>
                </Flex>
              </ModalBody>
              <ModalFooter
                startActions={
                  <Button variant="tertiary" onClick={onToggle} type="button">
                    {formatMessage({
                      id: 'app.components.Button.cancel',
                      defaultMessage: 'Cancel',
                    })}
                  </Button>
                }
                endActions={endActions}
              />
            </Form>
          );
        }}
      </Formik>
    </ModalLayout>
  );
};

interface InitialData {
  firstname?: string;
  lastname?: string;
  email?: string;
  roles?: Entity.ID[];
  useSSORegistration?: boolean;
}

const FORM_INITIAL_VALUES = {
  firstname: '',
  lastname: '',
  email: '',
  roles: [],
};

const ROLE_LAYOUT = [] satisfies FormLayout[][];

const FORM_LAYOUT = [
  [
    {
      intlLabel: {
        id: 'Auth.form.firstname.label',
        defaultMessage: 'First name',
      },
      name: 'firstname',
      placeholder: {
        id: 'Auth.form.firstname.placeholder',
        defaultMessage: 'e.g. Kai',
      },
      type: 'text',
      size: {
        col: 6,
        xs: 12,
      },
      required: true,
    },
    {
      intlLabel: {
        id: 'Auth.form.lastname.label',
        defaultMessage: 'Last name',
      },
      name: 'lastname',
      placeholder: {
        id: 'Auth.form.lastname.placeholder',
        defaultMessage: 'e.g. Doe',
      },
      type: 'text',
      size: {
        col: 6,
        xs: 12,
      },
    },
  ],
  [
    {
      intlLabel: {
        id: 'Auth.form.email.label',
        defaultMessage: 'Email',
      },
      name: 'email',
      placeholder: {
        id: 'Auth.form.email.placeholder',
        defaultMessage: 'e.g. kai.doe@strapi.io',
      },
      type: 'email',
      size: {
        col: 6,
        xs: 12,
      },
      required: true,
    },
  ],
] satisfies FormLayout[][];

const FORM_SCHEMA = yup.object().shape({
  firstname: yup.string().trim().required(translatedErrors.required),
  lastname: yup.string(),
  email: yup.string().email(translatedErrors.email).required(translatedErrors.required),
  roles: yup.array().min(1, translatedErrors.required).required(translatedErrors.required),
});

const STEPPER = {
  create: {
    buttonSubmitLabel: {
      id: 'app.containers.Users.ModalForm.footer.button-success',
      defaultMessage: 'Invite user',
    },
    isDisabled: false,
    next: 'magic-link',
  },
  'magic-link': {
    buttonSubmitLabel: { id: 'global.finish', defaultMessage: 'Finish' },
    isDisabled: true,
    next: null,
  },
} as const;

export { ModalForm };
export type { InitialData };

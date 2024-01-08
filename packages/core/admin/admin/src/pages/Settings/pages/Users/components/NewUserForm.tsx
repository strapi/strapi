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
  useNotification,
  useOverlayBlocker,
  translatedErrors,
  useAPIErrorHandler,
} from '@strapi/helper-plugin';
import { Entity } from '@strapi/types';
import { Formik, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

import { useEnterprise } from '../../../../../hooks/useEnterprise';
import { useCreateUserMutation } from '../../../../../services/users';
import { FormLayout } from '../../../../../types/form';
import { isBaseQueryError } from '../../../../../utils/baseQuery';

import { MagicLinkCE } from './MagicLinkCE';
import { SelectRoles } from './SelectRoles';

interface ModalFormProps {
  onToggle: () => void;
}

const ModalForm = ({ onToggle }: ModalFormProps) => {
  const [currentStep, setStep] = React.useState<keyof typeof STEPPER>('create');
  const [registrationToken, setRegistrationToken] = React.useState('');
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();
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

  const [createUser] = useCreateUserMutation();

  const headerTitle = formatMessage({
    id: 'Settings.permissions.users.create',
    defaultMessage: 'Invite new user',
  });

  const handleSubmit = async (body: InitialData, { setErrors }: FormikHelpers<InitialData>) => {
    // @ts-expect-error – this will be fixed in V5.
    lockApp();

    const res = await createUser({
      ...body,
      roles: body.roles ?? [],
    });

    if ('data' in res) {
      if (res.data.registrationToken) {
        setRegistrationToken(res.data.registrationToken);

        goNext();
      } else {
        // This shouldn't happen, but just incase.
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      }
    } else {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(res.error),
      });

      if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
        setErrors(formatValidationErrors(res.error));
      }
    }

    // @ts-expect-error – this will be fixed in V5.
    unlockApp();
  };

  const goNext = () => {
    if (next) {
      setStep(next);
    } else {
      onToggle();
    }
  };

  const { buttonSubmitLabel, isDisabled, next } = STEPPER[currentStep];

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
        {({ errors, handleChange, values, isSubmitting }) => {
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
                endActions={
                  currentStep === 'create' ? (
                    <Button type="submit" loading={isSubmitting}>
                      {formatMessage(buttonSubmitLabel)}
                    </Button>
                  ) : (
                    <Button type="button" loading={isSubmitting} onClick={onToggle}>
                      {formatMessage(buttonSubmitLabel)}
                    </Button>
                  )
                }
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

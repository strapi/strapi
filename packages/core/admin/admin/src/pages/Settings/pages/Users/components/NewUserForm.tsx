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
import { Breadcrumbs, Crumb } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

import { Form, type FormHelpers } from '../../../../../components/Form';
import { InputRenderer } from '../../../../../components/FormInputs/Renderer';
import { useNotification } from '../../../../../features/Notifications';
import { useAPIErrorHandler } from '../../../../../hooks/useAPIErrorHandler';
import { useEnterprise } from '../../../../../hooks/useEnterprise';
import { useCreateUserMutation } from '../../../../../services/users';
import { FormLayoutInputProps } from '../../../../../types/forms';
import { isBaseQueryError } from '../../../../../utils/baseQuery';
import { translatedErrors } from '../../../../../utils/translatedErrors';

import { MagicLinkCE } from './MagicLinkCE';
import { SelectRoles } from './SelectRoles';

import type { Data } from '@strapi/types';

interface ModalFormProps {
  onToggle: () => void;
}

type FormLayout = FormLayoutInputProps[][];

const ModalForm = ({ onToggle }: ModalFormProps) => {
  const [currentStep, setStep] = React.useState<keyof typeof STEPPER>('create');
  const [registrationToken, setRegistrationToken] = React.useState('');
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();
  const roleLayout = useEnterprise<FormLayout, FormLayout, FormLayout>(
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

  const handleSubmit = async (body: InitialData, { setErrors }: FormHelpers<InitialData>) => {
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
          type: 'danger',
          message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occured' }),
        });
      }
    } else {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(res.error),
      });

      if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
        setErrors(formatValidationErrors(res.error));
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
      <Form
        method={currentStep === 'create' ? 'POST' : 'PUT'}
        initialValues={initialValues ?? {}}
        onSubmit={handleSubmit}
        validationSchema={FORM_SCHEMA}
      >
        {({ isSubmitting }) => {
          return (
            <>
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
                            return row.map(({ size, ...field }) => {
                              return (
                                <GridItem key={field.name} col={size}>
                                  <InputRenderer
                                    {...field}
                                    disabled={isDisabled}
                                    label={formatMessage(field.label)}
                                    placeholder={formatMessage(field.placeholder)}
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
                          <SelectRoles disabled={isDisabled} />
                        </GridItem>
                        {roleLayout.map((row) => {
                          return row.map(({ size, ...field }) => {
                            return (
                              <GridItem key={field.name} col={size}>
                                <InputRenderer
                                  {...field}
                                  disabled={isDisabled}
                                  label={formatMessage(field.label)}
                                  placeholder={
                                    field.placeholder ? formatMessage(field.placeholder) : undefined
                                  }
                                  hint={field.hint ? formatMessage(field.hint) : undefined}
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
            </>
          );
        }}
      </Form>
    </ModalLayout>
  );
};

interface InitialData {
  firstname?: string;
  lastname?: string;
  email?: string;
  roles?: Data.ID[];
  useSSORegistration?: boolean;
}

const FORM_INITIAL_VALUES = {
  firstname: '',
  lastname: '',
  email: '',
  roles: [],
};

const ROLE_LAYOUT: FormLayout = [];

const FORM_LAYOUT = [
  [
    {
      label: {
        id: 'Auth.form.firstname.label',
        defaultMessage: 'First name',
      },
      name: 'firstname',
      placeholder: {
        id: 'Auth.form.firstname.placeholder',
        defaultMessage: 'e.g. Kai',
      },
      type: 'string' as const,
      size: 6,
      required: true,
    },
    {
      label: {
        id: 'Auth.form.lastname.label',
        defaultMessage: 'Last name',
      },
      name: 'lastname',
      placeholder: {
        id: 'Auth.form.lastname.placeholder',
        defaultMessage: 'e.g. Doe',
      },
      type: 'string' as const,
      size: 6,
    },
  ],
  [
    {
      label: {
        id: 'Auth.form.email.label',
        defaultMessage: 'Email',
      },
      name: 'email',
      placeholder: {
        id: 'Auth.form.email.placeholder',
        defaultMessage: 'e.g. kai.doe@strapi.io',
      },
      type: 'email' as const,
      size: 6,
      required: true,
    },
  ],
] satisfies FormLayout;

const FORM_SCHEMA = yup.object().shape({
  firstname: yup.string().trim().required({
    id: translatedErrors.required.id,
    defaultMessage: 'This field is required',
  }),
  lastname: yup.string(),
  email: yup.string().email(translatedErrors.email).required({
    id: translatedErrors.required.id,
    defaultMessage: 'This field is required',
  }),
  roles: yup
    .array()
    .min(1, {
      id: translatedErrors.required.id,
      defaultMessage: 'This field is required',
    })
    .required({
      id: translatedErrors.required.id,
      defaultMessage: 'This field is required',
    }),
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

import React, { useState } from 'react';

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
} from '@strapi/helper-plugin';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';

import { useEnterprise } from '../../../../../../hooks/useEnterprise';
import { MagicLinkCE } from '../../components/MagicLink';
import SelectRoles from '../../components/SelectRoles';

import { FORM_LAYOUT, FORM_SCHEMA, FORM_INITIAL_VALUES, ROLE_LAYOUT, STEPPER } from './constants';

const ModalForm = ({ onSuccess, onToggle }) => {
  const [currentStep, setStep] = useState('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationToken, setRegistrationToken] = useState(null);
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { post } = useFetchClient();
  const roleLayout = useEnterprise(
    ROLE_LAYOUT,
    async () =>
      (
        await import(
          '../../../../../../../../ee/admin/pages/SettingsPage/pages/Users/ListPage/ModalForm/constants'
        )
      ).ROLE_LAYOUT,
    {
      combine(ceRoles, eeRoles) {
        return [...ceRoles, eeRoles];
      },

      defaultValue: [],
    }
  );
  const initialValues = useEnterprise(
    FORM_INITIAL_VALUES,
    async () =>
      (
        await import(
          '../../../../../../../../ee/admin/pages/SettingsPage/pages/Users/ListPage/ModalForm/constants'
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
          '../../../../../../../../ee/admin/pages/SettingsPage/pages/Users/components/MagicLink'
        )
      ).MagicLinkEE
  );
  const postMutation = useMutation(
    (body) => {
      return post('/admin/users', body);
    },
    {
      async onSuccess({ data }) {
        setRegistrationToken(data.data.registrationToken);

        await onSuccess();

        goNext();
        setIsSubmitting(false);
      },
      onError(err) {
        setIsSubmitting(false);

        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });

        throw err;
      },
      onSettled() {
        unlockApp();
      },
    }
  );

  const headerTitle = formatMessage({
    id: 'Settings.permissions.users.create',
    defaultMessage: 'Invite new user',
  });

  const handleSubmit = async (body, { setErrors }) => {
    lockApp();
    setIsSubmitting(true);
    try {
      await postMutation.mutateAsync(body);
    } catch (err) {
      unlockApp();

      if (err?.response?.data?.error.message === 'Email already taken') {
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
        initialValues={initialValues}
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
                                    error={errors[input.name]}
                                    onChange={handleChange}
                                    value={values[input.name]}
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
                            value={values.roles}
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

ModalForm.propTypes = {
  onToggle: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default ModalForm;

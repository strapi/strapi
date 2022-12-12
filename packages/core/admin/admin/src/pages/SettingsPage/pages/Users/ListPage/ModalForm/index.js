import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import {
  ModalLayout,
  ModalHeader,
  ModalFooter,
  ModalBody,
} from '@strapi/design-system/ModalLayout';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Breadcrumbs, Crumb } from '@strapi/design-system/Breadcrumbs';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';

import { Formik } from 'formik';
import { Form, GenericInput, useNotification, useOverlayBlocker } from '@strapi/helper-plugin';
import { useQueryClient, useMutation } from 'react-query';
import formDataModel from 'ee_else_ce/pages/SettingsPage/pages/Users/ListPage/ModalForm/utils/formDataModel';
import roleSettingsForm from 'ee_else_ce/pages/SettingsPage/pages/Users/ListPage/ModalForm/utils/roleSettingsForm';
import MagicLink from 'ee_else_ce/pages/SettingsPage/pages/Users/components/MagicLink';
import { axiosInstance } from '../../../../../../core/utils';
import SelectRoles from '../../components/SelectRoles';
import layout from './utils/layout';
import schema from './utils/schema';
import stepper from './utils/stepper';

const ModalForm = ({ queryName, onToggle }) => {
  const [currentStep, setStep] = useState('create');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationToken, setRegistrationToken] = useState(null);
  const queryClient = useQueryClient();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const postMutation = useMutation(
    (body) => {
      return axiosInstance.post('/admin/users', body);
    },
    {
      async onSuccess({ data }) {
        setRegistrationToken(data.data.registrationToken);
        await queryClient.invalidateQueries(queryName);
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

  const { buttonSubmitLabel, isDisabled, next } = stepper[currentStep];
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

  return (
    <ModalLayout onClose={onToggle} labelledBy="title">
      <ModalHeader>
        <Breadcrumbs label={headerTitle}>
          <Crumb>{headerTitle}</Crumb>
        </Breadcrumbs>
      </ModalHeader>
      <Formik
        initialValues={formDataModel}
        onSubmit={handleSubmit}
        validationSchema={schema}
        validateOnChange={false}
      >
        {({ errors, handleChange, values }) => {
          return (
            <Form>
              <ModalBody>
                <Stack spacing={6}>
                  {currentStep !== 'create' && <MagicLink registrationToken={registrationToken} />}
                  <Box>
                    <Typography variant="beta" as="h2">
                      {formatMessage({
                        id: 'app.components.Users.ModalCreateBody.block-title.details',
                        defaultMessage: 'User details',
                      })}
                    </Typography>
                    <Box paddingTop={4}>
                      <Stack spacing={1}>
                        <Grid gap={5}>
                          {layout.map((row) => {
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
                      </Stack>
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
                        {roleSettingsForm.map((row) => {
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
                </Stack>
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
  queryName: PropTypes.array.isRequired,
};

export default ModalForm;

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { ModalLayout, ModalHeader, ModalFooter, ModalBody } from '@strapi/parts/ModalLayout';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Breadcrumbs, Crumb } from '@strapi/parts/Breadcrumbs';
import { Box } from '@strapi/parts/Box';
import { Button } from '@strapi/parts/Button';
import { Stack } from '@strapi/parts/Stack';
import { H2 } from '@strapi/parts/Text';

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
  const postMutation = useMutation(body => axiosInstance.post('/admin/users', body), {
    onSuccess: async ({ data }) => {
      setRegistrationToken(data.data.registrationToken);
      await queryClient.invalidateQueries(queryName);
      goNext();
      setIsSubmitting(false);
    },
    onError: err => {
      console.error(err.response);
      setIsSubmitting(false);

      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
    onSettled: () => {
      unlockApp();
    },
  });

  const headerTitle = formatMessage({
    id: 'Settings.permissions.users.create',
    defaultMessage: 'Create new user',
  });

  const handleSubmit = async body => {
    lockApp();
    setIsSubmitting(true);

    postMutation.mutateAsync(body);
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
                <Stack size={6}>
                  {currentStep !== 'create' && <MagicLink registrationToken={registrationToken} />}
                  <Box>
                    <H2>
                      {formatMessage({
                        id: 'app.components.Users.ModalCreateBody.block-title.details',
                        defaultMessage: 'Details',
                      })}
                    </H2>
                    <Box paddingTop={4}>
                      <Stack size={1}>
                        <Grid gap={5}>
                          {layout.map(row => {
                            return row.map(input => {
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
                    <H2>
                      {formatMessage({
                        id: 'app.components.Users.ModalCreateBody.block-title.login',
                        defaultMessage: 'Login settings',
                      })}
                    </H2>
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
                        {roleSettingsForm.map(row => {
                          return row.map(input => {
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

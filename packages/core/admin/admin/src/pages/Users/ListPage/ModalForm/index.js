import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import {
  Stack,
  Grid,
  GridItem,
  ModalLayout,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Button,
  Breadcrumbs,
  Crumb,
  Box,
  H2,
} from '@strapi/parts';
import { Formik } from 'formik';
import { Form, GenericInput } from '@strapi/helper-plugin';
import formDataModel from 'ee_else_ce/pages/Users/ListPage/ModalForm/utils/formDataModel';
import roleSettingsForm from 'ee_else_ce/pages/Users/ListPage/ModalForm/utils/roleSettingsForm';
import SelectRoles from './SelectRoles';
import layout from './utils/layout';
import schema from './utils/schema';
import stepper from './utils/stepper';

const ModalForm = ({ onToggle }) => {
  const [currentStep, setStep] = useState('create');
  const { formatMessage } = useIntl();
  const headerTitle = formatMessage({
    id: 'Settings.permissions.users.create',
    defaultMessage: 'Create new user',
  });

  const handleSubmit = () => {
    goNext();
  };

  const goNext = () => {
    if (next) {
      setStep(next);
    } else {
      onToggle();
    }
  };

  const { buttonSubmitLabel, isDisabled, next } = stepper[currentStep];

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
                endActions={
                  <>
                    <Button type="submit" loading={false} disabled={isDisabled}>
                      {formatMessage(buttonSubmitLabel)}
                    </Button>
                  </>
                }
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
};

export default ModalForm;

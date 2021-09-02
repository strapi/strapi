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
  Text,
  Box,
  H2,
} from '@strapi/parts';
import { Formik } from 'formik';
import { Form } from '@strapi/helper-plugin';
import schema from './utils/schema';
import stepper from './utils/stepper';

const ModalForm = ({ onToggle }) => {
  const [currentStep, setStep] = useState('create');
  const { formatMessage } = useIntl();
  const headerTitle = formatMessage({
    id: 'Settings.permissions.users.create',
    defaultMessage: 'Create new user',
  });

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
        initialValues={{ firstname: '', lastname: '', email: '', roles: [] }}
        onSubmit={() => {}}
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
                  </Box>
                  <Box>
                    <H2>
                      {formatMessage({
                        id: 'app.components.Users.ModalCreateBody.block-title.login',
                        defaultMessage: 'Login settings',
                      })}
                    </H2>
                  </Box>
                </Stack>
                <input type="text" value={values.firstname} name="firstname" />
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
                    <Button type="submit" loading={false}>
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

/**
 *
 * FormModal
 *
 */

import React from 'react';
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
} from '@strapi/parts';
import PropTypes from 'prop-types';
import { Formik } from 'formik';
import { Form } from '@strapi/helper-plugin';
import Input from './Input';

const FormModal = ({
  headerBreadcrumbs,
  initialData,
  layout,
  isOpen,
  onToggle,
  providerToEditName,
}) => {
  const { formatMessage } = useIntl();

  if (!isOpen) {
    return null;
  }

  return (
    <ModalLayout onClose={onToggle} labelledBy="title">
      <ModalHeader>
        <Breadcrumbs label={headerBreadcrumbs.join(', ')}>
          {headerBreadcrumbs.map(crumb => (
            <Crumb key={crumb}>{crumb}</Crumb>
          ))}
        </Breadcrumbs>
      </ModalHeader>
      <Formik initialValues={initialData} validationSchema={layout.schema} validateOnChange={false}>
        {({ errors, handleChange, values }) => {
          return (
            <Form>
              <ModalBody>
                <Stack size={1}>
                  <Grid gap={5}>
                    {layout.form.map(row => {
                      return row.map(input => {
                        return (
                          <GridItem key={input.name} col={input.size} xs={12}>
                            <Input
                              {...input}
                              error={errors[input.name]}
                              onChange={handleChange}
                              value={values[input.name]}
                              providerToEditName={providerToEditName}
                            />
                          </GridItem>
                        );
                      });
                    })}
                  </Grid>
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
                    <Button type="submit">
                      {formatMessage({ id: 'app.components.Button.save', defaultMessage: 'Save' })}
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

FormModal.defaultProps = {
  initialData: null,
  providerToEditName: null,
};

FormModal.propTypes = {
  headerBreadcrumbs: PropTypes.arrayOf(PropTypes.string).isRequired,
  initialData: PropTypes.object,
  layout: PropTypes.shape({
    form: PropTypes.arrayOf(PropTypes.array),
    schema: PropTypes.object,
  }).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  providerToEditName: PropTypes.string,
};

export default FormModal;

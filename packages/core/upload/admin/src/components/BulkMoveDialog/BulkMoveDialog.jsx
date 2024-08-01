import React from 'react';

import { Button, Flex, Grid, Field, Loader, Modal, Typography } from '@strapi/design-system';
import { Form, Formik } from 'formik';
import isEmpty from 'lodash/isEmpty';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { AssetDefinition, FolderDefinition } from '../../constants';
import { useBulkMove } from '../../hooks/useBulkMove';
import { useFolderStructure } from '../../hooks/useFolderStructure';
import { getTrad } from '../../utils';
import { normalizeAPIError } from '../../utils/normalizeAPIError';
import SelectTree from '../SelectTree';

export const BulkMoveDialog = ({ onClose, selected, currentFolder }) => {
  const { formatMessage } = useIntl();
  const { data: folderStructure, isLoading } = useFolderStructure();
  const { move } = useBulkMove();

  if (!folderStructure) {
    return null;
  }

  const handleSubmit = async (values, { setErrors }) => {
    try {
      await move(values.destination.value, selected);
      onClose();
    } catch (error) {
      const normalizedError = normalizeAPIError(error);

      const formikErrors = normalizedError.errors.reduce((acc, error) => {
        acc[error.values?.path?.length || 'destination'] = error.defaultMessage;

        return acc;
      }, {});

      if (!isEmpty(formikErrors)) {
        setErrors(formikErrors);
      }
    }
  };

  if (isLoading) {
    return (
      <Modal.Content>
        <Modal.Body>
          <Flex justifyContent="center" paddingTop={4} paddingBottom={4}>
            <Loader>
              {formatMessage({
                id: getTrad('content.isLoading'),
                defaultMessage: 'Content is loading.',
              })}
            </Loader>
          </Flex>
        </Modal.Body>
      </Modal.Content>
    );
  }

  const initialFormData = {
    destination: {
      value: currentFolder?.id || '',
      label: currentFolder?.name || folderStructure[0].label,
    },
  };

  return (
    <Modal.Content>
      <Formik validateOnChange={false} onSubmit={handleSubmit} initialValues={initialFormData}>
        {({ values, errors, setFieldValue }) => (
          <Form noValidate>
            <Modal.Header>
              <Modal.Title>
                {formatMessage({
                  id: getTrad('modal.folder.move.title'),
                  defaultMessage: 'Move elements to',
                })}
              </Modal.Title>
            </Modal.Header>

            <Modal.Body>
              <Grid.Root gap={4}>
                <Grid.Item xs={12} col={12} direction="column" alignItems="stretch">
                  <Field.Root id="folder-destination">
                    <Field.Label>
                      {formatMessage({
                        id: getTrad('form.input.label.folder-location'),
                        defaultMessage: 'Location',
                      })}
                    </Field.Label>

                    <SelectTree
                      options={folderStructure}
                      onChange={(value) => {
                        setFieldValue('destination', value);
                      }}
                      defaultValue={values.destination}
                      name="destination"
                      menuPortalTarget={document.querySelector('body')}
                      inputId="folder-destination"
                      error={errors?.destination}
                      ariaErrorMessage="destination-error"
                    />

                    {errors.destination && (
                      <Typography variant="pi" tag="p" textColor="danger600">
                        {errors.destination}
                      </Typography>
                    )}
                  </Field.Root>
                </Grid.Item>
              </Grid.Root>
            </Modal.Body>

            <Modal.Footer>
              <Modal.Close>
                <Button variant="tertiary" name="cancel">
                  {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
                </Button>
              </Modal.Close>
              <Button type="submit" loading={isLoading}>
                {formatMessage({ id: 'modal.folder.move.submit', defaultMessage: 'Move' })}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Formik>
    </Modal.Content>
  );
};

BulkMoveDialog.defaultProps = {
  currentFolder: undefined,
  selected: [],
};

BulkMoveDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  currentFolder: FolderDefinition,
  selected: PropTypes.arrayOf(FolderDefinition, AssetDefinition),
};

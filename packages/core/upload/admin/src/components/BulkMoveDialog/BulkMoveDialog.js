import React from 'react';

import {
  Button,
  FieldLabel,
  Flex,
  Grid,
  GridItem,
  Loader,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  Typography,
} from '@strapi/design-system';
import { Form, normalizeAPIError } from '@strapi/helper-plugin';
import { Formik } from 'formik';
import isEmpty from 'lodash/isEmpty';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { AssetDefinition, FolderDefinition } from '../../constants';
import { useBulkMove } from '../../hooks/useBulkMove';
import { useFolderStructure } from '../../hooks/useFolderStructure';
import { getTrad } from '../../utils';
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

  const handleClose = () => {
    onClose();
  };

  if (isLoading) {
    return (
      <ModalLayout onClose={handleClose} labelledBy="title">
        <ModalBody>
          <Flex justifyContent="center" paddingTop={4} paddingBottom={4}>
            <Loader>
              {formatMessage({
                id: getTrad('content.isLoading'),
                defaultMessage: 'Content is loading.',
              })}
            </Loader>
          </Flex>
        </ModalBody>
      </ModalLayout>
    );
  }

  const initialFormData = {
    destination: {
      value: currentFolder?.id || '',
      label: currentFolder?.name || folderStructure[0].label,
    },
  };

  return (
    <ModalLayout onClose={handleClose} labelledBy="title">
      <Formik validateOnChange={false} onSubmit={handleSubmit} initialValues={initialFormData}>
        {({ values, errors, setFieldValue }) => (
          <Form noValidate>
            <ModalHeader>
              <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
                {formatMessage({
                  id: getTrad('modal.folder.move.title'),
                  defaultMessage: 'Move elements to',
                })}
              </Typography>
            </ModalHeader>

            <ModalBody>
              <Grid gap={4}>
                <GridItem xs={12} col={12}>
                  <Flex direction="column" alignItems="stretch" gap={1}>
                    <FieldLabel htmlFor="folder-destination">
                      {formatMessage({
                        id: getTrad('form.input.label.folder-location'),
                        defaultMessage: 'Location',
                      })}
                    </FieldLabel>

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
                      <Typography
                        variant="pi"
                        as="p"
                        id="folder-destination-error"
                        textColor="danger600"
                      >
                        {errors.destination}
                      </Typography>
                    )}
                  </Flex>
                </GridItem>
              </Grid>
            </ModalBody>

            <ModalFooter
              startActions={
                <Button onClick={handleClose} variant="tertiary" name="cancel">
                  {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
                </Button>
              }
              endActions={
                <Button type="submit" loading={isLoading}>
                  {formatMessage({ id: 'modal.folder.move.submit', defaultMessage: 'Move' })}
                </Button>
              }
            />
          </Form>
        )}
      </Formik>
    </ModalLayout>
  );
};

BulkMoveDialog.defaultProps = {
  currentFolder: undefined,
};

BulkMoveDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  currentFolder: FolderDefinition,
  selected: PropTypes.arrayOf(FolderDefinition, AssetDefinition).isRequired,
};

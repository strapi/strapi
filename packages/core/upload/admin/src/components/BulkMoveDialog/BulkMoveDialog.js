import { Formik } from 'formik';
import React from 'react';
import PropTypes from 'prop-types';
import isEmpty from 'lodash/isEmpty';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system/Button';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Flex } from '@strapi/design-system/Flex';
import { Loader } from '@strapi/design-system/Loader';
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@strapi/design-system/ModalLayout';
import { FieldLabel } from '@strapi/design-system/Field';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { Form, getAPIInnerErrors } from '@strapi/helper-plugin';

import { useBulkMove } from '../../hooks/useBulkMove';
import { getTrad } from '../../utils';
import SelectTree from '../SelectTree';
import { useFolderStructure } from '../../hooks/useFolderStructure';
import { FolderDefinition, AssetDefinition } from '../../constants';

export const BulkMoveDialog = ({ onClose, selected, parentFolder }) => {
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
      const errors = getAPIInnerErrors(error, { getTrad });
      const formikErrors = Object.entries(errors).reduce((acc, [key, error]) => {
        acc[key || 'destination'] = error.defaultMessage;

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
                id: getTrad('list.asset.load'),
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
      value: parentFolder?.id || '',
      label: parentFolder?.name || folderStructure[0].label,
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
                  <Stack spacing={1}>
                    <FieldLabel htmlFor="folder-destination">
                      {formatMessage({
                        id: getTrad('form.input.label.folder-location'),
                        defaultMessage: 'Location',
                      })}
                    </FieldLabel>

                    <SelectTree
                      options={folderStructure}
                      onChange={value => {
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
                  </Stack>
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
  parentFolder: undefined,
};

BulkMoveDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  parentFolder: FolderDefinition,
  selected: PropTypes.arrayOf(FolderDefinition, AssetDefinition).isRequired,
};

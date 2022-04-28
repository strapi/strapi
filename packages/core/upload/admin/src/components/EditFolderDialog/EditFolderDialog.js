import * as yup from 'yup';
import { Formik } from 'formik';
import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system/Button';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@strapi/design-system/ModalLayout';
import { FieldLabel } from '@strapi/design-system/Field';
import { Stack } from '@strapi/design-system/Stack';
import { TextInput } from '@strapi/design-system/TextInput';
import { Typography } from '@strapi/design-system/Typography';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { Form, useNotification } from '@strapi/helper-plugin';

import { getTrad } from '../../utils';
import { useEditFolder } from '../../hooks/useEditFolder';
import { ContextInfo } from '../ContextInfo';
import SelectTree from '../SelectTree';

const folderSchema = yup.object({
  name: yup.string().required(),
  parent: yup
    .object({
      label: yup.string(),
      value: yup.number().nullable(true),
    })
    .nullable(true),
});

export const EditFolderDialog = ({ onClose, folder }) => {
  const submitButtonRef = useRef(null);
  const { formatMessage } = useIntl();
  const { editFolder, isLoading } = useEditFolder();
  const toggleNotification = useNotification();

  const initialFormData = {
    ...folder,
    parent: {
      value: null,
      label: formatMessage({
        id: getTrad('form.input.label.folder-location-default-label'),
        defaultMessage: 'Media Library',
      }),
      ...folder?.parent,
    },
  };

  const handleSubmit = async (values, { setErrors }) => {
    try {
      await editFolder({
        ...folder,
        ...values,
        parent: values.parent.value ?? null,
      });

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTrad('modal.folder-notification-success'),
          defaultMessage: 'Folder successfully created',
        }),
      });

      onClose();
    } catch (err) {
      let errors = {};

      // TODO: use getAPIInnerError ?
      const res = err.response.data.error;

      // TODO: needs to be refactored in the backend
      if (res.message === 'name already taken') {
        errors.name = 'Has to be unique';
      }

      setErrors(errors);

      /* TODO: it can fail because of several reasons
        - can not move a folder into itself or its children
        - network & appliction errors
      */
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <ModalLayout onClose={handleClose} labelledBy="title">
      <ModalHeader>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTrad('modal.folder.create.title'),
            defaultMessage: 'Add new folder',
          })}
        </Typography>
      </ModalHeader>

      <ModalBody>
        <Formik
          validationSchema={folderSchema}
          validateOnChange={false}
          onSubmit={handleSubmit}
          initialValues={initialFormData}
        >
          {({ values, errors, handleChange, setFieldValue }) => (
            <Form noValidate>
              <Grid gap={4}>
                {folder && (
                  <GridItem xs={12} col={12}>
                    <ContextInfo
                      blocks={[
                        {
                          label: formatMessage({
                            id: getTrad('modal.folder.create.elements'),
                            defaultMessage: 'Elements',
                          }),
                          value: folder.children.length,
                        },

                        {
                          label: formatMessage({
                            id: getTrad('modal.folder.create.creation-date'),
                            defaultMessage: 'Creation Date',
                          }),
                          value: folder.createdAt,
                        },
                      ]}
                    />
                  </GridItem>
                )}

                <GridItem xs={12} col={6}>
                  <TextInput
                    label={formatMessage({
                      id: getTrad('form.input.label.folder-name'),
                      defaultMessage: 'Name',
                    })}
                    name="name"
                    value={values.name}
                    error={errors.name}
                    onChange={handleChange}
                  />
                </GridItem>

                <GridItem xs={12} col={6}>
                  <Stack spacing={1}>
                    <FieldLabel>
                      {formatMessage({
                        id: getTrad('form.input.label.folder-location'),
                        defaultMessage: 'Location',
                      })}
                    </FieldLabel>

                    <SelectTree
                      options={[]}
                      onChange={value => {
                        setFieldValue('parent', value);
                      }}
                      defaultValue={values.parent}
                      name="parent"
                    />
                  </Stack>
                </GridItem>
              </Grid>

              <VisuallyHidden>
                <button type="submit" tabIndex={-1} ref={submitButtonRef} name="hidden-submit">
                  {formatMessage({ id: 'submit', defaultMessage: 'Submit' })}
                </button>
              </VisuallyHidden>
            </Form>
          )}
        </Formik>
      </ModalBody>

      <ModalFooter
        startActions={
          <Button onClick={() => handleClose()} variant="tertiary" name="cancel">
            {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
          </Button>
        }
        endActions={
          <Button onClick={() => submitButtonRef.current.click()} name="submit" loading={isLoading}>
            {formatMessage({ id: 'modal.folder.create.submit', defaultMessage: 'Create' })}
          </Button>
        }
      />
    </ModalLayout>
  );
};

EditFolderDialog.defaultProps = {
  folder: undefined,
};

EditFolderDialog.propTypes = {
  folder: PropTypes.shape({
    name: PropTypes.string.isRequired,
    children: PropTypes.array.isRequired,
    createdAt: PropTypes.string.isRequired,
    parent: PropTypes.number,
  }),
  onClose: PropTypes.func.isRequired,
};

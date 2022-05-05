import * as yup from 'yup';
import { Formik } from 'formik';
import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import isEmpty from 'lodash/isEmpty';
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
import { Form, useNotification, getAPIInnerErrors, useQueryParams } from '@strapi/helper-plugin';

import { getTrad, findRecursiveFolderByValue } from '../../utils';
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

export const EditFolderDialog = ({ onClose, folder, folderStructure }) => {
  const submitButtonRef = useRef(null);
  const { formatMessage, formatDate } = useIntl();
  const { editFolder, isLoading } = useEditFolder();
  const toggleNotification = useNotification();
  const [{ query }] = useQueryParams();

  const activeFolderId = parseInt(
    folder?.parent?.id ?? query?.folder ?? folderStructure[0].value,
    10
  );
  const initialFormData = Object.assign({}, folder, {
    parent: {
      value: activeFolderId,
      label:
        findRecursiveFolderByValue(folderStructure, activeFolderId)?.label ??
        folderStructure[0].label,
    },
  });

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

      onClose({ created: true });
    } catch (err) {
      const errors = getAPIInnerErrors(err, { getTrad });
      const formikErrors = Object.entries(errors).reduce((acc, [key, error]) => {
        acc[key] = error.defaultMessage;

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
                          value: formatMessage(
                            {
                              id: getTrad('modal.folder.elements.count'),
                              defaultMessage: '{assetCount} assets, {folderCount} folders',
                            },
                            {
                              assetCount: folder?.files?.count ?? 0,
                              folderCount: folder?.children?.length ?? 0,
                            }
                          ),
                        },

                        {
                          label: formatMessage({
                            id: getTrad('modal.folder.create.creation-date'),
                            defaultMessage: 'Creation Date',
                          }),
                          value: formatDate(new Date(folder.createdAt)),
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
                    <FieldLabel for="folder-parent">
                      {formatMessage({
                        id: getTrad('form.input.label.folder-location'),
                        defaultMessage: 'Location',
                      })}
                    </FieldLabel>

                    <SelectTree
                      options={folderStructure}
                      onChange={value => {
                        setFieldValue('parent', value);
                      }}
                      defaultValue={values.parent}
                      name="parent"
                      menuPortalTarget={document.querySelector('body')}
                      inputId="folder-parent"
                      {...(errors.parent
                        ? {
                            'aria-errormessage': 'folder-parent-error',
                            'aria-invalid': true,
                          }
                        : {})}
                    />

                    {errors.parent && (
                      <Typography
                        variant="pi"
                        as="p"
                        id="folder-parent-error"
                        textColor="danger600"
                      >
                        {errors.parent}
                      </Typography>
                    )}
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
    files: PropTypes.shape({
      count: PropTypes.number.isRequired,
    }).isRequired,
    parent: PropTypes.number,
  }),
  // TODO: describe shape
  folderStructure: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
};

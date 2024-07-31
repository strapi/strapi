import React, { useState } from 'react';

import { useTracking, useNotification } from '@strapi/admin/strapi-admin';
import {
  Button,
  Field,
  Flex,
  Grid,
  Loader,
  Modal,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Form, Formik } from 'formik';
import isEmpty from 'lodash/isEmpty';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

import { FolderDefinition } from '../../constants';
import { useBulkRemove } from '../../hooks/useBulkRemove';
import { useEditFolder } from '../../hooks/useEditFolder';
import { useFolderStructure } from '../../hooks/useFolderStructure';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';
import { findRecursiveFolderByValue, getTrad, getAPIInnerErrors } from '../../utils';
import { ContextInfo } from '../ContextInfo';
import SelectTree from '../SelectTree';

import { EditFolderModalHeader } from './ModalHeader';
import RemoveFolderDialog from './RemoveFolderDialog';

const folderSchema = yup.object({
  name: yup.string().required(),
  parent: yup
    .object({
      label: yup.string(),
      value: yup.number().nullable(true),
    })
    .nullable(true),
});

export const EditFolderContent = ({ onClose, folder, location, parentFolderId }) => {
  const { data: folderStructure, isLoading: folderStructureIsLoading } = useFolderStructure({
    enabled: true,
  });
  const { canCreate, isLoading: isLoadingPermissions, canUpdate } = useMediaLibraryPermissions();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { formatMessage, formatDate } = useIntl();
  const { trackUsage } = useTracking();
  const { editFolder, isLoading: isEditFolderLoading } = useEditFolder();
  const { remove } = useBulkRemove();
  const { toggleNotification } = useNotification();
  const isLoading = isLoadingPermissions || folderStructureIsLoading;
  const isEditing = !!folder;
  const formDisabled = (folder && !canUpdate) || (!folder && !canCreate);
  const initialFormData = !folderStructureIsLoading && {
    name: folder?.name ?? '',
    parent: {
      /* ideally we would use folderStructure[0].value, but since it is null
         react complains about rendering null as field value */
      value: parentFolderId ? parseInt(parentFolderId, 10) : undefined,
      label: parentFolderId
        ? findRecursiveFolderByValue(folderStructure, parseInt(parentFolderId, 10))?.label
        : folderStructure[0].label,
    },
  };

  const handleSubmit = async (values, { setErrors }) => {
    try {
      await editFolder(
        {
          ...values,
          parent: values.parent.value ?? null,
        },
        folder?.id
      );

      toggleNotification({
        type: 'success',
        message: isEditing
          ? formatMessage({
              id: getTrad('modal.folder-notification-edited-success'),
              defaultMessage: 'Folder successfully edited',
            })
          : formatMessage({
              id: getTrad('modal.folder-notification-created-success'),
              defaultMessage: 'Folder successfully created',
            }),
      });

      if (isEditing) {
        const didChangeLocation = parentFolderId
          ? parseInt(parentFolderId, 10) !== values.parent.value
          : parentFolderId === null && !!values.parent.value;

        trackUsage('didEditMediaLibraryElements', {
          location,
          type: 'folder',
          changeLocation: didChangeLocation,
        });
      } else {
        trackUsage('didAddMediaLibraryFolders', { location });
      }

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

  const handleDelete = async () => {
    await remove([folder]);

    setShowConfirmDialog(false);
    onClose();
  };

  if (isLoading) {
    return (
      <>
        <EditFolderModalHeader isEditing={isEditing} />
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
      </>
    );
  }

  return (
    <>
      <Formik
        validationSchema={folderSchema}
        validateOnChange={false}
        onSubmit={handleSubmit}
        initialValues={initialFormData}
      >
        {({ values, errors, handleChange, setFieldValue }) => (
          <Form noValidate>
            <EditFolderModalHeader isEditing={isEditing} />
            <Modal.Body>
              <Grid.Root gap={4}>
                {isEditing && (
                  <Grid.Item xs={12} col={12} direction="column" alignItems="stretch">
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
                              defaultMessage: '{folderCount} folders, {assetCount} assets',
                            },
                            {
                              assetCount: folder?.files?.count ?? 0,
                              folderCount: folder?.children?.count ?? 0,
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
                  </Grid.Item>
                )}

                <Grid.Item xs={12} col={6} direction="column" alignItems="stretch">
                  <Field.Root name="name" error={errors.name}>
                    <Field.Label>
                      {formatMessage({
                        id: getTrad('form.input.label.folder-name'),
                        defaultMessage: 'Name',
                      })}
                    </Field.Label>
                    <TextInput
                      value={values.name}
                      onChange={handleChange}
                      disabled={formDisabled}
                    />
                    <Field.Error />
                  </Field.Root>
                </Grid.Item>

                <Grid.Item xs={12} col={6} direction="column" alignItems="stretch">
                  <Field.Root id="folder-parent">
                    <Field.Label>
                      {formatMessage({
                        id: getTrad('form.input.label.folder-location'),
                        defaultMessage: 'Location',
                      })}
                    </Field.Label>

                    <SelectTree
                      options={folderStructure}
                      onChange={(value) => {
                        setFieldValue('parent', value);
                      }}
                      isDisabled={formDisabled}
                      defaultValue={values.parent}
                      name="parent"
                      menuPortalTarget={document.querySelector('body')}
                      inputId="folder-parent"
                      disabled={formDisabled}
                      error={errors?.parent}
                      ariaErrorMessage="folder-parent-error"
                    />

                    {errors.parent && (
                      <Typography
                        variant="pi"
                        tag="p"
                        id="folder-parent-error"
                        textColor="danger600"
                      >
                        {errors.parent}
                      </Typography>
                    )}
                  </Field.Root>
                </Grid.Item>
              </Grid.Root>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={() => onClose()} variant="tertiary" name="cancel">
                {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
              </Button>
              <Flex gap={2}>
                {isEditing && canUpdate && (
                  <Button
                    type="button"
                    variant="danger-light"
                    onClick={() => setShowConfirmDialog(true)}
                    name="delete"
                    disabled={!canUpdate || isEditFolderLoading}
                  >
                    {formatMessage({
                      id: getTrad('modal.folder.create.delete'),
                      defaultMessage: 'Delete folder',
                    })}
                  </Button>
                )}

                <Button
                  name="submit"
                  loading={isEditFolderLoading}
                  disabled={formDisabled}
                  type="submit"
                >
                  {formatMessage(
                    isEditing
                      ? { id: getTrad('modal.folder.edit.submit'), defaultMessage: 'Save' }
                      : { id: getTrad('modal.folder.create.submit'), defaultMessage: 'Create' }
                  )}
                </Button>
              </Flex>
            </Modal.Footer>
          </Form>
        )}
      </Formik>
      <RemoveFolderDialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleDelete}
      />
    </>
  );
};

EditFolderContent.defaultProps = {
  folder: undefined,
  location: undefined,
  parentFolderId: null,
};

EditFolderContent.propTypes = {
  folder: FolderDefinition,
  location: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  parentFolderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export const EditFolderDialog = ({ open, onClose, ...restProps }) => {
  return (
    <Modal.Root open={open} onOpenChange={onClose}>
      <Modal.Content>
        <EditFolderContent {...restProps} onClose={onClose} />
      </Modal.Content>
    </Modal.Root>
  );
};

EditFolderDialog.defaultProps = {
  folder: undefined,
  location: undefined,
  parentFolderId: null,
};

EditFolderDialog.propTypes = {
  folder: FolderDefinition,
  location: PropTypes.string,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  parentFolderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

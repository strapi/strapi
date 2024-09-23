/**
 *
 * EditAssetDialog
 *
 */

import React, { useRef, useState } from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';
import {
  Button,
  Field,
  Flex,
  Grid,
  Loader,
  Modal,
  TextInput,
  VisuallyHidden,
} from '@strapi/design-system';
import { Form, Formik } from 'formik';
import isEqual from 'lodash/isEqual';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';
import * as yup from 'yup';

import { AssetDefinition } from '../../constants';
import { useEditAsset } from '../../hooks/useEditAsset';
import { useFolderStructure } from '../../hooks/useFolderStructure';
import { findRecursiveFolderByValue, getTrad, getFileExtension } from '../../utils';
import formatBytes from '../../utils/formatBytes';
import { ContextInfo } from '../ContextInfo';
import SelectTree from '../SelectTree';

import { DialogHeader } from './DialogHeader';
import { PreviewBox } from './PreviewBox';
import { ReplaceMediaButton } from './ReplaceMediaButton';

const LoadingBody = styled(Flex)`
  /* 80px are coming from the Tabs component that is not included in the ModalBody */
  min-height: ${() => `calc(60vh + 8rem)`};
`;

const fileInfoSchema = yup.object({
  name: yup.string().required(),
  alternativeText: yup.string(),
  caption: yup.string(),
  folder: yup.number(),
});

export const EditAssetContent = ({
  onClose,
  asset,
  canUpdate,
  canCopyLink,
  canDownload,
  trackedLocation,
}) => {
  const { formatMessage, formatDate } = useIntl();
  const { trackUsage } = useTracking();
  const submitButtonRef = useRef(null);
  const [isCropping, setIsCropping] = useState(false);
  const [replacementFile, setReplacementFile] = useState();
  const { editAsset, isLoading } = useEditAsset();

  const { data: folderStructure, isLoading: folderStructureIsLoading } = useFolderStructure({
    enabled: true,
  });

  const handleSubmit = async (values) => {
    const nextAsset = { ...asset, ...values, folder: values.parent.value };

    if (asset.isLocal) {
      onClose(nextAsset);
    } else {
      const editedAsset = await editAsset(nextAsset, replacementFile);

      const assetType = asset?.mime.split('/')[0];
      // if the folder parent was the root of Media Library, its id is null
      // we know it changed location if the new parent value exists
      const didChangeLocation = asset?.folder?.id
        ? asset.folder.id !== values.parent.value
        : asset.folder === null && !!values.parent.value;

      trackUsage('didEditMediaLibraryElements', {
        location: trackedLocation,
        type: assetType,
        changeLocation: didChangeLocation,
      });

      onClose(editedAsset);
    }
  };

  const handleStartCropping = () => {
    setIsCropping(true);
  };

  const handleCancelCropping = () => {
    setIsCropping(false);
  };

  const handleFinishCropping = () => {
    setIsCropping(false);
    onClose();
  };

  const formDisabled = !canUpdate || isCropping;

  const handleConfirmClose = () => {
    // eslint-disable-next-line no-alert
    const confirm = window.confirm(
      formatMessage({
        id: 'window.confirm.close-modal.file',
        defaultMessage: 'Are you sure? Your changes will be lost.',
      })
    );

    if (confirm) {
      onClose();
    }
  };

  const activeFolderId = asset?.folder?.id;
  const initialFormData = !folderStructureIsLoading && {
    name: asset.name,
    alternativeText: asset.alternativeText ?? undefined,
    caption: asset.caption ?? undefined,
    parent: {
      value: activeFolderId ?? undefined,
      label:
        findRecursiveFolderByValue(folderStructure, activeFolderId)?.label ??
        folderStructure[0].label,
    },
  };

  const handleClose = (values) => {
    if (!isEqual(initialFormData, values)) {
      handleConfirmClose();
    } else {
      onClose();
    }
  };

  if (folderStructureIsLoading) {
    return (
      <>
        <DialogHeader />
        <LoadingBody minHeight="60vh" justifyContent="center" paddingTop={4} paddingBottom={4}>
          <Loader>
            {formatMessage({
              id: getTrad('content.isLoading'),
              defaultMessage: 'Content is loading.',
            })}
          </Loader>
        </LoadingBody>
        <Modal.Footer>
          <Button onClick={() => handleClose()} variant="tertiary">
            {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
          </Button>
        </Modal.Footer>
      </>
    );
  }

  return (
    <Formik
      validationSchema={fileInfoSchema}
      validateOnChange={false}
      onSubmit={handleSubmit}
      initialValues={initialFormData}
    >
      {({ values, errors, handleChange, setFieldValue }) => (
        <>
          <DialogHeader />
          <Modal.Body>
            <Grid.Root gap={4}>
              <Grid.Item xs={12} col={6} direction="column" alignItems="stretch">
                <PreviewBox
                  asset={asset}
                  canUpdate={canUpdate}
                  canCopyLink={canCopyLink}
                  canDownload={canDownload}
                  onDelete={onClose}
                  onCropFinish={handleFinishCropping}
                  onCropStart={handleStartCropping}
                  onCropCancel={handleCancelCropping}
                  replacementFile={replacementFile}
                  trackedLocation={trackedLocation}
                />
              </Grid.Item>
              <Grid.Item xs={12} col={6} direction="column" alignItems="stretch">
                <Form noValidate>
                  <Flex direction="column" alignItems="stretch" gap={3}>
                    <ContextInfo
                      blocks={[
                        {
                          label: formatMessage({
                            id: getTrad('modal.file-details.size'),
                            defaultMessage: 'Size',
                          }),
                          value: formatBytes(asset.size),
                        },

                        {
                          label: formatMessage({
                            id: getTrad('modal.file-details.dimensions'),
                            defaultMessage: 'Dimensions',
                          }),
                          value:
                            asset.height && asset.width ? `${asset.width}✕${asset.height}` : null,
                        },

                        {
                          label: formatMessage({
                            id: getTrad('modal.file-details.date'),
                            defaultMessage: 'Date',
                          }),
                          value: formatDate(new Date(asset.createdAt)),
                        },

                        {
                          label: formatMessage({
                            id: getTrad('modal.file-details.extension'),
                            defaultMessage: 'Extension',
                          }),
                          value: getFileExtension(asset.ext),
                        },

                        {
                          label: formatMessage({
                            id: getTrad('modal.file-details.id'),
                            defaultMessage: 'Asset ID',
                          }),
                          value: asset.id,
                        },
                      ]}
                    />
                    <Field.Root name="name" error={errors.name}>
                      <Field.Label>
                        {formatMessage({
                          id: getTrad('form.input.label.file-name'),
                          defaultMessage: 'File name',
                        })}
                      </Field.Label>
                      <TextInput
                        value={values.name}
                        onChange={handleChange}
                        disabled={formDisabled}
                      />
                      <Field.Error />
                    </Field.Root>

                    <Field.Root
                      name="alternativeText"
                      hint={formatMessage({
                        id: getTrad('form.input.decription.file-alt'),
                        defaultMessage: 'This text will be displayed if the asset can’t be shown.',
                      })}
                      error={errors.alternativeText}
                    >
                      <Field.Label>
                        {formatMessage({
                          id: getTrad('form.input.label.file-alt'),
                          defaultMessage: 'Alternative text',
                        })}
                      </Field.Label>
                      <TextInput
                        value={values.alternativeText}
                        onChange={handleChange}
                        disabled={formDisabled}
                      />
                      <Field.Hint />
                      <Field.Error />
                    </Field.Root>

                    <Field.Root name="caption" error={errors.caption}>
                      <Field.Label>
                        {formatMessage({
                          id: getTrad('form.input.label.file-caption'),
                          defaultMessage: 'Caption',
                        })}
                      </Field.Label>
                      <TextInput
                        value={values.caption}
                        onChange={handleChange}
                        disabled={formDisabled}
                      />
                    </Field.Root>

                    <Flex direction="column" alignItems="stretch" gap={1}>
                      <Field.Root name="parent" id="asset-folder">
                        <Field.Label>
                          {formatMessage({
                            id: getTrad('form.input.label.file-location'),
                            defaultMessage: 'Location',
                          })}
                        </Field.Label>

                        <SelectTree
                          name="parent"
                          defaultValue={values.parent}
                          options={folderStructure}
                          onChange={(value) => {
                            setFieldValue('parent', value);
                          }}
                          menuPortalTarget={document.querySelector('body')}
                          inputId="asset-folder"
                          isDisabled={formDisabled}
                          error={errors?.parent}
                          ariaErrorMessage="folder-parent-error"
                        />
                      </Field.Root>
                    </Flex>
                  </Flex>

                  <VisuallyHidden>
                    <button
                      type="submit"
                      tabIndex={-1}
                      ref={submitButtonRef}
                      disabled={formDisabled}
                    >
                      {formatMessage({ id: 'submit', defaultMessage: 'Submit' })}
                    </button>
                  </VisuallyHidden>
                </Form>
              </Grid.Item>
            </Grid.Root>
          </Modal.Body>
          <Modal.Footer>
            <Button onClick={() => handleClose(values)} variant="tertiary">
              {formatMessage({ id: 'global.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Flex gap={2}>
              <ReplaceMediaButton
                onSelectMedia={setReplacementFile}
                acceptedMime={asset.mime}
                disabled={formDisabled}
                trackedLocation={trackedLocation}
              />

              <Button
                onClick={() => submitButtonRef.current.click()}
                loading={isLoading}
                disabled={formDisabled}
              >
                {formatMessage({ id: 'global.finish', defaultMessage: 'Finish' })}
              </Button>
            </Flex>
          </Modal.Footer>
        </>
      )}
    </Formik>
  );
};

EditAssetContent.defaultProps = {
  asset: {},
  trackedLocation: undefined,
  canUpdate: false,
  canCopyLink: false,
  canDownload: false,
};

EditAssetContent.propTypes = {
  asset: AssetDefinition,
  canUpdate: PropTypes.bool,
  canCopyLink: PropTypes.bool,
  canDownload: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};

export const EditAssetDialog = ({ open, onClose, ...restProps }) => {
  return (
    <Modal.Root open={open} onOpenChange={onClose}>
      <Modal.Content>
        <EditAssetContent onClose={onClose} {...restProps} />
      </Modal.Content>
    </Modal.Root>
  );
};

EditAssetDialog.defaultProps = {
  asset: {},
  trackedLocation: undefined,
  canUpdate: false,
  canCopyLink: false,
  canDownload: false,
};

EditAssetDialog.propTypes = {
  asset: AssetDefinition,
  canUpdate: PropTypes.bool,
  canCopyLink: PropTypes.bool,
  canDownload: PropTypes.bool,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};

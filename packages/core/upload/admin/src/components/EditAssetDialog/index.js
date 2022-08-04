/**
 *
 * EditAssetDialog
 *
 */

import PropTypes from 'prop-types';
import React, { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import isEqual from 'lodash/isEqual';
import styled from 'styled-components';
import { ModalLayout, ModalBody, ModalFooter } from '@strapi/design-system/ModalLayout';
import { Stack } from '@strapi/design-system/Stack';
import { Flex } from '@strapi/design-system/Flex';
import { Loader } from '@strapi/design-system/Loader';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Button } from '@strapi/design-system/Button';
import { FieldLabel } from '@strapi/design-system/Field';
import { TextInput } from '@strapi/design-system/TextInput';
import { getFileExtension, Form, pxToRem, useTracking } from '@strapi/helper-plugin';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { Formik } from 'formik';
import * as yup from 'yup';

import { DialogHeader } from './DialogHeader';
import { PreviewBox } from './PreviewBox';
import { ContextInfo } from '../ContextInfo';
import { AssetDefinition } from '../../constants';
import { getTrad, findRecursiveFolderByValue } from '../../utils';
import formatBytes from '../../utils/formatBytes';
import { useEditAsset } from '../../hooks/useEditAsset';
import { useFolderStructure } from '../../hooks/useFolderStructure';
import { ReplaceMediaButton } from './ReplaceMediaButton';
import SelectTree from '../SelectTree';

const LoadingBody = styled(Flex)`
  /* 80px are coming from the Tabs component that is not included in the ModalBody */
  min-height: ${() => `calc(60vh + ${pxToRem(80)})`};
`;

const fileInfoSchema = yup.object({
  name: yup.string().required(),
  alternativeText: yup.string(),
  caption: yup.string(),
  folder: yup.number(),
});

export const EditAssetDialog = ({
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

  const handleSubmit = async values => {
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

  const handleClose = values => {
    if (!isEqual(initialFormData, values)) {
      handleConfirmClose();
    } else {
      onClose();
    }
  };

  if (folderStructureIsLoading) {
    return (
      <ModalLayout onClose={() => handleClose()} labelledBy="title">
        <DialogHeader />
        <LoadingBody minHeight="60vh" justifyContent="center" paddingTop={4} paddingBottom={4}>
          <Loader>
            {formatMessage({
              id: getTrad('list.asset.load'),
              defaultMessage: 'Content is loading.',
            })}
          </Loader>
        </LoadingBody>
        <ModalFooter
          startActions={
            <Button onClick={() => handleClose()} variant="tertiary">
              {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
            </Button>
          }
        />
      </ModalLayout>
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
        <ModalLayout onClose={() => handleClose(values)} labelledBy="title">
          <DialogHeader />
          <ModalBody>
            <Grid gap={4}>
              <GridItem xs={12} col={6}>
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
              </GridItem>
              <GridItem xs={12} col={6}>
                <Form noValidate>
                  <Stack spacing={3}>
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
                      ]}
                    />

                    <TextInput
                      label={formatMessage({
                        id: getTrad('form.input.label.file-name'),
                        defaultMessage: 'File name',
                      })}
                      name="name"
                      value={values.name}
                      error={errors.name}
                      onChange={handleChange}
                      disabled={formDisabled}
                    />

                    <TextInput
                      label={formatMessage({
                        id: getTrad('form.input.label.file-alt'),
                        defaultMessage: 'Alternative text',
                      })}
                      name="alternativeText"
                      hint={formatMessage({
                        id: getTrad('form.input.decription.file-alt'),
                        defaultMessage: 'This text will be displayed if the asset can’t be shown.',
                      })}
                      value={values.alternativeText}
                      error={errors.alternativeText}
                      onChange={handleChange}
                      disabled={formDisabled}
                    />

                    <TextInput
                      label={formatMessage({
                        id: getTrad('form.input.label.file-caption'),
                        defaultMessage: 'Caption',
                      })}
                      name="caption"
                      value={values.caption}
                      error={errors.caption}
                      onChange={handleChange}
                      disabled={formDisabled}
                    />

                    <Stack spacing={1}>
                      <FieldLabel htmlFor="asset-folder">
                        {formatMessage({
                          id: getTrad('form.input.label.file-location'),
                          defaultMessage: 'Location',
                        })}
                      </FieldLabel>

                      <SelectTree
                        name="parent"
                        defaultValue={values.parent}
                        options={folderStructure}
                        onChange={value => {
                          setFieldValue('parent', value);
                        }}
                        menuPortalTarget={document.querySelector('body')}
                        inputId="asset-folder"
                        isDisabled={formDisabled}
                        error={errors?.parent}
                        ariaErrorMessage="folder-parent-error"
                      />
                    </Stack>
                  </Stack>

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
              </GridItem>
            </Grid>
          </ModalBody>
          <ModalFooter
            startActions={
              <Button onClick={() => handleClose(values)} variant="tertiary">
                {formatMessage({ id: 'global.cancel', defaultMessage: 'Cancel' })}
              </Button>
            }
            endActions={
              <>
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
              </>
            }
          />
        </ModalLayout>
      )}
    </Formik>
  );
};

EditAssetDialog.defaultProps = {
  trackedLocation: undefined,
};

EditAssetDialog.propTypes = {
  asset: AssetDefinition.isRequired,
  canUpdate: PropTypes.bool.isRequired,
  canCopyLink: PropTypes.bool.isRequired,
  canDownload: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};

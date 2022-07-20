/**
 *
 * EditAssetDialog
 *
 */

import PropTypes from 'prop-types';
import React, { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import isEqual from 'lodash/isEqual';
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@strapi/design-system/ModalLayout';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Button } from '@strapi/design-system/Button';
import { TextInput } from '@strapi/design-system/TextInput';
import { getFileExtension, Form } from '@strapi/helper-plugin';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { Formik } from 'formik';
import * as yup from 'yup';
import { PreviewBox } from './PreviewBox';
import { AssetMeta } from './AssetMeta';
import { getTrad } from '../../utils';
import formatBytes from '../../utils/formatBytes';
import { useEditAsset } from '../../hooks/useEditAsset';
import { ReplaceMediaButton } from './ReplaceMediaButton';
import { AssetDefinition } from '../../constants';

const fileInfoSchema = yup.object({
  name: yup.string().required(),
  alternativeText: yup.string(),
  caption: yup.string(),
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
  const submitButtonRef = useRef(null);
  const [isCropping, setIsCropping] = useState(false);
  const [replacementFile, setReplacementFile] = useState();
  const { editAsset, isLoading } = useEditAsset();

  const handleSubmit = async values => {
    if (asset.isLocal) {
      const nextAsset = { ...asset, ...values };

      onClose(nextAsset);
    } else {
      const editedAsset = await editAsset({ ...asset, ...values }, replacementFile);
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

  const initialFormData = {
    name: asset.name,
    alternativeText: asset.alternativeText || '',
    caption: asset.caption || '',
  };

  const handleClose = values => {
    if (!isEqual(initialFormData, values)) {
      handleConfirmClose();
    } else {
      onClose();
    }
  };

  return (
    <Formik
      validationSchema={fileInfoSchema}
      validateOnChange={false}
      onSubmit={handleSubmit}
      initialValues={initialFormData}
    >
      {({ values, errors, handleChange }) => (
        <ModalLayout onClose={() => handleClose(values)} labelledBy="title">
          <ModalHeader>
            <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
              {formatMessage({ id: 'global.details', defaultMessage: 'Details' })}
            </Typography>
          </ModalHeader>
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
                    <AssetMeta
                      size={formatBytes(asset.size)}
                      dimension={
                        asset.height && asset.width ? `${asset.width}✕${asset.height}` : ''
                      }
                      date={formatDate(new Date(asset.createdAt))}
                      extension={getFileExtension(asset.ext)}
                    />

                    <TextInput
                      size="S"
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
                      size="S"
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
                      size="S"
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

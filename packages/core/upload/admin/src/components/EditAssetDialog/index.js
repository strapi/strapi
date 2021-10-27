/**
 *
 * EditAssetDialog
 *
 */

import PropTypes from 'prop-types';
import React, { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@strapi/design-system/ModalLayout';
import { ButtonText } from '@strapi/design-system/Text';
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

const fileInfoSchema = yup.object({
  name: yup.string().required(),
  alternativeText: yup.string(),
  caption: yup.string(),
});

export const EditAssetDialog = ({ onClose, asset, canUpdate, canCopyLink, canDownload }) => {
  const { formatMessage, formatDate } = useIntl();
  const submitButtonRef = useRef(null);
  const [isCropping, setIsCropping] = useState(false);
  const [replacementFile, setReplacementFile] = useState();
  const { editAsset, isLoading } = useEditAsset();

  const handleSubmit = async values => {
    await editAsset({ ...asset, ...values }, replacementFile);
    onClose();
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

  return (
    <>
      <ModalLayout onClose={onClose} labelledBy="title">
        <ModalHeader>
          <ButtonText textColor="neutral800" as="h2" id="title">
            {formatMessage({ id: getTrad('modal.edit.title'), defaultMessage: 'Details' })}
          </ButtonText>
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
              />
            </GridItem>
            <GridItem xs={12} col={6}>
              <Formik
                validationSchema={fileInfoSchema}
                validateOnChange={false}
                onSubmit={handleSubmit}
                initialValues={{
                  name: asset.name,
                  alternativeText: asset.alternativeText || '',
                  caption: asset.caption || '',
                }}
              >
                {({ values, errors, handleChange }) => (
                  <Form noValidate>
                    <Stack size={3}>
                      <AssetMeta
                        size={formatBytes(asset.size)}
                        dimension={
                          asset.height && asset.width ? `${asset.height}✕${asset.width}` : ''
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
                          id: getTrad({ id: getTrad('form.input.decription.file-alt') }),
                          defaultMessage:
                            'This text will be displayed if the asset can’t be shown.',
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
                )}
              </Formik>
            </GridItem>
          </Grid>
        </ModalBody>
        <ModalFooter
          startActions={
            <Button onClick={onClose} variant="tertiary">
              {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
            </Button>
          }
          endActions={
            <>
              <ReplaceMediaButton
                onSelectMedia={setReplacementFile}
                acceptedMime={asset.mime}
                disabled={formDisabled}
              />

              <Button
                onClick={() => submitButtonRef.current.click()}
                loading={isLoading}
                disabled={formDisabled}
              >
                {formatMessage({ id: 'form.button.finish', defaultMessage: 'Finish' })}
              </Button>
            </>
          }
        />
      </ModalLayout>
    </>
  );
};

EditAssetDialog.propTypes = {
  asset: PropTypes.shape({
    id: PropTypes.number,
    height: PropTypes.number,
    width: PropTypes.number,
    size: PropTypes.number,
    createdAt: PropTypes.string,
    ext: PropTypes.string,
    mime: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string,
    alternativeText: PropTypes.string,
    caption: PropTypes.string,
  }).isRequired,
  canUpdate: PropTypes.bool.isRequired,
  canCopyLink: PropTypes.bool.isRequired,
  canDownload: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

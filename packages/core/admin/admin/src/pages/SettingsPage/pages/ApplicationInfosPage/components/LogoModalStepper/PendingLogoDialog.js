import React from 'react';

import { Box, Button, Flex, ModalFooter, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import ImageCardAsset from './ImageCardAsset';

const PendingLogoDialog = ({ onClose, asset, prev, next, goTo, setLocalImage, onChangeLogo }) => {
  const { formatMessage } = useIntl();

  const handleGoBack = () => {
    setLocalImage(undefined);
    goTo(prev);
  };

  const handleUpload = () => {
    onChangeLogo(asset);
    goTo(next);
  };

  return (
    <>
      <Box paddingLeft={8} paddingRight={8} paddingTop={6} paddingBottom={6}>
        <Flex justifyContent="space-between" paddingBottom={6}>
          <Flex direction="column" alignItems="flex-start">
            <Typography variant="pi" fontWeight="bold">
              {formatMessage({
                id: 'Settings.application.customization.modal.pending.title',
                defaultMessage: 'Logo ready to upload',
              })}
            </Typography>
            <Typography variant="pi" textColor="neutral500">
              {formatMessage({
                id: 'Settings.application.customization.modal.pending.subtitle',
                defaultMessage: 'Manage the chosen logo before uploading it',
              })}
            </Typography>
          </Flex>
          <Button onClick={handleGoBack} variant="secondary">
            {formatMessage({
              id: 'Settings.application.customization.modal.pending.choose-another',
              defaultMessage: 'Choose another logo',
            })}
          </Button>
        </Flex>
        <Box maxWidth={pxToRem(180)}>{asset.url ? <ImageCardAsset asset={asset} /> : null}</Box>
      </Box>
      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({
              id: 'Settings.application.customization.modal.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
        endActions={
          <Button onClick={handleUpload}>
            {formatMessage({
              id: 'Settings.application.customization.modal.pending.upload',
              defaultMessage: 'Upload logo',
            })}
          </Button>
        }
      />
    </>
  );
};

PendingLogoDialog.defaultProps = {
  next: null,
  prev: null,
};

PendingLogoDialog.propTypes = {
  goTo: PropTypes.func.isRequired,
  asset: PropTypes.shape({
    name: PropTypes.string,
    url: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
    ext: PropTypes.string,
  }).isRequired,
  next: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onChangeLogo: PropTypes.func.isRequired,
  prev: PropTypes.string,
  setLocalImage: PropTypes.func.isRequired,
};

export default PendingLogoDialog;

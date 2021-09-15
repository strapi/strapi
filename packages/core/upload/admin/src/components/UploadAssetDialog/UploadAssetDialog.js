import React from 'react';
import PropTypes from 'prop-types';
import { ModalLayout } from '@strapi/parts/ModalLayout';
import { AddAssetStep } from './AddAssetStep/AddAssetStep';
import { PendingAssetStep } from './PendingAssetStep/PendingAssetStep';

export const UploadAssetDialog = ({ onSuccess, onClose }) => {
  return (
    <ModalLayout onClose={onClose} labelledBy="title">
      {/* <AddAssetStep onClose={onClose} /> */}
      <PendingAssetStep onClose={onClose} />
    </ModalLayout>
  );
};

UploadAssetDialog.propTypes = {
  onSuccess: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

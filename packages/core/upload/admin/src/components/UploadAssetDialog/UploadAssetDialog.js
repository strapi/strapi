import React, { useState } from 'react';

import { ModalLayout } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { AssetDefinition } from '../../constants';
import { EditAssetDialog } from '../EditAssetDialog';

import { AddAssetStep } from './AddAssetStep/AddAssetStep';
import { PendingAssetStep } from './PendingAssetStep/PendingAssetStep';

const Steps = {
  AddAsset: 'AddAsset',
  PendingAsset: 'PendingAsset',
};

export const UploadAssetDialog = ({
  initialAssetsToAdd,
  folderId,
  onClose,
  addUploadedFiles,
  trackedLocation,
  validateAssetsTypes = (_, cb) => cb(),
}) => {
  const { formatMessage } = useIntl();
  const [step, setStep] = useState(initialAssetsToAdd ? Steps.PendingAsset : Steps.AddAsset);
  const [assets, setAssets] = useState(initialAssetsToAdd || []);
  const [assetToEdit, setAssetToEdit] = useState(undefined);

  const handleAddToPendingAssets = (nextAssets) => {
    validateAssetsTypes(nextAssets, () => {
      setAssets((prevAssets) => prevAssets.concat(nextAssets));
      setStep(Steps.PendingAsset);
    });
  };

  const moveToAddAsset = () => {
    setStep(Steps.AddAsset);
  };

  const handleCancelUpload = (file) => {
    const nextAssets = assets.filter((asset) => asset.rawFile !== file);
    setAssets(nextAssets);

    // When there's no asset, transition to the AddAsset step
    if (nextAssets.length === 0) {
      moveToAddAsset();
    }
  };

  const handleUploadSuccess = (file) => {
    const nextAssets = assets.filter((asset) => asset.rawFile !== file);
    setAssets(nextAssets);

    if (nextAssets.length === 0) {
      onClose();
    }
  };

  const handleAssetEditValidation = (nextAsset) => {
    if (nextAsset) {
      const nextAssets = assets.map((asset) => (asset === assetToEdit ? nextAsset : asset));
      setAssets(nextAssets);
    }

    setAssetToEdit(undefined);
  };

  const handleClose = () => {
    if (step === Steps.PendingAsset && assets.length > 0) {
      // eslint-disable-next-line no-alert
      const confirm = window.confirm(
        formatMessage({
          id: 'window.confirm.close-modal.files',
          defaultMessage: 'Are you sure? You have some files that have not been uploaded yet.',
        })
      );

      if (confirm) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleRemoveAsset = (assetToRemove) => {
    const nextAssets = assets.filter((asset) => asset !== assetToRemove);
    setAssets(nextAssets);
  };

  return (
    <ModalLayout onClose={handleClose} labelledBy="title">
      {step === Steps.AddAsset && (
        <AddAssetStep
          onClose={onClose}
          onAddAsset={handleAddToPendingAssets}
          trackedLocation={trackedLocation}
        />
      )}

      {step === Steps.PendingAsset && (
        <PendingAssetStep
          onClose={handleClose}
          assets={assets}
          onEditAsset={setAssetToEdit}
          onRemoveAsset={handleRemoveAsset}
          onClickAddAsset={moveToAddAsset}
          onCancelUpload={handleCancelUpload}
          onUploadSucceed={handleUploadSuccess}
          initialAssetsToAdd={initialAssetsToAdd}
          addUploadedFiles={addUploadedFiles}
          folderId={folderId}
          trackedLocation={trackedLocation}
        />
      )}

      {assetToEdit && (
        <EditAssetDialog
          onClose={handleAssetEditValidation}
          asset={assetToEdit}
          canUpdate
          canCopyLink={false}
          canDownload={false}
          trackedLocation={trackedLocation}
        />
      )}
    </ModalLayout>
  );
};

UploadAssetDialog.defaultProps = {
  addUploadedFiles: undefined,
  folderId: null,
  initialAssetsToAdd: undefined,
  trackedLocation: undefined,
  validateAssetsTypes: undefined,
};

UploadAssetDialog.propTypes = {
  addUploadedFiles: PropTypes.func,
  folderId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  initialAssetsToAdd: PropTypes.arrayOf(AssetDefinition),
  onClose: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
  validateAssetsTypes: PropTypes.func,
};

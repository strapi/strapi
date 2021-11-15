import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ModalLayout } from '@strapi/design-system/ModalLayout';
import { AddAssetStep } from './AddAssetStep/AddAssetStep';
import { PendingAssetStep } from './PendingAssetStep/PendingAssetStep';
import { AssetDefinition } from '../../constants';

const Steps = {
  AddAsset: 'AddAsset',
  PendingAsset: 'PendingAsset',
};

export const UploadAssetDialog = ({
  initialAssetsToAdd,
  onClose,
  addUploadedFiles,
  trackedLocation,
}) => {
  const [step, setStep] = useState(initialAssetsToAdd ? Steps.PendingAsset : Steps.AddAsset);
  const [assets, setAssets] = useState(initialAssetsToAdd || []);

  const handleAddToPendingAssets = nextAssets => {
    setAssets(prevAssets => prevAssets.concat(nextAssets));
    setStep(Steps.PendingAsset);
  };

  const moveToAddAsset = () => {
    setStep(Steps.AddAsset);
  };

  const handleCancelUpload = file => {
    const nextAssets = assets.filter(asset => asset.rawFile !== file);
    setAssets(nextAssets);

    // When there's no asset, transition to the AddAsset step
    if (nextAssets.length === 0) {
      moveToAddAsset();
    }
  };

  const handleUploadSuccess = file => {
    const nextAssets = assets.filter(asset => asset.rawFile !== file);
    setAssets(nextAssets);

    if (nextAssets.length === 0) {
      onClose();
    }
  };

  return (
    <ModalLayout onClose={onClose} labelledBy="title">
      {step === Steps.AddAsset && (
        <AddAssetStep
          onClose={onClose}
          onAddAsset={handleAddToPendingAssets}
          trackedLocation={trackedLocation}
        />
      )}
      {step === Steps.PendingAsset && (
        <PendingAssetStep
          onClose={onClose}
          assets={assets}
          onClickAddAsset={moveToAddAsset}
          onCancelUpload={handleCancelUpload}
          onUploadSucceed={handleUploadSuccess}
          initialAssetsToAdd={initialAssetsToAdd}
          addUploadedFiles={addUploadedFiles}
        />
      )}
    </ModalLayout>
  );
};

UploadAssetDialog.defaultProps = {
  addUploadedFiles: undefined,
  initialAssetsToAdd: undefined,
  trackedLocation: undefined,
};

UploadAssetDialog.propTypes = {
  addUploadedFiles: PropTypes.func,
  initialAssetsToAdd: PropTypes.arrayOf(AssetDefinition),
  onClose: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};

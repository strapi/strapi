import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { AssetDialog } from '../AssetDialog';
import { UploadAssetDialog } from '../UploadAssetDialog/UploadAssetDialog';

const STEPS = {
  AssetSelect: 'SelectAsset',
  AssetUpload: 'UploadAsset',
  FolderCreate: 'FolderCreate',
};

export const MediaLibraryDialog = ({ onClose, onSelectAssets, allowedTypes }) => {
  const [step, setStep] = useState(STEPS.AssetSelect);

  if (step === STEPS.AssetSelect) {
    return (
      <AssetDialog
        allowedTypes={allowedTypes}
        onClose={onClose}
        onValidate={onSelectAssets}
        onAddAsset={() => setStep(STEPS.AssetUpload)}
        onAddFolder={() => setStep(STEPS.FolderCreate)}
        multiple
      />
    );
  }

  if (step === STEPS.FolderCreate) {
    return null;
  }

  return <UploadAssetDialog onClose={() => setStep(STEPS.AssetSelect)} />;
};

MediaLibraryDialog.defaultProps = {
  allowedTypes: ['files', 'images', 'videos', 'audios'],
};

MediaLibraryDialog.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  onClose: PropTypes.func.isRequired,
  onSelectAssets: PropTypes.func.isRequired,
};

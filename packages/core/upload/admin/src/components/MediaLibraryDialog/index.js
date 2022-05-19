import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { AssetDialog } from '../AssetDialog';
import { EditFolderDialog } from '../EditFolderDialog';
import { UploadAssetDialog } from '../UploadAssetDialog/UploadAssetDialog';

const STEPS = {
  AssetSelect: 'SelectAsset',
  AssetUpload: 'UploadAsset',
  FolderCreate: 'FolderCreate',
};

export const MediaLibraryDialog = ({ onClose, onSelectAssets, allowedTypes }) => {
  const [step, setStep] = useState(STEPS.AssetSelect);

  switch (step) {
    case STEPS.AssetSelect:
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

    case STEPS.FolderCreate:
      return <EditFolderDialog onClose={() => setStep(STEPS.AssetSelect)} />;

    default:
      return <UploadAssetDialog onClose={() => setStep(STEPS.AssetSelect)} />;
  }
};

MediaLibraryDialog.defaultProps = {
  allowedTypes: ['files', 'images', 'videos', 'audios'],
};

MediaLibraryDialog.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  onClose: PropTypes.func.isRequired,
  onSelectAssets: PropTypes.func.isRequired,
};

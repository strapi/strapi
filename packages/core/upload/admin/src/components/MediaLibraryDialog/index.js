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
  const [folderId, setFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState(undefined);

  switch (step) {
    case STEPS.AssetSelect:
      return (
        <AssetDialog
          allowedTypes={allowedTypes}
          folderId={folderId}
          folderPath={folderPath}
          onClose={() => {
            setStep(undefined);
            setFolderId(null);
            setFolderPath(undefined);
            onClose();
          }}
          onValidate={onSelectAssets}
          onAddAsset={() => setStep(STEPS.AssetUpload)}
          onAddFolder={() => setStep(STEPS.FolderCreate)}
          onChangeFolder={(folderId, folderPath) => {
            setFolderId(folderId);
            setFolderPath(folderPath);
          }}
          multiple
        />
      );

    case STEPS.FolderCreate:
      return (
        <EditFolderDialog onClose={() => setStep(STEPS.AssetSelect)} parentFolderId={folderId} />
      );

    default:
      return <UploadAssetDialog onClose={() => setStep(STEPS.AssetSelect)} folderId={folderId} />;
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

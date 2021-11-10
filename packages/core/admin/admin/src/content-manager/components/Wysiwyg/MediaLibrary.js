import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useLibrary } from '@strapi/helper-plugin';

const Steps = {
  SelectAsset: 'SelectAsset',
  UploadAsset: 'UploadAsset',
};

const MediaLibrary = ({ onClose, onSelectAssets }) => {
  const { components } = useLibrary();
  const [step, setStep] = useState(Steps.SelectAsset);

  const AssetDialog = components.AssetDialog;
  const UploadAssetDialog = components.UploadAssetDialog;

  if (step === Steps.SelectAsset) {
    return (
      <AssetDialog
        allowedTypes={['files', 'images', 'videos']}
        onClose={onClose}
        onValidate={onSelectAssets}
        onAddAsset={() => setStep(Steps.UploadAsset)}
        multiple
      />
    );
  }

  return <UploadAssetDialog onClose={() => setStep(Steps.SelectAsset)} />;
};

MediaLibrary.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSelectAssets: PropTypes.func.isRequired,
};

export default MediaLibrary;

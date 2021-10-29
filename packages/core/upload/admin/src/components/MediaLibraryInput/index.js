import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { AssetDialog } from './AssetDialog';
import { AssetDefinition } from '../../constants';
import { CarouselAssets } from './Carousel/CarouselAssets';
import { UploadAssetDialog } from '../UploadAssetDialog/UploadAssetDialog';
import { useMediaLibraryPermissions } from '../../hooks/useMediaLibraryPermissions';

const Steps = {
  SelectAsset: 'SelectAsset',
  UploadAsset: 'UploadAsset',
};

export const MediaLibraryInput = ({
  intlLabel,
  description,
  disabled,
  error,
  multiple,
  name,
  onChange,
  value,
}) => {
  const [step, setStep] = useState(undefined);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [droppedAssets, setDroppedAssets] = useState();
  const {
    isLoading,
    // canRead,
    canCreate,
    canUpdate,
    canCopyLink,
    canDownload,
  } = useMediaLibraryPermissions();
  const { formatMessage } = useIntl();

  const canRead = false;

  const selectedAssets = Array.isArray(value) ? value : [value];

  const handleValidation = nextSelectedAssets => {
    onChange({
      target: { name, value: multiple ? nextSelectedAssets : nextSelectedAssets[0] },
    });
    setStep(undefined);
  };

  const handleDeleteAsset = asset => {
    const nextSelectedAssets = selectedAssets.filter(prevAsset => prevAsset.id !== asset.id);

    onChange({
      target: { name, value: multiple ? nextSelectedAssets : nextSelectedAssets[0] },
    });

    setSelectedIndex(0);
  };

  const handleAssetEdit = asset => {
    const nextSelectedAssets = selectedAssets.map(prevAsset =>
      prevAsset.id === asset.id ? asset : prevAsset
    );

    onChange({
      target: { name, value: multiple ? nextSelectedAssets : nextSelectedAssets[0] },
    });
  };

  const handleAssetDrop = assets => {
    setDroppedAssets(assets);
    setStep(Steps.UploadAsset);
  };

  let label = intlLabel.id ? formatMessage(intlLabel) : '';

  if (multiple && selectedAssets.length > 0) {
    label = `${label} (${selectedIndex + 1} / ${selectedAssets.length})`;
  }

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';

  return (
    <>
      <CarouselAssets
        assets={selectedAssets}
        disabled={disabled}
        label={label}
        error={errorMessage}
        hint={hint}
        isLoading={isLoading}
        canRead={canRead}
        canCopyLink={canCopyLink}
        canDownload={canDownload}
        onDeleteAsset={canUpdate ? handleDeleteAsset : undefined}
        onEditAsset={canUpdate ? handleAssetEdit : undefined}
        onAddAsset={() => setStep(Steps.SelectAsset)}
        onDropAsset={canCreate ? handleAssetDrop : undefined}
      />

      {step === Steps.SelectAsset && (
        <AssetDialog
          initiallySelectedAssets={selectedAssets}
          onClose={() => setStep(undefined)}
          onValidate={handleValidation}
          multiple={multiple}
          onAddAsset={() => setStep(Steps.UploadAsset)}
          canRead={canRead}
          canCreate={canCreate}
        />
      )}

      {step === Steps.UploadAsset && (
        <UploadAssetDialog
          onClose={() => setStep(Steps.SelectAsset)}
          initialAssetsToAdd={droppedAssets}
        />
      )}
    </>
  );
};

MediaLibraryInput.defaultProps = {
  disabled: false,
  description: undefined,
  error: undefined,
  intlLabel: undefined,
  multiple: false,
  value: [],
};

MediaLibraryInput.propTypes = {
  disabled: PropTypes.bool,
  description: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.shape({}),
  }),
  error: PropTypes.shape({ id: PropTypes.string, defaultMessage: PropTypes.string }),
  intlLabel: PropTypes.shape({ id: PropTypes.string, defaultMessage: PropTypes.string }),
  multiple: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.arrayOf(AssetDefinition), AssetDefinition]),
};

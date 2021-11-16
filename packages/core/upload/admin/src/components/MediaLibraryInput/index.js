import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { AssetDialog } from '../AssetDialog';
import { AssetDefinition } from '../../constants';
import { CarouselAssets } from './Carousel/CarouselAssets';
import { UploadAssetDialog } from '../UploadAssetDialog/UploadAssetDialog';
import getAllowedFiles from '../../utils/getAllowedFiles';

const Steps = {
  SelectAsset: 'SelectAsset',
  UploadAsset: 'UploadAsset',
};

export const MediaLibraryInput = ({
  attribute: { allowedTypes },
  intlLabel,
  description,
  disabled,
  error,
  multiple,
  name,
  onChange,
  value,
}) => {
  const fieldAllowedTypes = allowedTypes || ['files', 'images', 'videos'];
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [step, setStep] = useState(undefined);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [droppedAssets, setDroppedAssets] = useState();
  const { formatMessage } = useIntl();

  useEffect(() => {
    // Clear the uploaded files on close
    if (step === undefined) {
      setUploadedFiles([]);
    }
  }, [step]);

  const selectedAssets = Array.isArray(value) ? value : [value];

  const handleValidation = nextSelectedAssets => {
    onChange({
      target: { name, value: multiple ? nextSelectedAssets : nextSelectedAssets[0] },
    });
    setStep(undefined);
  };

  const handleDeleteAssetFromMediaLibrary = () => {
    let nextValue;

    if (multiple) {
      const nextSelectedAssets = selectedAssets.filter(
        (_, assetIndex) => assetIndex !== selectedIndex
      );
      nextValue = nextSelectedAssets.length > 0 ? nextSelectedAssets : null;
    } else {
      nextValue = null;
    }

    onChange({
      target: { name, value: nextValue },
    });

    setSelectedIndex(0);
  };

  const handleDeleteAsset = asset => {
    let nextValue;

    if (multiple) {
      const nextSelectedAssets = selectedAssets.filter(prevAsset => prevAsset.id !== asset.id);

      nextValue = nextSelectedAssets.length > 0 ? nextSelectedAssets : null;
    } else {
      nextValue = null;
    }

    onChange({
      target: { name, value: nextValue },
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

  const handleNext = () => {
    setSelectedIndex(current => (current < selectedAssets.length - 1 ? current + 1 : 0));
  };

  const handlePrevious = () => {
    setSelectedIndex(current => (current > 0 ? current - 1 : selectedAssets.length - 1));
  };

  const handleFilesUploadSucceeded = uploadedFiles => {
    setUploadedFiles(prev => [...prev, ...uploadedFiles]);
  };

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';

  let initiallySelectedAssets = selectedAssets;

  if (uploadedFiles.length > 0) {
    const allowedUploadedFiles = getAllowedFiles(fieldAllowedTypes, uploadedFiles);

    initiallySelectedAssets = multiple
      ? [...allowedUploadedFiles, ...selectedAssets]
      : [allowedUploadedFiles[0]];
  }

  return (
    <>
      <CarouselAssets
        assets={selectedAssets}
        disabled={disabled}
        label={label}
        onDeleteAsset={handleDeleteAsset}
        onDeleteAssetFromMediaLibrary={handleDeleteAssetFromMediaLibrary}
        onAddAsset={() => setStep(Steps.SelectAsset)}
        onDropAsset={handleAssetDrop}
        onEditAsset={handleAssetEdit}
        onNext={handleNext}
        onPrevious={handlePrevious}
        error={errorMessage}
        hint={hint}
        selectedAssetIndex={selectedIndex}
        trackedLocation="content-manager"
      />

      {step === Steps.SelectAsset && (
        <AssetDialog
          allowedTypes={fieldAllowedTypes}
          initiallySelectedAssets={initiallySelectedAssets}
          onClose={() => setStep(undefined)}
          onValidate={handleValidation}
          multiple={multiple}
          onAddAsset={() => setStep(Steps.UploadAsset)}
          trackedLocation="content-manager"
        />
      )}

      {step === Steps.UploadAsset && (
        <UploadAssetDialog
          onClose={() => setStep(Steps.SelectAsset)}
          initialAssetsToAdd={droppedAssets}
          addUploadedFiles={handleFilesUploadSucceeded}
          trackedLocation="content-manager"
        />
      )}
    </>
  );
};

MediaLibraryInput.defaultProps = {
  attribute: { allowedTypes: ['videos', 'files', 'images'] },
  disabled: false,
  description: undefined,
  error: undefined,
  intlLabel: undefined,
  multiple: false,
  value: [],
};

MediaLibraryInput.propTypes = {
  attribute: PropTypes.shape({ allowedTypes: PropTypes.arrayOf(PropTypes.string) }),
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

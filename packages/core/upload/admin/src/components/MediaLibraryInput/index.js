import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { AssetDialog } from './AssetDialog';
import { AssetDefinition } from '../../constants';
import { CarouselAssets } from './Carousel/CarouselAssets';

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const { formatMessage } = useIntl();

  const selectedAssets = Array.isArray(value) ? value : [value];

  const handleValidation = nextSelectedAssets => {
    onChange({
      target: { name, value: multiple ? nextSelectedAssets : nextSelectedAssets[0] },
    });
    setIsAssetDialogOpen(false);
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
        onDeleteAsset={handleDeleteAsset}
        onAddAsset={() => setIsAssetDialogOpen(true)}
        onEditAsset={handleAssetEdit}
        error={errorMessage}
        hint={hint}
      />

      {isAssetDialogOpen && (
        <AssetDialog
          initiallySelectedAssets={selectedAssets}
          onClose={() => setIsAssetDialogOpen(false)}
          onValidate={handleValidation}
          multiple={multiple}
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
  value: PropTypes.oneOfType(PropTypes.arrayOf(AssetDefinition), AssetDefinition),
};

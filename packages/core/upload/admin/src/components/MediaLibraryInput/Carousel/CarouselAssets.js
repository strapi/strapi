import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { CarouselInput, CarouselSlide } from '@strapi/design-system';
import getTrad from '../../../utils/getTrad';
import { AssetDefinition } from '../../../constants';
import { CarouselAssetActions } from './CarouselAssetActions';
import { CarouselAsset } from './CarouselAsset';
import { EmptyStateAsset } from './EmptyStateAsset';
import { EditAssetDialog } from '../../EditAssetDialog';

export const CarouselAssets = ({
  assets,
  disabled,
  error,
  hint,
  label,
  onAddAsset,
  onDeleteAsset,
  onDeleteAssetFromMediaLibrary,
  onDropAsset,
  onEditAsset,
  onNext,
  onPrevious,
  required,
  selectedAssetIndex,
  trackedLocation,
}) => {
  const { formatMessage } = useIntl();
  const [isEditingAsset, setIsEditingAsset] = useState(false);

  const currentAsset = assets[selectedAssetIndex];

  return (
    <>
      <CarouselInput
        label={label}
        secondaryLabel={currentAsset?.name}
        selectedSlide={selectedAssetIndex}
        previousLabel={formatMessage({
          id: getTrad('mediaLibraryInput.actions.previousSlide'),
          defaultMessage: 'Previous slide',
        })}
        nextLabel={formatMessage({
          id: getTrad('mediaLibraryInput.actions.nextSlide'),
          defaultMessage: 'Next slide',
        })}
        onNext={onNext}
        onPrevious={onPrevious}
        hint={hint}
        error={error}
        required={required}
        actions={
          currentAsset ? (
            <CarouselAssetActions
              asset={currentAsset}
              onDeleteAsset={disabled ? undefined : onDeleteAsset}
              onDeleteAssetFromMediaLibrary={onDeleteAssetFromMediaLibrary}
              onAddAsset={disabled ? undefined : onAddAsset}
              onEditAsset={onEditAsset ? () => setIsEditingAsset(true) : undefined}
            />
          ) : undefined
        }
      >
        {assets.length === 0 ? (
          <CarouselSlide
            label={formatMessage(
              { id: getTrad('mediaLibraryInput.slideCount'), defaultMessage: '{n} of {m} slides' },
              { n: 1, m: 1 }
            )}
          >
            <EmptyStateAsset disabled={disabled} onClick={onAddAsset} onDropAsset={onDropAsset} />
          </CarouselSlide>
        ) : (
          assets.map((asset, index) => (
            <CarouselSlide
              key={asset.id}
              label={formatMessage(
                {
                  id: getTrad('mediaLibraryInput.slideCount'),
                  defaultMessage: '{n} of {m} slides',
                },
                { n: index + 1, m: assets.length }
              )}
            >
              <CarouselAsset asset={asset} />
            </CarouselSlide>
          ))
        )}
      </CarouselInput>

      {isEditingAsset && (
        <EditAssetDialog
          onClose={(editedAsset) => {
            setIsEditingAsset(false);

            // The asset has been deleted
            if (editedAsset === null) {
              onDeleteAssetFromMediaLibrary();
            }

            if (editedAsset) {
              onEditAsset(editedAsset);
            }
          }}
          asset={currentAsset}
          canUpdate
          canCopyLink
          canDownload
          trackedLocation={trackedLocation}
        />
      )}
    </>
  );
};

CarouselAssets.defaultProps = {
  disabled: false,
  error: undefined,
  hint: undefined,
  onDropAsset: undefined,
  required: false,
  trackedLocation: undefined,
};

CarouselAssets.propTypes = {
  assets: PropTypes.arrayOf(AssetDefinition).isRequired,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  hint: PropTypes.string,
  label: PropTypes.string.isRequired,
  onAddAsset: PropTypes.func.isRequired,
  onDeleteAsset: PropTypes.func.isRequired,
  onDeleteAssetFromMediaLibrary: PropTypes.func.isRequired,
  onDropAsset: PropTypes.func,
  onEditAsset: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onPrevious: PropTypes.func.isRequired,
  required: PropTypes.bool,
  selectedAssetIndex: PropTypes.number.isRequired,
  trackedLocation: PropTypes.string,
};

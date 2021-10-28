import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Carousel, CarouselSlide } from '@strapi/parts/Carousel';
import getTrad from '../../utils/getTrad';
import { EmptyStateAsset } from './EmptyStateAsset';
import { AssetDialog } from './AssetDialog';
import { CarouselAsset } from './Carousel/CarouselAsset';
import { CarouselAssetActions } from './Carousel/CarouselAssetActions';
import { AssetDefinition } from '../../constants';

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
  const currentAsset = selectedAssets[selectedIndex];

  const handleNext = () => {
    setSelectedIndex(current => (current < selectedAssets.length - 1 ? current + 1 : 0));
  };

  const handlePrevious = () => {
    setSelectedIndex(current => (current > 0 ? current - 1 : selectedAssets.length - 1));
  };

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
      <Carousel
        label={label}
        selectedSlide={selectedIndex}
        previousLabel={formatMessage({
          id: getTrad('mediaLibraryInput.actions.previousSlide'),
          defaultMessage: 'Previous slide',
        })}
        nextLabel={formatMessage({
          id: getTrad('mediaLibraryInput.actions.nextSlide'),
          defaultMessage: 'Next slide',
        })}
        onNext={handleNext}
        onPrevious={handlePrevious}
        hint={hint}
        error={errorMessage}
        actions={
          currentAsset ? (
            <CarouselAssetActions
              asset={currentAsset}
              onDeleteAsset={handleDeleteAsset}
              onAddAsset={() => setIsAssetDialogOpen(true)}
              onEditAsset={handleAssetEdit}
            />
          ) : (
            undefined
          )
        }
      >
        {selectedAssets.length === 0 ? (
          <CarouselSlide
            label={formatMessage(
              { id: getTrad('mediaLibraryInput.slideCount'), defaultMessage: '{n} of {m} slides' },
              { n: 1, m: 1 }
            )}
          >
            <EmptyStateAsset disabled={disabled} onClick={() => setIsAssetDialogOpen(true)} />
          </CarouselSlide>
        ) : (
          selectedAssets.map((asset, index) => (
            <CarouselSlide
              key={asset.id}
              label={formatMessage(
                {
                  id: getTrad('mediaLibraryInput.slideCount'),
                  defaultMessage: '{n} of {m} slides',
                },
                { n: index + 1, m: selectedAssets.length }
              )}
            >
              <CarouselAsset asset={asset} />
            </CarouselSlide>
          ))
        )}
      </Carousel>

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

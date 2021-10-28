import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Carousel, CarouselSlide } from '@strapi/parts/Carousel';
import getTrad from '../../../utils/getTrad';
import { AssetDefinition } from '../../../constants';
import { CarouselAssetActions } from './CarouselAssetActions';
import { CarouselAsset } from './CarouselAsset';
import { EmptyStateAsset } from './EmptyStateAsset';

export const CarouselAssets = ({
  label,
  assets,
  error,
  hint,
  disabled,
  onDeleteAsset,
  onEditAsset,
  onAddAsset,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { formatMessage } = useIntl();

  const handleNext = () => {
    setSelectedIndex(current => (current < assets.length - 1 ? current + 1 : 0));
  };

  const handlePrevious = () => {
    setSelectedIndex(current => (current > 0 ? current - 1 : assets.length - 1));
  };

  const currentAsset = assets[selectedIndex];

  return (
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
      error={error}
      actions={
        currentAsset ? (
          <CarouselAssetActions
            asset={currentAsset}
            onDeleteAsset={onDeleteAsset}
            onAddAsset={onAddAsset}
            onEditAsset={onEditAsset}
          />
        ) : (
          undefined
        )
      }
    >
      {assets.length === 0 ? (
        <CarouselSlide
          label={formatMessage(
            { id: getTrad('mediaLibraryInput.slideCount'), defaultMessage: '{n} of {m} slides' },
            { n: 1, m: 1 }
          )}
        >
          <EmptyStateAsset disabled={disabled} onClick={onAddAsset} />
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
    </Carousel>
  );
};

CarouselAssets.defaultProps = {
  disabled: false,
  error: undefined,
  hint: undefined,
};
CarouselAssets.propTypes = {
  assets: PropTypes.arrayOf(AssetDefinition).isRequired,
  disabled: PropTypes.bool,
  label: PropTypes.string.isRequired,
  onDeleteAsset: PropTypes.func.isRequired,
  onAddAsset: PropTypes.func.isRequired,
  onEditAsset: PropTypes.func.isRequired,
  error: PropTypes.string,
  hint: PropTypes.string,
};

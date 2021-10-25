import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Carousel, CarouselSlide } from '@strapi/parts/Carousel';
import getTrad from '../../utils/getTrad';
import { EmptyInput } from './EmptyInput';

export const MediaLibraryInput = ({ intlLabel, description, disabled, error }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { formatMessage } = useIntl();

  const handleNext = () => {
    setSelectedIndex(current => (current < 2 ? current + 1 : 0));
  };

  const handlePrevious = () => {
    setSelectedIndex(current => (current > 0 ? current - 1 : 2));
  };

  return (
    <Carousel
      label={formatMessage(intlLabel)}
      selectedSlide={selectedIndex}
      previousLabel="Previous slide"
      nextLabel="Next slide"
      onNext={handleNext}
      onPrevious={handlePrevious}
      hint={description}
      error={error}
    >
      <CarouselSlide
        label={formatMessage(
          { id: getTrad('mediaLibraryInput.slideCount'), defaultMessage: '1 of 1 slides' },
          { n: 1, m: 1 }
        )}
      >
        <EmptyInput disabled={disabled} />
      </CarouselSlide>
    </Carousel>
  );
};

MediaLibraryInput.defaultProps = {
  disabled: false,
  description: undefined,
  error: undefined,
};

MediaLibraryInput.propTypes = {
  disabled: PropTypes.bool,
  description: PropTypes.string,
  error: PropTypes.string,
  intlLabel: PropTypes.shape({ id: PropTypes.string, defaultMessage: PropTypes.string }).isRequired,
};

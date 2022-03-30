import React from 'react';
import PropType from 'prop-types';
import { CarouselInput, CarouselSlide, CarouselActions } from '@strapi/design-system/CarouselInput';
import { IconButton } from '@strapi/design-system/IconButton';
import { Box } from '@strapi/design-system/Box';
import Plus from '@strapi/icons/Plus';

const LogoInput = ({ customLogo, defaultLogo }) => {
  return (
    <CarouselInput
      label="Logo"
      selectedSlide={0}
      hint="Change the admin panel logo (Max dimension: 750*750, Max file size: TBC)"
      previousLabel="Previous slide"
      nextLabel="Next slide"
      onNext={() => {}}
      onPrevious={() => {}}
      secondaryLabel={customLogo?.name || 'logo.png'}
      actions={
        <CarouselActions>
          <IconButton onClick={() => {}} label="Change logo" icon={<Plus />} />
        </CarouselActions>
      }
    >
      <CarouselSlide label="logo slide">
        <Box
          maxHeight="40%"
          maxWidth="40%"
          as="img"
          src={customLogo?.url || defaultLogo}
          alt="First"
        />
      </CarouselSlide>
    </CarouselInput>
  );
};

LogoInput.defaultProps = {
  customLogo: null,
};

LogoInput.propTypes = {
  customLogo: PropType.shape({
    url: PropType.string,
    name: PropType.string,
  }),
  defaultLogo: PropType.string.isRequired,
};

export default LogoInput;

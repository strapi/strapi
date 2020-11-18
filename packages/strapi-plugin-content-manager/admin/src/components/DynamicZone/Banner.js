/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import PropTypes from 'prop-types';
import { Carret } from '@buffetjs/icons';
import BannerWrapper from './BannerWrapper';

/* eslint-disable jsx-a11y/no-static-element-interactions */

const Banner = ({ category, isOpen, onClickToggle, isFirst }) => {
  return (
    <BannerWrapper type="button" isFirst={isFirst} isOpen={isOpen} onClick={onClickToggle}>
      <div className="img-wrapper">
        <Carret />
      </div>
      <div className="label">{category}</div>
    </BannerWrapper>
  );
};

Banner.defaultProps = {
  isFirst: false,
  isOpen: false,
  onClickToggle: () => {},
};

Banner.propTypes = {
  category: PropTypes.string.isRequired,
  isFirst: PropTypes.bool,
  isOpen: PropTypes.bool,
  onClickToggle: PropTypes.func,
};

Banner.displayName = 'Banner';

export default Banner;

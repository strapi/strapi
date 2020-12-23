/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import PropTypes from 'prop-types';
import { Carret } from '@buffetjs/icons';
import Wrapper from './Wrapper';

/* eslint-disable jsx-a11y/no-static-element-interactions */

const Banner = ({ category, isOpen, onToggle, isFirst }) => {
  const handleClick = () => {
    onToggle(category);
  };

  return (
    <Wrapper type="button" isFirst={isFirst} isOpen={isOpen} onClick={handleClick}>
      <div className="img-wrapper">
        <Carret />
      </div>
      <div className="label">{category}</div>
    </Wrapper>
  );
};

Banner.propTypes = {
  category: PropTypes.string.isRequired,
  isFirst: PropTypes.bool.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

Banner.displayName = 'Banner';

export default Banner;

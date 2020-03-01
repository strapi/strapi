import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';

import CardImgWrapper from '../CardImgWrapper';
import CardPreview from '../CardPreview';
import Wrapper from './Wrapper';
import Title from './Title';
import Description from './Description';

const Card = ({ abort, error, file, isSmall, isUploading, isSelected }) => {
  // TODO - adapt with the real data
  const { type, size, name } = file;

  return (
    <Wrapper>
      <div>
        <CardImgWrapper isSmall={isSmall} isSelected={isSelected}>
          <CardPreview {...file} />
          <div className="card-control-wrapper">
            <Checkbox name={`select-${name}`} />
          </div>
        </CardImgWrapper>
        <Title>{name}</Title>
        <Description>{`${type} - ${size}`}</Description>
      </div>
    </Wrapper>
  );
};

Card.defaultProps = {
  abort: () => {},
  error: '',
  file: null,
  isSelected: false,
  isSmall: false,
  isUploading: false,
};

Card.propTypes = {
  abort: PropTypes.func,
  error: PropTypes.string,
  file: PropTypes.object,
  isSelected: PropTypes.bool,
  isSmall: PropTypes.bool,
  isUploading: PropTypes.bool,
};

export default Card;

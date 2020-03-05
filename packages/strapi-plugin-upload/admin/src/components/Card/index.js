import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';

import CardImgWrapper from '../CardImgWrapper';
import CardPreview from '../CardPreview';
import Wrapper from './Wrapper';
import Title from './Title';
import Description from './Description';

const Card = ({ file, id, isSmall, isSelected, onChange }) => {
  // TODO - adapt with the real data
  const { type, size, name } = file;

  return (
    <Wrapper>
      <div>
        <CardImgWrapper isSmall={isSmall} isSelected={isSelected}>
          <CardPreview {...file} />
          <div className="card-control-wrapper">
            <Checkbox name={id} onChange={onChange} value={isSelected} />
          </div>
        </CardImgWrapper>
        <Title fontSize="md" fontWeight="bold" ellipsis color="">
          {name}
        </Title>
        <Description>{`${type} - ${size}`}</Description>
      </div>
    </Wrapper>
  );
};

Card.defaultProps = {
  file: null,
  isSelected: false,
  isSmall: false,
  onChange: () => {},
};

Card.propTypes = {
  id: PropTypes.string.isRequired,
  file: PropTypes.object,
  isSelected: PropTypes.bool,
  isSmall: PropTypes.bool,
  onChange: PropTypes.func,
};

export default Card;

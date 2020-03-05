import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';

import Text from '../Text';
import CardImgWrapper from '../CardImgWrapper';
import CardPreview from '../CardPreview';
import Wrapper from './Wrapper';
import Title from './Title';

const Card = ({ file, id, small, selected, onChange }) => {
  // TODO - adapt with the real data
  const { type, size, name } = file;

  return (
    <Wrapper>
      <div>
        <CardImgWrapper small={small} selected={selected}>
          <CardPreview {...file} />
          <div className="card-control-wrapper">
            <Checkbox name={id} onChange={onChange} value={selected} />
          </div>
        </CardImgWrapper>
        <Title fontSize="md" fontWeight="bold" ellipsis>
          {name}
        </Title>
        <Text color="grey" fontSize="xs" ellipsis>{`${type} - ${size}`}</Text>
      </div>
    </Wrapper>
  );
};

Card.defaultProps = {
  file: null,
  onChange: () => {},
  small: false,
  selected: false,
};

Card.propTypes = {
  id: PropTypes.string.isRequired,
  file: PropTypes.object,
  onChange: PropTypes.func,
  small: PropTypes.bool,
  selected: PropTypes.bool,
};

export default Card;

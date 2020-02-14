import React from 'react';
import PropTypes from 'prop-types';

import CardImgWrapper from '../CardImgWrapper';
import Wrapper from './Wrapper';
import Title from './Title';
import Description from './Description';

const Card = ({ abort, error, file, isSmall, isUploading }) => {
  const newFile = new File([''], 'img.png');
  console.log(newFile);

  return (
    <Wrapper>
      <div>
        <CardImgWrapper isSmall={isSmall}>
          <img />
        </CardImgWrapper>
        <Title>Ma photo</Title>
        <Description>Ma photo</Description>
      </div>
    </Wrapper>
  );
};

Card.defaultProps = {
  abort: () => {},
  error: '',
  file: null,
  isSmall: false,
  isUploading: false,
};

Card.propTypes = {
  abort: PropTypes.func,
  error: PropTypes.string,
  file: PropTypes.object,
  isSmall: PropTypes.bool,
  isUploading: PropTypes.bool,
};

export default Card;

import React from 'react';
import CardImgWrapper from '../CardImgWrapper';
import Bar from './Bar';
import Wrapper from './Wrapper';

const CardEmpty = () => {
  return (
    <Wrapper>
      <CardImgWrapper small />
      <Bar small />
      <Bar />
    </Wrapper>
  );
};

export default CardEmpty;

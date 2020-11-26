import React from 'react';
import styled from 'styled-components';
import { Carret } from '@buffetjs/icons';

const Arrow = styled(({ isUp, ...rest }) => <Carret {...rest} />)`
  margin-left: 5px;
  ${({ isUp }) =>
    isUp &&
    `
    transform: rotateZ(180deg);

  `}
`;

export default Arrow;

import React from 'react';
import styled from 'styled-components';
import { Carret as Base } from '@buffetjs/icons';

const Carret = styled(({ isUp, ...rest }) => <Base {...rest} />)`
  margin-left: 5px;
  ${({ isUp }) =>
    isUp &&
    `
    transform: rotateZ(180deg);
  `}
`;

export default Carret;

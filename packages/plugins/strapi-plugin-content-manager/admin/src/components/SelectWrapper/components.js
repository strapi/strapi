import styled from 'styled-components';
import { Text } from '@buffetjs/core';

const BaselineAlignment = styled.div`
  padding-top: 1px;
`;

const A = styled(Text)`
  &:hover {
    text-decoration: underline;
  }
`;

export { A, BaselineAlignment };

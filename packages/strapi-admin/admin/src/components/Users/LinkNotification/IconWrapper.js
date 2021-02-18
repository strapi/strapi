import styled from 'styled-components';
import { Flex } from '@buffetjs/core';

const IconWrapper = styled(Flex)`
  height: 100%;
  margin-right: 18px;
  transform: rotate(-20deg);
`;

IconWrapper.defaultProps = {
  flexDirection: 'column',
  justifyContent: 'center',
};

export default IconWrapper;

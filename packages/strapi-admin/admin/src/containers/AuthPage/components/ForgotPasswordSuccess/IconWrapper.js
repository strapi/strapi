import styled from 'styled-components';
import { Flex } from '@buffetjs/core';

const IconWrapper = styled(Flex)`
  height: 100%;
  width: fit-content;
  transform: rotate(-20deg);
`;

IconWrapper.defaultProps = {
  flexDirection: 'column',
  justifyContent: 'center',
};

export default IconWrapper;

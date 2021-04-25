import styled from 'styled-components';

import { Flex } from '@buffetjs/core';

const Wrapper = styled(Flex)`
  width: 1.4rem;
  height: 1.4rem;
  padding: 0 0.2rem;
  margin-top: 0.2rem;
  margin-left: ${({ theme }) => theme.main.sizes.paddings.xs};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  background-color: ${({ theme, isActive }) =>
    isActive ? theme.main.colors.lightBlue : '#e9eaeb'};
`;

export default Wrapper;

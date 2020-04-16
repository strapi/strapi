import styled from 'styled-components';

import Flex from '../../Flex';

// TODO : Design System
// Wait for the product designer to see
// if we need to add this new color in the theme or use an existing one.
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

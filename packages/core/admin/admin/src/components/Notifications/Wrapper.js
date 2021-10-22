import styled from 'styled-components';
import { Flex } from '@strapi/parts/Flex';

const Wrapper = styled(Flex)`
  position: fixed;
  top: 46px;
  right: 0;
  left: 0;
  z-index: 1100;
`;

export default Wrapper;

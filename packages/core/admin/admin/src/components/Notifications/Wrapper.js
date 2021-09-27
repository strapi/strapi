import styled from 'styled-components';
import { Row } from '@strapi/parts/Row';

const Wrapper = styled(Row)`
  position: fixed;
  top: 46px;
  right: 0;
  left: 0;
  z-index: 1100;
`;

export default Wrapper;

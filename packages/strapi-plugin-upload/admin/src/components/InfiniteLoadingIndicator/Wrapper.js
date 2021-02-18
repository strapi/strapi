import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  background-color: ${({ theme }) => theme.main.colors.black};
`;

Wrapper.propTypes = {
  ...themePropTypes,
};

export default Wrapper;

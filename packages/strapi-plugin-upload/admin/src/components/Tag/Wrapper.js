import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  background-color: ${({ theme }) => theme.main.colors.mediumGrey};
  padding: 0 5px;
  height: 14px;
  margin-top: 6px;
`;

Wrapper.propTypes = {
  ...themePropTypes,
};

export default Wrapper;

import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  padding: 0 5px;
  margin-top: 6px;
  height: 14px;
  background-color: ${({ theme }) => theme.main.colors.mediumGrey};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
`;

Wrapper.propTypes = {
  ...themePropTypes,
};

export default Wrapper;

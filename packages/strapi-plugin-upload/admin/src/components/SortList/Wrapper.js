import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

const Wrapper = styled.ul`
  margin-bottom: 0;
  padding: 0;
  min-width: 230px;
  list-style-type: none;
  font-size: ${({ theme }) => theme.main.fontSizes.md};
  background-color: ${({ theme }) => theme.main.colors.white};
  border: 1px solid ${({ theme }) => theme.main.colors.darkGrey};
  box-shadow: 0 2px 4px ${({ theme }) => theme.main.colors.greyAlpha};
`;

Wrapper.propTypes = {
  ...themePropTypes,
};

export default Wrapper;

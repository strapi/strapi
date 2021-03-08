import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  min-height: 100%;
  background-color: #f6f6f6;
`;

const Header = styled.div`
  margin-bottom: 1.1rem;
  padding-top: 1.1rem;
  font-size: 18px;
  font-weight: ${({ theme }) => theme.main.fontWeights.bold};
  line-height: 3.6rem;
`;

const Sticky = styled.div`
  position: sticky;
  top: 70px;
`;

Header.propTypes = {
  ...themePropTypes,
};

export { Header, Wrapper, Sticky };

import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const SortList = styled.ul`
  display: none;
  position: absolute;
  top: 38px;
  left: 0;
  margin-bottom: 0;
  padding: 0;
  min-width: 230px;
  z-index: 1;
  list-style-type: none;
  font-size: ${({ theme }) => theme.main.fontSizes.md};
  background-color: ${({ theme }) => theme.main.colors.filters.background};
  border: 1px solid ${({ theme }) => theme.main.colors.filters.border};
  box-shadow: 0 2px 4px ${({ theme }) => theme.main.colors.filters.shadow};
  ${({ isOpen }) => isOpen && 'display: block;'}
`;

SortList.defaultProps = {
  isOpen: false,
};

SortList.propTypes = {
  isOpen: PropTypes.bool,
  ...themePropTypes,
};

export default SortList;

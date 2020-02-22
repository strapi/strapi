import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const SortButton = styled.button`
  height: 32px;
  padding: 0 10px;
  line-height: 30px;
  background-color: ${({ theme }) => theme.main.colors.filters.background};
  border: 1px solid ${({ theme }) => theme.main.colors.filters.border};
  color: ${({ theme }) => theme.main.colors.filters.color};
  font-weight: ${({ theme }) => theme.main.fontWeights.semiBold};
  font-size: ${({ theme }) => theme.main.fontSizes.md};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  &:active,
  &:focus {
    outline: 0;
  }

  ${({ isActive, theme }) =>
    isActive
      ? `
      background-color: ${theme.main.colors.filters.button.active.background};
      border: 1px solid ${theme.main.colors.filters.button.active.border};
      color: ${theme.main.colors.filters.button.active.color};
    `
      : `
      &:hover {
        background-color: ${theme.main.colors.filters.button.hover.background};
      }
    `}
`;

SortButton.defaultProps = {
  isActive: false,
};

SortButton.propTypes = {
  isActive: PropTypes.bool,
  ...themePropTypes,
};

export default SortButton;

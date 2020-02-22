import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const DropdownButton = styled.button`
  display: flex;
  align-items: center;
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

  > svg + span,
  > span + svg {
    margin-left: 10px;
  }
  > svg g {
    stroke: ${({ theme }) => theme.main.colors.filters.color};
  }

  ${({ isActive, theme }) =>
    isActive
      ? `
      background-color: ${theme.main.colors.filters.button.active.background};
      border: 1px solid ${theme.main.colors.filters.button.active.border};
      color: ${theme.main.colors.filters.button.active.color};
      > svg g {
        stroke: ${theme.main.colors.filters.button.active.color};
      }
    `
      : `
      &:hover {
        background-color: ${theme.main.colors.filters.button.hover.background};
      }
    `}
`;

DropdownButton.defaultProps = {
  isActive: false,
  type: 'button',
};

DropdownButton.propTypes = {
  isActive: PropTypes.bool,
  type: PropTypes.string,
  ...themePropTypes,
};

export default DropdownButton;

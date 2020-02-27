import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

import Text from '../Text';

const SortButton = styled(props => (
  <Text
    as="button"
    fontWeight="semiBold"
    color={props.isActive ? 'mediumBlue' : 'greyDark'}
    {...props}
  />
))`
  height: 32px;
  padding: 0 10px;
  line-height: 30px;
  background-color: ${({ theme }) => theme.main.colors.white};
  border: 1px solid ${({ theme }) => theme.main.colors.darkGrey};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  &:active,
  &:focus {
    outline: 0;
  }

  ${({ isActive, theme }) =>
    isActive
      ? `
      background-color: ${theme.main.colors.lightBlue};
      border: 1px solid ${theme.main.colors.darkBlue};
    `
      : `
      &:hover {
        background-color: ${theme.main.colors.lightestGrey};
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

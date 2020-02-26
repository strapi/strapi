import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

import Text from '../Text';

const SortButton = styled(props => (
  <Text as="button" fontWeight="semiBold" {...props} />
))`
  height: 32px;
  padding: 0 10px;
  line-height: 30px;
  background-color: ${({ theme }) => theme.main.colors.white};
  border: 1px solid ${({ theme }) => theme.main.colors.darkGrey};
  color: ${({ theme }) => theme.main.colors.greyDark};
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
      color: ${theme.main.colors.mediumBlue};
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

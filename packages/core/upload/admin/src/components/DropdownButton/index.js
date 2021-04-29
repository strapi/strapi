import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';
import { Text } from '@buffetjs/core';

const DropdownButton = styled(props => (
  <Text
    as="button"
    fontWeight="semiBold"
    color={props.isActive ? 'mediumBlue' : 'greyDark'}
    {...props}
  />
))`
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  background-color: ${({ theme }) => theme.main.colors.white};
  border: 1px solid ${({ theme }) => theme.main.colors.darkGrey};
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
    stroke: ${({ theme }) => theme.main.colors.greyDark};
  }

  ${({ isActive, theme }) =>
    isActive
      ? `
        background-color: ${theme.main.colors.lightBlue};
        border: 1px solid ${theme.main.colors.darkBlue};
        color: ${theme.main.colors.mediumBlue};
        > svg g {
          stroke: ${theme.main.colors.mediumBlue};
        }
      `
      : `
        &:hover {
          background-color: ${theme.main.colors.lightestGrey};
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

/**
 *
 * AddComponentButton
 *
 */

import React from 'react';

import { BaseButton, Flex, Typography } from '@strapi/design-system';
import { PlusCircle } from '@strapi/icons';
import PropTypes from 'prop-types';
import styled from 'styled-components';

export const AddComponentButton = ({ hasError, isDisabled, isOpen, children, onClick }) => {
  return (
    <StyledButton
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      hasError={hasError}
      background="neutral0"
      paddingTop={3}
      paddingBottom={3}
      paddingLeft={4}
      paddingRight={4}
      style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
    >
      <Flex as="span" gap={2}>
        <StyledAddIcon aria-hidden $isOpen={isOpen} $hasError={hasError && !isOpen} />
        <Typography
          variant="pi"
          fontWeight="bold"
          textColor={hasError && !isOpen ? 'danger600' : 'neutral500'}
        >
          {children}
        </Typography>
      </Flex>
    </StyledButton>
  );
};

const StyledAddIcon = styled(PlusCircle)`
  height: ${({ theme }) => theme.spaces[6]};
  width: ${({ theme }) => theme.spaces[6]};
  transform: ${({ $isOpen }) => ($isOpen ? 'rotate(45deg)' : 'rotate(0deg)')};
  > circle {
    fill: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.danger200 : theme.colors.neutral150};
  }
  > path {
    fill: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.danger600 : theme.colors.neutral600};
  }
`;

const StyledButton = styled(BaseButton)`
  border-radius: 26px;
  border-color: ${({ theme }) => theme.colors.neutral150};
  box-shadow: ${({ theme }) => theme.shadows.filterShadow};

  &:hover {
    ${Typography} {
      color: ${({ theme }) => theme.colors.primary600};
    }

    ${StyledAddIcon} {
      > circle {
        fill: ${({ theme }) => theme.colors.primary600};
      }
      > path {
        fill: ${({ theme }) => theme.colors.neutral100};
      }
    }
  }
  &:active {
    ${Typography} {
      color: ${({ theme }) => theme.colors.primary600};
    }
    ${StyledAddIcon} {
      > circle {
        fill: ${({ theme }) => theme.colors.primary600};
      }
      > path {
        fill: ${({ theme }) => theme.colors.neutral100};
      }
    }
  }
`;

AddComponentButton.defaultProps = {
  hasError: false,
  isDisabled: false,
  isOpen: false,
};

AddComponentButton.propTypes = {
  children: PropTypes.node.isRequired,
  hasError: PropTypes.bool,
  isDisabled: PropTypes.bool,
  isOpen: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

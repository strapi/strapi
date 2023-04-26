import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

import { Box, Flex, Typography } from '@strapi/design-system';
import { PlusCircle } from '@strapi/icons';

const StyledAddIcon = styled(PlusCircle)`
  > circle {
    fill: ${({ theme }) => theme.colors.neutral150};
  }
  > path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

const StyledButton = styled(Box)`
  border-radius: 26px;

  svg {
    height: ${({ theme }) => theme.spaces[6]};
    width: ${({ theme }) => theme.spaces[6]};

    > path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }

  &:hover {
    color: ${({ theme }) => theme.colors.primary600} !important;
    ${Typography} {
      color: ${({ theme }) => theme.colors.primary600} !important;
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

export function AddStage({ children, ...props }) {
  return (
    <StyledButton
      as="button"
      background="neutral0"
      border="neutral150"
      paddingBottom={3}
      paddingLeft={4}
      paddingRight={4}
      paddingTop={3}
      shadow="filterShadow"
      {...props}
    >
      <Flex gap={2}>
        <StyledAddIcon aria-hidden />

        <Typography variant="pi" fontWeight="bold" textColor="neutral500">
          {children}
        </Typography>
      </Flex>
    </StyledButton>
  );
}

AddStage.propTypes = {
  children: PropTypes.node.isRequired,
};

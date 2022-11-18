/**
 *
 * ComponentCard
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { Box, Typography, Stack } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';

const StyledFontAwesomeIcon = styled(FontAwesomeIcon)`
  width: ${pxToRem(32)} !important;
  height: ${pxToRem(32)} !important;
  padding: ${pxToRem(9)};
  border-radius: ${pxToRem(64)};
  background: ${({ theme }) => theme.colors.neutral150};
  path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const ComponentBox = styled(Box)`
  flex-shrink: 0;
  height: ${pxToRem(84)};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  background: ${({ theme }) => theme.colors.neutral100};
  border-radius: ${({ theme }) => theme.borderRadius};
  display: flex;
  justify-content: center;
  align-items: center;

  &.active,
  &:hover {
    border: 1px solid ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};

    ${StyledFontAwesomeIcon} {
      background: ${({ theme }) => theme.colors.primary200};
      path {
        fill: ${({ theme }) => theme.colors.primary600};
      }
    }

    ${Typography} {
      color: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

export default function ComponentCard({ children, icon, onClick }) {
  return (
    <button type="button" onClick={onClick}>
      <ComponentBox borderRadius="borderRadius">
        <Stack spacing={1} style={{ justifyContent: 'center', alignItems: 'center' }}>
          <StyledFontAwesomeIcon data-testid="component-card-icon" icon={icon} />
          <Typography variant="pi" fontWeight="bold" textColor="neutral600">
            {children}
          </Typography>
        </Stack>
      </ComponentBox>
    </button>
  );
}

ComponentCard.defaultProps = {
  icon: 'dice-d6',
  onClick() {},
};

ComponentCard.propTypes = {
  children: PropTypes.node.isRequired,
  icon: PropTypes.string,
  onClick: PropTypes.func,
};

/**
 *
 * ComponentCard
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { pxToRem } from '@strapi/helper-plugin';

import { ComponentIcon } from '../../ComponentIcon';

const ComponentBox = styled(Box)`
  flex-shrink: 0;
  height: ${pxToRem(84)};
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  background: ${({ theme }) => theme.colors.neutral100};
  border-radius: ${({ theme }) => theme.borderRadius};
  display: flex;
  justify-content: center;
  align-items: center;

  &:focus,
  &:hover {
    border: 1px solid ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};

    ${Typography} {
      color: ${({ theme }) => theme.colors.primary600};
    }

    /* > Stack > ComponentIcon */
    > div > div:first-child {
      background: ${({ theme }) => theme.colors.primary200};
      color: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

export default function ComponentCard({ children, onClick }) {
  return (
    <ComponentBox as="button" type="button" onClick={onClick} hasRadius>
      <Stack spacing={1} alignItems="center" justifyContent="center">
        <ComponentIcon />

        <Typography variant="pi" fontWeight="bold" textColor="neutral600">
          {children}
        </Typography>
      </Stack>
    </ComponentBox>
  );
}

ComponentCard.defaultProps = {
  onClick() {},
};

ComponentCard.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
};

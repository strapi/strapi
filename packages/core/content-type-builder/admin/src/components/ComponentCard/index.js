/**
 *
 * ComponentCard
 *
 */

import React from 'react';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import { Box, Flex, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { Cross } from '@strapi/icons';
import styled from 'styled-components';

import { ComponentIcon } from './ComponentIcon';

import useDataManager from '../../hooks/useDataManager';

const CloseButton = styled(Box)`
  position: absolute;
  display: none;
  top: 5px;
  right: ${pxToRem(8)};

  svg {
    width: ${pxToRem(10)};
    height: ${pxToRem(10)};

    path {
      fill: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

const ComponentBox = styled(Flex)`
  width: ${pxToRem(140)};
  height: ${pxToRem(80)};
  position: relative;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  background: ${({ theme }) => theme.colors.neutral100};
  border-radius: ${({ theme }) => theme.borderRadius};
  max-width: 100%;

  &.active,
  &:focus,
  &:hover {
    border: 1px solid ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};

    ${CloseButton} {
      display: block;
    }

    ${Typography} {
      color: ${({ theme }) => theme.colors.primary600};
    }

    /* > ComponentIcon */
    > div:first-child {
      background: ${({ theme }) => theme.colors.primary200};
      color: ${({ theme }) => theme.colors.primary600};

      svg {
        path {
          fill: ${({ theme }) => theme.colors.primary600};
        }
      }
    }
  }
`;

function ComponentCard({ component, dzName, index, isActive, isInDevelopmentMode, onClick }) {
  const { modifiedData, removeComponentFromDynamicZone } = useDataManager();
  const {
    schema: { icon, displayName },
  } = get(modifiedData, ['components', component], { schema: {} });

  const onClose = (e) => {
    e.stopPropagation();
    removeComponentFromDynamicZone(dzName, index);
  };

  return (
    <ComponentBox
      alignItems="center"
      direction="column"
      className={isActive ? 'active' : ''}
      borderRadius="borderRadius"
      justifyContent="center"
      paddingLeft={4}
      paddingRight={4}
      shrink={0}
      onClick={onClick}
      role="tab"
      tabIndex={isActive ? 0 : -1}
      cursor="pointer"
      aria-selected={isActive}
      aria-controls={`dz-${dzName}-panel-${index}`}
      id={`dz-${dzName}-tab-${index}`}
    >
      <ComponentIcon icon={icon} isActive={isActive} />

      <Box marginTop={1} maxWidth="100%">
        <Typography variant="pi" fontWeight="bold" ellipsis>
          {displayName}
        </Typography>
      </Box>

      {isInDevelopmentMode && (
        <CloseButton as="button" onClick={onClose}>
          <Cross />
        </CloseButton>
      )}
    </ComponentBox>
  );
}

ComponentCard.defaultProps = {
  component: null,
  isActive: false,
  isInDevelopmentMode: false,
  onClick() {},
};

ComponentCard.propTypes = {
  component: PropTypes.string,
  dzName: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  isActive: PropTypes.bool,
  isInDevelopmentMode: PropTypes.bool,
  onClick: PropTypes.func,
};

export default ComponentCard;

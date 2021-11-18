/**
 *
 * ComponentCard
 *
 */

import React from 'react';
import get from 'lodash/get';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { pxToRem } from '@strapi/helper-plugin';
import Cross from '@strapi/icons/Cross';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styled from 'styled-components';

import useDataManager from '../../hooks/useDataManager';

/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */

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

const CloseButton = styled.div`
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

const ComponentBox = styled(Box)`
  flex-shrink: 0;
  width: ${pxToRem(140)};
  height: ${pxToRem(80)};
  position: relative;
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

    ${CloseButton} {
      display: block;
    }

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

const StackCentered = styled(Stack)`
  align-items: center;
`;

function ComponentCard({ component, dzName, index, isActive, isInDevelopmentMode, onClick }) {
  const { modifiedData, removeComponentFromDynamicZone } = useDataManager();
  const {
    schema: { icon, displayName },
  } = get(modifiedData, ['components', component], {
    schema: { icon: null },
  });

  const onClose = e => {
    e.stopPropagation();
    removeComponentFromDynamicZone(dzName, index);
  };

  return (
    <button type="button" onClick={onClick}>
      <ComponentBox
        className={isActive ? 'active' : ''}
        borderRadius="borderRadius"
        paddingLeft={4}
        paddingRight={4}
      >
        <StackCentered size={1}>
          <StyledFontAwesomeIcon icon={icon} />
          <Box maxWidth={`calc(${pxToRem(140)} - 32px)`}>
            <Typography variant="pi" fontWeight="bold" ellipsis>
              {displayName}
            </Typography>
          </Box>
        </StackCentered>
        {isInDevelopmentMode && (
          <CloseButton
            role="button"
            tabIndex={0}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClose(e)}
            onClick={onClose}
          >
            <Cross />
          </CloseButton>
        )}
      </ComponentBox>
    </button>
  );
}

ComponentCard.defaultProps = {
  component: null,
  isActive: false,
  isInDevelopmentMode: false,
  onClick: () => {},
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

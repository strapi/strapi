import { Box, Flex, Typography } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import get from 'lodash/get';
import { styled } from 'styled-components';

import { useDataManager } from '../DataManager/useDataManager';

import { ComponentIcon } from './ComponentIcon';

import type { Internal, Struct } from '@strapi/types';

interface ComponentCardProps {
  component: string;
  dzName: string;
  index: number;
  isActive?: boolean;
  isInDevelopmentMode?: boolean;
  onClick?: () => void;
  forTarget: Struct.ModelType;
  targetUid: Internal.UID.Schema;
  disabled?: boolean;
}

const CloseButton = styled(Box)`
  position: absolute;
  display: none;
  top: 5px;
  right: 0.8rem;

  svg {
    width: 1rem;
    height: 1rem;

    path {
      fill: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

const ComponentBox = styled(Flex)`
  width: 14rem;
  height: 8rem;
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
    color: ${({ theme }) => theme.colors.primary600};

    ${CloseButton} {
      display: block;
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

export const ComponentCard = ({
  component,
  dzName,
  index,
  isActive = false,
  isInDevelopmentMode = false,
  onClick,
  forTarget,
  targetUid,
  disabled,
}: ComponentCardProps) => {
  const { components, removeComponentFromDynamicZone } = useDataManager();
  const type = get(components, component);
  const { icon, displayName } = type?.info || {};

  const onClose = (e: any) => {
    e.stopPropagation();
    removeComponentFromDynamicZone({
      forTarget,
      targetUid,
      dzName,
      componentToRemoveIndex: index,
    });
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

      {isInDevelopmentMode && !disabled && (
        <CloseButton cursor="pointer" tag="button" onClick={onClose}>
          <Cross />
        </CloseButton>
      )}
    </ComponentBox>
  );
};

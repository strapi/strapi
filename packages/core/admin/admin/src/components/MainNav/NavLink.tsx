import * as React from 'react';

import { Tooltip, Flex, Badge } from '@strapi/design-system';
import { NavLink as RouterLink, LinkProps } from 'react-router-dom';
import styled from 'styled-components';

/* -------------------------------------------------------------------------------------------------
 * Link
 * -----------------------------------------------------------------------------------------------*/
const MainNavLinkWrapper = styled(RouterLink)`
  text-decoration: none;
  display: block;
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral600};
  position: relative;

  &:hover,
  &.active {
    background: ${({ theme }) => theme.colors.neutral100};
  }

  &:hover {
    svg path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
    color: ${({ theme }) => theme.colors.neutral700};
  }

  &.active {
    svg path {
      fill: ${({ theme }) => theme.colors.primary600};
    }

    color: ${({ theme }) => theme.colors.primary600};
    font-weight: 500;
  }
`;

const LinkImpl = ({ children, ...props }: LinkProps) => {
  return <MainNavLinkWrapper {...props}>{children}</MainNavLinkWrapper>;
};

/* -------------------------------------------------------------------------------------------------
 * Tooltip
 * -----------------------------------------------------------------------------------------------*/
const TooltipImpl = ({ children, label, position = 'right' }: NavLink.TooltipProps) => {
  return (
    <Tooltip position={position} label={label}>
      {children}
    </Tooltip>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Icon
 * -----------------------------------------------------------------------------------------------*/
const IconImpl = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex
      paddingTop={`${8 / 16}rem`}
      paddingBottom={`${8 / 16}rem`}
      paddingLeft={`${12 / 16}rem`}
      paddingRight={`${12 / 16}rem`}
      justifyContent="center"
      aria-hidden
    >
      {children}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Badge
 * -----------------------------------------------------------------------------------------------*/
const CustomBadge = styled(Badge)`
  /* override default badge styles to change the border radius of the Base element in the Design System */
  border-radius: ${({ theme }) => theme.spaces[10]};
`;

const BadgeImpl = ({ children, label }: NavLink.BadgeProps) => {
  if (!children) {
    return null;
  }
  return (
    <CustomBadge
      position="absolute"
      top="-12px"
      right="-4px"
      aria-label={label}
      background="primary600"
      textColor="neutral0"
    >
      {children}
    </CustomBadge>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EXPORTS
 * -----------------------------------------------------------------------------------------------*/

const NavLink = {
  Link: LinkImpl,
  Tooltip: TooltipImpl,
  Icon: IconImpl,
  Badge: BadgeImpl,
};

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace NavLink {
  export interface BadgeProps {
    children: React.ReactNode;
    label: string;
  }

  export interface TooltipProps {
    position?: 'top' | 'bottom' | 'left' | 'right';
    label: string;
    children: React.ReactNode;
  }
}

export { NavLink };

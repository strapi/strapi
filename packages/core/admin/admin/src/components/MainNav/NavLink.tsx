import * as React from 'react';

import { Tooltip, Flex, Badge, BadgeProps } from '@strapi/design-system';
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
  color: ${({ theme }) => theme.colors.neutral500};
  position: relative;
  width: fit-content;

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
      <Flex justifyContent="center" width={7} height={7}>
        {children}
      </Flex>
    </Tooltip>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Icon
 * -----------------------------------------------------------------------------------------------*/
const IconImpl = ({ children }: { children: React.ReactNode }) => {
  if (!children) {
    return null;
  }
  return (
    <Flex justifyContent="center" aria-hidden as="span" width={5} height={5}>
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
  height: 2rem;
`;

const BadgeImpl = ({ children, label, ...props }: NavLink.NavBadgeProps) => {
  if (!children) {
    return null;
  }
  return (
    <CustomBadge
      position="absolute"
      width="2.3rem"
      top="-0.8rem"
      left="1.7rem"
      aria-label={label}
      active={false}
      {...props}
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
  export interface NavBadgeProps extends BadgeProps {
    children: React.ReactNode;
    label: string;
  }

  export interface TooltipProps {
    position?: 'top' | 'bottom' | 'left' | 'right';
    label?: string;
    children: React.ReactNode;
  }
}

export { NavLink };

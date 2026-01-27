import * as React from 'react';

import {
  Tooltip,
  TooltipProps as DSTooltipProps,
  Badge,
  BadgeProps,
  AccessibleIcon,
} from '@strapi/design-system';
import { NavLink as RouterLink, LinkProps } from 'react-router-dom';
import { styled } from 'styled-components';
/* -------------------------------------------------------------------------------------------------
 * Link
 * -----------------------------------------------------------------------------------------------*/
const MainNavLinkWrapper = styled(RouterLink)`
  text-decoration: none;
  display: flex;
  align-items: center;
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral500};
  position: relative;
  width: 100%;
  padding-block: 0.4rem;
  padding-inline: 1.2rem;

  ${({ theme }) => theme.breakpoints.medium} {
    padding-block: 0.6rem;
    padding-inline: 0.6rem;
  }

  &:hover {
    svg path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
    background: ${({ theme }) => theme.colors.neutral100};
  }

  &.active {
    svg path {
      fill: ${({ theme }) => theme.colors.primary600};
    }
    background: ${({ theme }) => theme.colors.primary100};
  }
`;

/**
 * Padding is tuned to visually match a LinkButton size L.
 */
const MainNavButtonWrapper = styled(MainNavLinkWrapper)`
  padding-block: 1rem;
  padding-inline: 1rem;
`;

const LinkImpl = ({ children, ...props }: LinkProps) => (
  <MainNavLinkWrapper {...props}>{children}</MainNavLinkWrapper>
);

const NavButtonImpl = ({ children, ...props }: LinkProps) => (
  <MainNavButtonWrapper {...props}>{children}</MainNavButtonWrapper>
);
/* -------------------------------------------------------------------------------------------------
 * Tooltip
 * -----------------------------------------------------------------------------------------------*/
const TooltipImpl = ({ children, label, position = 'right' }: NavLink.TooltipProps) => {
  return (
    <Tooltip side={position} label={label} delayDuration={0}>
      <span>{children}</span>
    </Tooltip>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Icon
 * -----------------------------------------------------------------------------------------------*/
const IconImpl = ({ label, children }: { label: string; children: React.ReactNode }) => {
  if (!children) {
    return null;
  }
  return <AccessibleIcon label={label}>{children}</AccessibleIcon>;
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
  NavButton: NavButtonImpl,
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
    children: React.ReactNode;
    label?: string;
    position?: DSTooltipProps['side'];
  }
}

export { NavLink };

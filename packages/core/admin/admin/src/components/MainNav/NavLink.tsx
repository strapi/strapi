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
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral500};
  position: relative;
  width: fit-content;
  padding-block: 0.6rem;
  padding-inline: 0.6rem;

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

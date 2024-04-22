import * as React from 'react';

import { Tooltip, Icon, Flex, Badge } from '@strapi/design-system';
import { NavLink as RouterLink, LinkProps } from 'react-router-dom';
import styled from 'styled-components';

export interface NavLinkProps extends LinkProps {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: string | React.ComponentType<any>;
  badgeAriaLabel?: string;
  badgeContent?: string | number;
}

const MainNavLinkWrapper = styled(RouterLink)`
  text-decoration: none;
  display: block;
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral600};
  position: relative;

  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }

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

const CustomBadge = styled(Badge)`
  span {
    color: ${({ theme }) => theme.colors.neutral0};
    line-height: 0;
  }
  min-width: ${({ theme }) => theme.spaces[6]};
  height: ${({ theme }) => theme.spaces[5]};
  border-radius: ${({ theme }) => theme.spaces[10]};
  padding: ${({ theme }) => `0 ${theme.spaces[2]}`};
`;

export const NavLink = ({
  children,
  icon,
  badgeContent,
  badgeAriaLabel,
  ...props
}: NavLinkProps) => {
  return (
    <MainNavLinkWrapper {...props}>
      <Tooltip position="right" label={children}>
        <>
          <Flex
            paddingTop={`${8 / 16}rem`}
            paddingBottom={`${8 / 16}rem`}
            paddingLeft={`${12 / 16}rem`}
            paddingRight={`${12 / 16}rem`}
            justifyContent="center"
            aria-hidden
          >
            <Icon as={icon} color="neutral500" />
          </Flex>
          {badgeContent && (
            <CustomBadge
              position="absolute"
              top="-12px"
              right="-4px"
              aria-label={badgeAriaLabel}
              background="primary600"
            >
              {badgeContent}
            </CustomBadge>
          )}
        </>
      </Tooltip>
    </MainNavLinkWrapper>
  );
};

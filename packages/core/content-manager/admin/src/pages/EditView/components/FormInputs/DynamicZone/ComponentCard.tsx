import * as React from 'react';

import { Flex, FlexComponent, Typography, TypographyComponent } from '@strapi/design-system';
import { styled } from 'styled-components';

import { ComponentIcon, ComponentIconProps } from '../../../../../components/ComponentIcon';

interface ComponentCardProps extends Pick<ComponentIconProps, 'icon'> {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement> & React.MouseEventHandler<HTMLDivElement>;
}

const ComponentCard = ({ children, onClick, icon }: ComponentCardProps) => {
  return (
    <ComponentBox
      tag="button"
      type="button"
      onClick={onClick}
      hasRadius
      borderColor="neutral200"
      background="neutral100"
      justifyContent="center"
      alignItems="center"
      shrink={0}
      height="8.4rem"
    >
      <Flex direction="column" gap={1} alignItems="center" justifyContent="center">
        <ComponentIcon icon={icon} />

        <ComponentName variant="pi" fontWeight="bold" textColor="neutral600">
          {children}
        </ComponentName>
      </Flex>
    </ComponentBox>
  );
};

const ComponentName = styled<TypographyComponent>(Typography)``;

const ComponentBox = styled<FlexComponent<'button'>>(Flex)`
  &:focus,
  &:hover {
    border: 1px solid ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};

    ${ComponentName} {
      color: ${({ theme }) => theme.colors.primary600};
    }

    /* > Flex > ComponentIcon */
    > div > div:first-child {
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

export { ComponentCard };
export type { ComponentCardProps };

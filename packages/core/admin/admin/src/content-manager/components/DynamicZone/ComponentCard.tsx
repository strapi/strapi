import * as React from 'react';

import { Flex, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import styled from 'styled-components';

import { ComponentIcon, ComponentIconProps } from '../ComponentIcon';

interface ComponentCardProps extends Pick<ComponentIconProps, 'icon'> {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement> & React.MouseEventHandler<HTMLDivElement>;
}

const ComponentCard = ({ children, onClick, icon }: ComponentCardProps) => {
  return (
    <ComponentBox
      as="button"
      type="button"
      onClick={onClick}
      hasRadius
      borderColor="neutral200"
      background="neutral100"
      justifyContent="center"
      alignItems="center"
      shrink={0}
      height={pxToRem(84)}
    >
      <Flex direction="column" gap={1} alignItems="center" justifyContent="center">
        <ComponentIcon icon={icon} />

        <Typography variant="pi" fontWeight="bold" textColor="neutral600">
          {children}
        </Typography>
      </Flex>
    </ComponentBox>
  );
};

const ComponentBox = styled(Flex)`
  &:focus,
  &:hover {
    border: 1px solid ${({ theme }) => theme.colors.primary200};
    background: ${({ theme }) => theme.colors.primary100};

    ${Typography} {
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

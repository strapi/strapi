import * as React from 'react';

import { Box, CardAction, Flex, BoxProps } from '@strapi/design-system';
import { Folder } from '@strapi/icons';
import { NavLink, LinkProps } from 'react-router-dom';
import { styled } from 'styled-components';

import { FolderCardContext } from '../contexts/FolderCard';

const FauxClickWrapper = styled.button`
  height: 100%;
  left: 0;
  position: absolute;
  opacity: 0;
  top: 0;
  width: 100%;

  &:hover,
  &:focus {
    text-decoration: none;
  }
`;

const StyledFolder = styled(Folder)`
  path {
    fill: currentColor;
  }
`;

const CardActionDisplay = styled(Box)`
  display: none;
`;

const Card = styled(Box)`
  &:hover,
  &:focus-within {
    ${CardActionDisplay} {
      display: ${({ $isCardActions }) => ($isCardActions ? 'block' : '')};
    }
  }
`;

export interface FolderCardProps extends Omit<BoxProps, 'id'> {
  ariaLabel: string;
  children: React.ReactNode;
  id?: string;
  startAction?: React.ReactNode;
  cardActions?: React.ReactNode;
  onClick?: () => void;
  to?: LinkProps['to'];
}

export const FolderCard = React.forwardRef(
  (
    {
      children,
      startAction = null,
      cardActions = null,
      ariaLabel,
      onClick,
      to,
      ...props
    }: FolderCardProps,
    ref
  ) => {
    const generatedId = React.useId();
    const fodlerCtxValue = React.useMemo(() => ({ id: generatedId }), [generatedId]);

    return (
      <FolderCardContext.Provider value={fodlerCtxValue}>
        <Card position="relative" tabIndex={0} $isCardActions={!!cardActions} ref={ref} {...props}>
          <FauxClickWrapper
            to={to || undefined}
            as={to ? NavLink : 'button'}
            type={to ? undefined : 'button'}
            onClick={onClick}
            tabIndex={-1}
            aria-label={ariaLabel}
            aria-hidden
          />

          <Flex
            hasRadius
            borderStyle="solid"
            borderWidth="1px"
            borderColor="neutral150"
            background="neutral0"
            shadow="tableShadow"
            padding={3}
            gap={2}
            cursor="pointer"
          >
            {startAction}

            <Box
              hasRadius
              background="secondary100"
              color="secondary500"
              paddingBottom={2}
              paddingLeft={3}
              paddingRight={3}
              paddingTop={2}
            >
              <StyledFolder width="2.4rem" height="2.4rem" />
            </Box>

            {children}

            <CardActionDisplay>
              <CardAction right={4} position="end">
                {cardActions}
              </CardAction>
            </CardActionDisplay>
          </Flex>
        </Card>
      </FolderCardContext.Provider>
    );
  }
);

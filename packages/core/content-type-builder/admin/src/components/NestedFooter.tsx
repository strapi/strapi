import type { ReactNode } from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import styled from 'styled-components';

const IconBox = styled(Box)`
  height: ${24 / 16}rem;
  width: ${24 / 16}rem;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;

  svg {
    height: ${10 / 16}rem;
    width: ${10 / 16}rem;
  }

  svg path {
    fill: ${({ theme, color }) => theme.colors[`${color}600`]};
  }
`;

const ButtonBox = styled(Box)`
  border-radius: 0 0 ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius};
  display: block;
  width: 100%;
  border: none;
  position: relative;
  left: -0.25rem;
`;

interface NestedTFooterProps {
  color: string;
  children: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
}

export const NestedTFooter = ({ children, icon, color, ...props }: NestedTFooterProps) => {
  return (
    <ButtonBox paddingBottom={4} paddingTop={4} as="button" type="button" {...props}>
      <Flex>
        <IconBox color={color} aria-hidden background={`${color}200`}>
          {icon}
        </IconBox>
        <Box paddingLeft={3}>
          <Typography variant="pi" fontWeight="bold" textColor={`${color}600`}>
            {children}
          </Typography>
        </Box>
      </Flex>
    </ButtonBox>
  );
};

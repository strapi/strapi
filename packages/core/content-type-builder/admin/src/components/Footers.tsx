import type { ReactNode } from 'react';

import { Box, Divider, Flex, TFooterProps, Typography } from '@strapi/design-system';
import { styled } from 'styled-components';

const IconBox = styled(Box)`
  height: 2.4rem;
  width: 2.4rem;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;

  svg {
    height: 1rem;
    width: 1rem;
  }

  svg path {
    fill: ${({ theme, color }) => theme.colors[`${color}600` as keyof typeof theme.colors]};
  }
`;

const ButtonBox = styled(Box)`
  border-radius: 0 0 ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius};
  display: block;
  width: 100%;
  border: none;
  position: relative;
`;

interface NestedTFooterProps extends TFooterProps {
  color: string;
  children: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
}

export const NestedTFooter = ({ children, icon, color, ...props }: NestedTFooterProps) => {
  return (
    <ButtonBox
      paddingBottom={4}
      paddingTop={4}
      paddingLeft="6rem"
      tag="button"
      type="button"
      {...props}
    >
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

export const TFooter = ({ children, icon, color, ...props }: TFooterProps & { color: string }) => {
  return (
    <div>
      <Divider />
      <ButtonBox tag="button" background={`${color}100`} padding={5} {...props}>
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
    </div>
  );
};

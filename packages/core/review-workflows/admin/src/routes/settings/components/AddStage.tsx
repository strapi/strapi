import { Box, ButtonProps, Flex, Typography } from '@strapi/design-system';
import { PlusCircle } from '@strapi/icons';
import { styled } from 'styled-components';

export const AddStage = ({ children, ...props }: ButtonProps) => {
  return (
    <StyledButton
      tag="button"
      background="neutral0"
      border="neutral150"
      paddingBottom={3}
      paddingLeft={4}
      paddingRight={4}
      paddingTop={3}
      shadow="filterShadow"
      {...props}
    >
      {/* @ts-expect-error – textColor can accept css properties in the next DS release */}
      <Typography variant="pi" fontWeight="bold" textColor="inherit">
        <Flex tag="span" gap={2}>
          <PlusCircle width="2.4rem" height="2.4rem" aria-hidden />
          {children}
        </Flex>
      </Typography>
    </StyledButton>
  );
};

const StyledButton = styled(Box)`
  border-radius: 26px;
  color: ${({ theme }) => theme.colors.neutral500};

  &:hover {
    color: ${({ theme }) => theme.colors.primary600};
  }

  &:active {
    color: ${({ theme }) => theme.colors.primary600};
  }
`;

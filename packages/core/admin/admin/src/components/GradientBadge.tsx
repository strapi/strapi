import { Badge, Flex, Typography } from '@strapi/design-system';
import { Lightning } from '@strapi/icons';
import { styled } from 'styled-components';

const GradientBadge = styled(Badge)`
  width: 100%;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.primary600} 0%,
    ${({ theme }) => theme.colors.alternative600} 121.48%
  );
  padding: 1.1rem 1rem;

  ${({ theme }) => theme.breakpoints.small} {
    padding: 1.2rem 1rem;
  }
  ${({ theme }) => theme.breakpoints.medium} {
    padding: 0.4rem 1rem;
  }
`;

const CustomText = styled(Typography)`
  font-size: 1.2rem;

  ${({ theme }) => theme.breakpoints.small} {
    font-size: 1.4rem;
    line-height: 1.6rem;
  }
`;

const GradientBadgeWithIcon = ({ label }: { label: string }) => {
  return (
    <GradientBadge>
      <Flex gap={1} alignItems="center">
        <Lightning width={16} height={16} fill="neutral0" />
        <CustomText textColor="neutral0">{label}</CustomText>
      </Flex>
    </GradientBadge>
  );
};

export { GradientBadgeWithIcon as GradientBadge };

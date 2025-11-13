import { Badge, Flex, Typography } from '@strapi/design-system';
import { Lightning } from '@strapi/icons';
import { styled } from 'styled-components';

const GradientBadge = styled(Badge)`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.primary600} 0%,
    ${({ theme }) => theme.colors.alternative600} 121.48%
  );
  padding: 0.4rem 1rem;
`;

const GradientBadgeWithIcon = ({ label }: { label: string }) => {
  return (
    <GradientBadge>
      <Flex gap={1} alignItems="center">
        <Lightning width={16} height={16} fill="neutral0" />
        <Typography textColor="neutral0">{label}</Typography>
      </Flex>
    </GradientBadge>
  );
};

export { GradientBadgeWithIcon as GradientBadge };

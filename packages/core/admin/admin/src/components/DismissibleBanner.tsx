import { Box, Flex, IconButton } from '@strapi/design-system';
import { Cross } from '@strapi/icons';
import { styled } from 'styled-components';

import { RESPONSIVE_DEFAULT_SPACING } from '../constants/theme';

const BannerBackground = styled(Flex)`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.primary600} 0%,
    ${({ theme }) => theme.colors.alternative600} 121.48%
  );
`;

interface DismissibleBannerProps {
  message: React.ReactNode;
  action?: React.ReactNode;
  closeLabel: string;
  onDismiss: () => void;
}

const DismissibleBanner = ({ message, action, closeLabel, onDismiss }: DismissibleBannerProps) => {
  return (
    <BannerBackground width="100%" justifyContent="center">
      <Flex
        justifyContent="center"
        alignItems="center"
        width="100%"
        paddingTop={2}
        paddingBottom={2}
        paddingLeft={RESPONSIVE_DEFAULT_SPACING}
        paddingRight={RESPONSIVE_DEFAULT_SPACING}
        gap={2}
      >
        <Flex justifyContent="center" alignItems="center" wrap="wrap" gap={2} flex={1}>
          <Box>{message}</Box>
          {action ? <Box>{action}</Box> : null}
        </Flex>
        <Box shrink={0}>
          <IconButton withTooltip={false} label={closeLabel} onClick={onDismiss}>
            <Cross />
          </IconButton>
        </Box>
      </Flex>
    </BannerBackground>
  );
};

export { DismissibleBanner };

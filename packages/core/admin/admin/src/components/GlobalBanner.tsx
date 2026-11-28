import * as React from 'react';

import { Box, Flex, IconButton, Typography } from '@strapi/design-system';
import { Cross, Information, WarningCircle } from '@strapi/icons';
import { styled } from 'styled-components';

import { RESPONSIVE_DEFAULT_SPACING } from '../constants/theme';

type GlobalBannerVariant = 'default' | 'warning';

const VARIANTS = {
  default: {
    background: 'primary100',
    divider: 'primary200',
    icon: 'primary600',
    Icon: Information,
  },
  warning: {
    background: 'warning100',
    divider: 'warning200',
    icon: 'warning600',
    Icon: WarningCircle,
  },
} as const;

/** A divider under each strip, so two strips of the same colour still read as two. Not a border
 * box: the strip stays edge to edge, with no radius or shadow. */
const Strip = styled(Flex)<{ $divider: (typeof VARIANTS)[GlobalBannerVariant]['divider'] }>`
  border-bottom: 1px solid ${({ theme, $divider }) => theme.colors[$divider]};
`;

interface GlobalBannerProps {
  variant?: GlobalBannerVariant;
  title: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  /** Without it the banner cannot be closed. */
  onClose?: () => void;
  closeLabel?: string;
  'data-testid'?: string;
}

/**
 * A full-width coloured strip for messages about the whole app, rendered above all navigation by
 * `MfaBanners`: icon, title, text and action inline, with an optional close button at the end. The
 * design system `Alert` is a card (radius, border), which is the wrong shape here.
 */
const GlobalBanner = ({
  variant = 'default',
  title,
  children,
  action,
  onClose,
  closeLabel,
  'data-testid': testId,
}: GlobalBannerProps) => {
  const { background, divider, icon, Icon } = VARIANTS[variant];

  return (
    <Strip
      role="status"
      data-testid={testId}
      data-variant={variant}
      $divider={divider}
      background={background}
      width="100%"
      gap={3}
      alignItems="center"
      paddingTop={2}
      paddingBottom={2}
      paddingLeft={RESPONSIVE_DEFAULT_SPACING}
      paddingRight={RESPONSIVE_DEFAULT_SPACING}
    >
      <Flex shrink={0}>
        <Icon fill={icon} aria-hidden />
      </Flex>
      <Flex flex={1} wrap="wrap" alignItems="baseline" gap={2}>
        <Typography fontWeight="bold" textColor="neutral800">
          {title}
        </Typography>
        <Typography textColor="neutral800">{children}</Typography>
        {action ? <Box>{action}</Box> : null}
      </Flex>
      {onClose && closeLabel ? (
        <Box shrink={0}>
          <IconButton variant="ghost" label={closeLabel} onClick={onClose} withTooltip={false}>
            <Cross />
          </IconButton>
        </Box>
      ) : null}
    </Strip>
  );
};

export { GlobalBanner };
export type { GlobalBannerProps, GlobalBannerVariant };

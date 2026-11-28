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

/**
 * Title, text and action. From the `large` breakpoint up it is a wrapping flex row; below it, text
 * flows inline (title, text and the action link on one run, wrapping only where it has to), so a
 * phone does not spend a line on each.
 */
const Content = styled(Flex)`
  display: block;

  > * {
    margin-right: ${({ theme }) => theme.spaces[1]};
  }

  ${({ theme }) => theme.breakpoints.large} {
    display: flex;

    > * {
      margin-right: 0;
    }
  }
`;

/** The icon only repeats what the colour and the title say, so a phone gives its width to the text. */
const IconSlot = styled(Flex)`
  display: none;

  ${({ theme }) => theme.breakpoints.large} {
    display: flex;
  }
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
      gap={{ initial: 2, large: 3 }}
      alignItems="center"
      paddingTop={{ initial: 1, large: 2 }}
      paddingBottom={{ initial: 1, large: 2 }}
      paddingLeft={RESPONSIVE_DEFAULT_SPACING}
      paddingRight={RESPONSIVE_DEFAULT_SPACING}
    >
      <IconSlot shrink={0}>
        <Icon fill={icon} aria-hidden />
      </IconSlot>
      <Content flex={1} wrap="wrap" alignItems="baseline" gap={2}>
        <Typography fontWeight="bold" textColor="neutral800">
          {title}
        </Typography>
        <Typography textColor="neutral800">{children}</Typography>
        {action ? <Box>{action}</Box> : null}
      </Content>
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

import * as React from 'react';

import { Badge, Flex, type BadgeProps } from '@strapi/design-system';
import { CircleHalfIcon } from '@strapi/icons/regular';
import { useIntl } from 'react-intl';

import type { Release } from '../../../shared/contracts/releases';
import type { MessageDescriptor } from 'react-intl';

/**
 * TEMPORARY inline status icons.
 *
 * `circle-dashed`, `thumbs-up`, `thumbs-down`, `hand-palm` (Phosphor regular) and `check-circle`
 * (Phosphor fill) are not yet in `@strapi/icons`. Replace with imports from `@strapi/icons/regular`
 * (and the filled set for `done`) once a dev adds them, following EE-274. `circle-half` already
 * ships as `CircleHalfIcon` in `@strapi/icons/regular`.
 */
type IconProps = React.SVGProps<SVGSVGElement>;

const CircleDashed = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
    <path d="M96.26,37.05A8,8,0,0,1,102,27.29a104.11,104.11,0,0,1,52,0,8,8,0,0,1-2,15.75,8.15,8.15,0,0,1-2-.26,88.09,88.09,0,0,0-44,0A8,8,0,0,1,96.26,37.05ZM53.79,55.14a104.05,104.05,0,0,0-26,45,8,8,0,0,0,15.42,4.27,88,88,0,0,1,22-38.09A8,8,0,0,0,53.79,55.14ZM43.21,151.55a8,8,0,1,0-15.42,4.28,104.12,104.12,0,0,0,26,45,8,8,0,0,0,11.41-11.22A88.14,88.14,0,0,1,43.21,151.55ZM150,213.22a88,88,0,0,1-44,0,8,8,0,1,0-4,15.49,104.11,104.11,0,0,0,52,0,8,8,0,0,0-4-15.49ZM222.65,146a8,8,0,0,0-9.85,5.58,87.91,87.91,0,0,1-22,38.08,8,8,0,1,0,11.42,11.21,104,104,0,0,0,26-45A8,8,0,0,0,222.65,146Zm-9.86-41.54a8,8,0,0,0,15.42-4.28,104,104,0,0,0-26-45,8,8,0,1,0-11.41,11.22A88,88,0,0,1,212.79,104.45Z" />
  </svg>
);

const ThumbsUp = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
    <path d="M234,80.12A24,24,0,0,0,216,72H160V56a40,40,0,0,0-40-40,8,8,0,0,0-7.16,4.42L75.06,96H32a16,16,0,0,0-16,16v88a16,16,0,0,0,16,16H204a24,24,0,0,0,23.82-21l12-96A24,24,0,0,0,234,80.12ZM32,112H72v88H32ZM223.94,97l-12,96a8,8,0,0,1-7.94,7H88V105.89l36.71-73.43A24,24,0,0,1,144,56V80a8,8,0,0,0,8,8h64a8,8,0,0,1,7.94,9Z" />
  </svg>
);

const ThumbsDown = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
    <path d="M239.82,157l-12-96A24,24,0,0,0,204,40H32A16,16,0,0,0,16,56v88a16,16,0,0,0,16,16H75.06l37.78,75.58A8,8,0,0,0,120,240a40,40,0,0,0,40-40V184h56a24,24,0,0,0,23.82-27ZM72,144H32V56H72Zm150,21.29a7.88,7.88,0,0,1-6,2.71H152a8,8,0,0,0-8,8v24a24,24,0,0,1-19.29,23.54L88,150.11V56H204a8,8,0,0,1,7.94,7l12,96A7.87,7.87,0,0,1,222,165.29Z" />
  </svg>
);

const HandPalm = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
    <path d="M188,88a27.75,27.75,0,0,0-12,2.71V60a28,28,0,0,0-41.36-24.6A28,28,0,0,0,80,44v6.71A27.75,27.75,0,0,0,68,48,28,28,0,0,0,40,76v76a88,88,0,0,0,176,0V116A28,28,0,0,0,188,88Zm12,64a72,72,0,0,1-144,0V76a12,12,0,0,1,24,0v44a8,8,0,0,0,16,0V44a12,12,0,0,1,24,0v68a8,8,0,0,0,16,0V60a12,12,0,0,1,24,0v68.67A48.08,48.08,0,0,0,120,176a8,8,0,0,0,16,0,32,32,0,0,1,32-32,8,8,0,0,0,8-8V116a12,12,0,0,1,24,0Z" />
  </svg>
);

// Filled (Phosphor fill weight) — the only status icon that is not outline
const CheckCircleFill = (props: IconProps) => (
  <svg viewBox="0 0 256 256" fill="currentColor" {...props}>
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z" />
  </svg>
);

// `satisfies` makes a status without a color a compile error instead of a silent default
const BADGE_COLOR_BY_STATUS = {
  empty: 'neutral',
  ready: 'alternative',
  blocked: 'warning',
  done: 'success',
  partial: 'primary',
  failed: 'danger',
} satisfies Record<Release['status'], NonNullable<BadgeProps['variant']>>;

const STATUS_ICON: Record<Release['status'], React.ElementType> = {
  empty: CircleDashed,
  ready: ThumbsUp,
  blocked: HandPalm,
  done: CheckCircleFill,
  partial: CircleHalfIcon,
  failed: ThumbsDown,
};

const STATUS_MESSAGES = {
  empty: { id: 'content-releases.pages.Releases.status.empty', defaultMessage: 'Empty' },
  ready: { id: 'content-releases.pages.Releases.status.ready', defaultMessage: 'Ready' },
  blocked: { id: 'content-releases.pages.Releases.status.blocked', defaultMessage: 'Blocked' },
  done: { id: 'content-releases.pages.Releases.status.done', defaultMessage: 'Done' },
  partial: { id: 'content-releases.pages.Releases.status.partial', defaultMessage: 'Partial' },
  failed: { id: 'content-releases.pages.Releases.status.failed', defaultMessage: 'Failed' },
} satisfies Record<Release['status'], MessageDescriptor>;

const getBadgeColorProps = (color: NonNullable<BadgeProps['variant']>) => ({
  textColor: `${color}600`,
  backgroundColor: `${color}100`,
  borderColor: `${color}200`,
});

const ReleaseStatusBadge = ({ status }: { status: Release['status'] }) => {
  const { formatMessage } = useIntl();
  const Icon = STATUS_ICON[status];

  return (
    <Badge {...getBadgeColorProps(BADGE_COLOR_BY_STATUS[status])}>
      <Flex tag="span" gap={1} alignItems="center">
        <Icon width="1.4rem" height="1.4rem" aria-hidden />
        {formatMessage(STATUS_MESSAGES[status])}
      </Flex>
    </Badge>
  );
};

export { ReleaseStatusBadge, STATUS_MESSAGES, getBadgeColorProps };

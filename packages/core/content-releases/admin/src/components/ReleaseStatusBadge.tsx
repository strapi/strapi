import { Badge, type BadgeProps } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import type { Release } from '../../../shared/contracts/releases';
import type { MessageDescriptor } from 'react-intl';

// `satisfies` makes a status without a color a compile error instead of a silent default
const BADGE_COLOR_BY_STATUS = {
  empty: 'neutral',
  ready: 'alternative',
  blocked: 'warning',
  done: 'success',
  partial: 'primary',
  failed: 'danger',
} satisfies Record<Release['status'], NonNullable<BadgeProps['variant']>>;

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

  return (
    <Badge {...getBadgeColorProps(BADGE_COLOR_BY_STATUS[status])}>
      {formatMessage(STATUS_MESSAGES[status])}
    </Badge>
  );
};

export { ReleaseStatusBadge, STATUS_MESSAGES, getBadgeColorProps };

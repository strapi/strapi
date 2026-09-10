import { Badge, Flex, Tooltip } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetReleaseStatusQuery } from '../services/spaces';
import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';
import { getTranslation } from '../utils/getTranslation';

import type { ReleaseBucketStatus } from '../services/spaces';

const COLORS: Record<ReleaseBucketStatus, string> = {
  ready: 'success',
  blocked: 'warning',
  done: 'primary',
  empty: 'neutral',
};

const badgeProps = (status: ReleaseBucketStatus) => ({
  textColor: `${COLORS[status]}600`,
  backgroundColor: `${COLORS[status]}100`,
});

interface ReleaseWorkspaceStatusProps {
  release: { id: number | string };
}

/**
 * Per-workspace readiness of a release, rendered next to its global status
 * (content-releases' `registerReleaseDetailsExtension` seam). The default
 * workspace sees every workspace and the shared entries; a sub-workspace sees
 * its own bucket. Publishing itself stays a default-workspace action.
 */
export const ReleaseWorkspaceStatus = ({ release }: ReleaseWorkspaceStatusProps) => {
  const { formatMessage } = useIntl();
  const isDefault = getCurrentSpaceSlug() === DEFAULT_SPACE_SLUG;
  const { data } = useGetReleaseStatusQuery({ id: String(release.id) });

  if (!data) {
    return null;
  }

  const buckets = [
    ...data.byWorkspace.map((bucket) => ({
      key: bucket.slug,
      label: bucket.name,
      ...bucket,
    })),
    ...(isDefault && data.shared.total > 0
      ? [
          {
            key: '__shared__',
            label: formatMessage({ id: getTranslation('entry.shared'), defaultMessage: 'Shared' }),
            ...data.shared,
          },
        ]
      : []),
  ].filter((bucket) => isDefault || bucket.total > 0 || data.byWorkspace.length === 1);

  return (
    <Flex gap={1} wrap="wrap">
      {buckets.map((bucket) => (
        <Tooltip
          key={bucket.key}
          label={formatMessage(
            {
              id: getTranslation('releases.bucket.tooltip'),
              defaultMessage:
                '{total, plural, =0 {No entry} one {# entry} other {# entries}}{invalid, plural, =0 {} other {, # not ready}}',
            },
            { total: bucket.total, invalid: bucket.invalid }
          )}
        >
          <Badge {...badgeProps(bucket.status)}>
            {bucket.label}: {bucket.status}
          </Badge>
        </Tooltip>
      ))}
    </Flex>
  );
};

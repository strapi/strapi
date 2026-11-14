import { Badge, Flex, type BadgeProps } from '@strapi/design-system';
import { Button } from '@strapi/design-system/next';
import { useIntl, type MessageDescriptor } from 'react-intl';

import { getBadgeColorProps } from './ReleaseStatusBadge';

import type { ReleaseActionOutcome } from '../../../shared/constants';
import type { ReleaseAction } from '../../../shared/contracts/release-actions';

const isActionNotReady = ({
  type,
  isEntryValid,
}: {
  type: ReleaseAction['type'];
  isEntryValid: ReleaseAction['isEntryValid'] | null;
}) => type === 'publish' && isEntryValid !== true;

type SkippedOutcome = Exclude<ReleaseActionOutcome, 'published' | 'unpublished'>;

const SKIPPED_REASONS = {
  skipped_invalid: {
    title: {
      id: 'content-releases.pages.ReleaseDetails.outcome.skipped-invalid',
      defaultMessage: 'Validation error',
    },
  },
  skipped_not_approved: {
    title: {
      id: 'content-releases.pages.ReleaseDetails.outcome.skipped-not-approved',
      defaultMessage: 'Not ready to publish',
    },
  },
  skipped_error: {
    title: {
      id: 'content-releases.pages.ReleaseDetails.outcome.skipped-error',
      defaultMessage: 'Error',
    },
  },
  skipped_held: {
    title: {
      id: 'content-releases.pages.ReleaseDetails.outcome.skipped-held',
      defaultMessage: 'Waiting on other entries',
    },
    description: {
      id: 'content-releases.pages.ReleaseDetails.outcome.skipped-held.description',
      defaultMessage:
        'This release requires every entry to be ready and released together: another entry wasn’t ready or couldn’t be released, so none were.',
    },
  },
  skipped_missed: {
    title: {
      id: 'content-releases.pages.ReleaseDetails.outcome.skipped-missed',
      defaultMessage: 'Server unavailable',
    },
    description: {
      id: 'content-releases.pages.ReleaseDetails.outcome.skipped-missed.description',
      defaultMessage: 'The server was down at the scheduled time, so the release didn’t run.',
    },
  },
} satisfies Record<SkippedOutcome, { title: MessageDescriptor; description?: MessageDescriptor }>;

const isSkippedOutcome = (outcome: ReleaseActionOutcome): outcome is SkippedOutcome =>
  outcome in SKIPPED_REASONS;

const hasSkipReason = (outcome: ReleaseActionOutcome | null, isOutcomeUnknown: boolean) =>
  !isOutcomeUnknown && outcome !== null && isSkippedOutcome(outcome);

const InlineBadge = (props: BadgeProps) => <Badge {...props} tag={'span' as 'div'} />;

interface ReasonCellProps {
  label: string;
  // The reason the button names, when the entry has a single one: "View details" otherwise
  reasonLabel?: string | null;
  ariaLabel: string;
  onOpenReason: () => void;
}

const ReasonCell = ({ label, reasonLabel, ariaLabel, onOpenReason }: ReasonCellProps) => {
  const { formatMessage } = useIntl();
  const buttonLabel =
    reasonLabel ??
    formatMessage({
      id: 'content-releases.pages.ReleaseDetails.reason.see-reason',
      defaultMessage: 'View details',
    });

  return (
    <Flex gap={4} alignItems="center" tag="span">
      <InlineBadge {...getBadgeColorProps('danger')}>{label}</InlineBadge>
      <Button
        variant="ghost-destructive"
        size="xs"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={onOpenReason}
      >
        {buttonLabel}
        {/* TEMP: 1.4px stroked chevron — /regular CaretRightIcon renders too thin at this size */}
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          data-icon="inline-end"
        >
          <polyline points="6 4 10 8 6 12" />
        </svg>
      </Button>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PlannedActionStatus
 * -----------------------------------------------------------------------------------------------*/

interface PlannedActionStatusProps {
  action: ReleaseAction['type'];
  isEntryValid: ReleaseAction['isEntryValid'] | null;
  entryName: string;
  reasonLabel?: string | null;
  onOpenReason: () => void;
}

/**
 * Whether a planned release can publish the entry. An unpublish is always ready: nothing is checked.
 */
export const PlannedActionStatus = ({
  action,
  isEntryValid,
  entryName,
  reasonLabel,
  onOpenReason,
}: PlannedActionStatusProps) => {
  const { formatMessage } = useIntl();

  if (!isActionNotReady({ type: action, isEntryValid })) {
    return (
      <Badge {...getBadgeColorProps('success')}>
        {formatMessage({
          id: 'content-releases.pages.ReleaseDetails.entry-validation.ready',
          defaultMessage: 'Ready',
        })}
      </Badge>
    );
  }

  return (
    <ReasonCell
      reasonLabel={reasonLabel}
      label={formatMessage({
        id: 'content-releases.pages.ReleaseDetails.entry-validation.not-ready-short',
        defaultMessage: 'Not ready',
      })}
      ariaLabel={formatMessage(
        {
          id: 'content-releases.pages.ReleaseDetails.entry-validation.not-ready-label',
          defaultMessage: 'Why {entry} isn’t ready',
        },
        { entry: entryName }
      )}
      onOpenReason={onOpenReason}
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * ReleasedActionStatus
 * -----------------------------------------------------------------------------------------------*/

interface ReleasedActionStatusProps {
  outcome: ReleaseActionOutcome | null;
  // The release failed before the upgrade: the old run recorded nothing, so the outcome the
  // upgrade sweep stored is a guess
  isOutcomeUnknown: boolean;
  entryName: string;
  reasonLabel?: string | null;
  onOpenReason: () => void;
}

/**
 * What a run did to the entry. Every skipped pill reads the same, so the column lines up: the
 * drawer says why.
 */
export const ReleasedActionStatus = ({
  outcome,
  isOutcomeUnknown,
  entryName,
  reasonLabel,
  onOpenReason,
}: ReleasedActionStatusProps) => {
  const { formatMessage } = useIntl();

  if (!hasSkipReason(outcome, isOutcomeUnknown)) {
    return isOutcomeUnknown || !outcome ? (
      <Badge {...getBadgeColorProps('neutral')}>
        {formatMessage({
          id: 'content-releases.pages.ReleaseDetails.outcome.unknown',
          defaultMessage: 'Unknown',
        })}
      </Badge>
    ) : (
      <Badge {...getBadgeColorProps('success')}>
        {formatMessage({
          id: 'content-releases.pages.ReleaseDetails.outcome.done',
          defaultMessage: 'Done',
        })}
      </Badge>
    );
  }

  return (
    <ReasonCell
      reasonLabel={reasonLabel}
      label={formatMessage({
        id: 'content-releases.pages.ReleaseDetails.outcome.skipped',
        defaultMessage: 'Skipped',
      })}
      ariaLabel={formatMessage(
        {
          id: 'content-releases.pages.ReleaseDetails.outcome.details-label',
          defaultMessage: 'Why {entry} was skipped',
        },
        { entry: entryName }
      )}
      onOpenReason={onOpenReason}
    />
  );
};

export { InlineBadge, SKIPPED_REASONS, hasSkipReason, isActionNotReady, isSkippedOutcome };

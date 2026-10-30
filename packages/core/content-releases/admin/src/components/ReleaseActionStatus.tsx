import { Badge, Flex, type BadgeProps } from '@strapi/design-system';
import { ChevronRight } from '@strapi/icons';
import { useIntl, type MessageDescriptor } from 'react-intl';
import { styled } from 'styled-components';

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

const PillButton = styled.button`
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius};

  svg {
    fill: currentColor;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }
`;

interface ReasonPillProps {
  label: string;
  ariaLabel: string;
  onOpenReason: () => void;
}

const ReasonPill = ({ label, ariaLabel, onOpenReason }: ReasonPillProps) => (
  <PillButton type="button" aria-label={ariaLabel} aria-haspopup="dialog" onClick={onOpenReason}>
    <InlineBadge {...getBadgeColorProps('danger')}>
      <Flex gap={1} tag="span">
        {label}
        <ChevronRight width="0.8rem" height="0.8rem" aria-hidden />
      </Flex>
    </InlineBadge>
  </PillButton>
);

/* -------------------------------------------------------------------------------------------------
 * PlannedActionStatus
 * -----------------------------------------------------------------------------------------------*/

interface PlannedActionStatusProps {
  action: ReleaseAction['type'];
  isEntryValid: ReleaseAction['isEntryValid'] | null;
  entryName: string;
  onOpenReason: () => void;
}

/**
 * Whether a planned release can publish the entry. An unpublish is always ready: nothing is checked.
 */
export const PlannedActionStatus = ({
  action,
  isEntryValid,
  entryName,
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
    <ReasonPill
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
    <ReasonPill
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

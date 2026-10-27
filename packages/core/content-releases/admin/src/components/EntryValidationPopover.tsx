import * as React from 'react';

import { Badge, Button, LinkButton, Flex, Typography, Popover } from '@strapi/design-system';
import { CheckCircle, CrossCircle, ArrowsCounterClockwise, CaretDown } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl, MessageDescriptor } from 'react-intl';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';

import type { ReleaseActionOutcome } from '../../../shared/constants';
import type {
  ReleaseAction,
  ReleaseActionEntry,
  ReleaseActionReason,
  Stage,
} from '../../../shared/contracts/release-actions';
import type { Struct, UID } from '@strapi/types';

type ReleaseActionSchema = Struct.ContentTypeSchema & {
  hasReviewWorkflow: boolean;
  stageRequiredToPublish?: Stage;
};

const StyledPopoverFlex = styled(Flex)`
  width: 100%;
  max-width: 256px;

  & > * {
    border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
  }

  & > *:last-child {
    border-bottom: none;
  }
`;

const ButtonContent = styled(Flex)`
  svg {
    fill: currentColor;
  }
`;

const CustomStatusButton = ({
  children,
  icon,
  color,
}: {
  icon: React.ReactElement;
  color: string;
} & React.PropsWithChildren) => {
  return (
    <Popover.Trigger>
      <Button variant="ghost" endIcon={<CaretDown />}>
        <ButtonContent color={color} gap={2}>
          {icon}
          <Typography textColor={color} variant="omega" fontWeight="bold">
            {children}
          </Typography>
        </ButtonContent>
      </Button>
    </Popover.Trigger>
  );
};

interface ValidationStatusProps {
  action: ReleaseAction['type'];
  status: ReleaseAction['status'];
  isNotReady: boolean;
}

const EntryStatusTrigger = ({ action, status, isNotReady }: ValidationStatusProps) => {
  const { formatMessage } = useIntl();

  if (action === 'publish') {
    if (isNotReady) {
      return (
        <CustomStatusButton icon={<CrossCircle />} color="danger600">
          {formatMessage({
            id: 'content-releases.pages.ReleaseDetails.entry-validation.not-ready',
            defaultMessage: 'Not ready to publish',
          })}
        </CustomStatusButton>
      );
    }

    if (status === 'draft') {
      return (
        <CustomStatusButton icon={<CheckCircle />} color="success600">
          {formatMessage({
            id: 'content-releases.pages.ReleaseDetails.entry-validation.ready-to-publish',
            defaultMessage: 'Ready to publish',
          })}
        </CustomStatusButton>
      );
    }

    if (status === 'modified') {
      return (
        <CustomStatusButton icon={<ArrowsCounterClockwise />} color="alternative600">
          {formatMessage({
            id: 'content-releases.pages.ReleaseDetails.entry-validation.modified',
            defaultMessage: 'Ready to publish changes',
          })}
        </CustomStatusButton>
      );
    }

    return (
      <CustomStatusButton icon={<CheckCircle />} color="success600">
        {formatMessage({
          id: 'content-releases.pages.ReleaseDetails.entry-validation.already-published',
          defaultMessage: 'Already published',
        })}
      </CustomStatusButton>
    );
  }

  if (status === 'published') {
    return (
      <CustomStatusButton icon={<CheckCircle />} color="success600">
        {formatMessage({
          id: 'content-releases.pages.ReleaseDetails.entry-validation.ready-to-unpublish',
          defaultMessage: 'Ready to unpublish',
        })}
      </CustomStatusButton>
    );
  }

  return (
    <CustomStatusButton icon={<CheckCircle />} color="success600">
      {formatMessage({
        id: 'content-releases.pages.ReleaseDetails.entry-validation.already-unpublished',
        defaultMessage: 'Already unpublished',
      })}
    </CustomStatusButton>
  );
};

interface EntryLink {
  kind: Struct.ContentTypeKind;
  contentTypeUid: UID.ContentType;
  documentId: string;
  locale?: string | null;
}

interface FieldsValidationProps {
  errorCount: number | null;
  entryLink?: EntryLink;
}

const FieldsValidation = ({ errorCount, entryLink }: FieldsValidationProps) => {
  const { formatMessage } = useIntl();
  const hasErrors = errorCount !== null;

  return (
    <Flex direction="column" gap={1} width="100%" padding={5}>
      <Flex gap={2} width="100%">
        <Typography fontWeight="bold">
          {formatMessage({
            id: 'content-releases.pages.ReleaseDetails.entry-validation.fields',
            defaultMessage: 'Fields',
          })}
        </Typography>
        {hasErrors ? <CrossCircle fill="danger600" /> : <CheckCircle fill="success600" />}
      </Flex>
      <Typography width="100%" textColor={hasErrors ? 'danger600' : 'neutral600'}>
        {hasErrors
          ? formatMessage(
              {
                id: 'content-releases.pages.ReleaseDetails.entry-validation.fields.error',
                defaultMessage: '{errors, plural, one {# error} other {# errors}} on fields',
              },
              { errors: errorCount }
            )
          : formatMessage({
              id: 'content-releases.pages.ReleaseDetails.entry-validation.fields.success',
              defaultMessage: 'All fields are filled correctly',
            })}
      </Typography>
      {hasErrors && entryLink && (
        <LinkButton
          tag={Link}
          to={{
            pathname: `/content-manager/${entryLink.kind === 'collectionType' ? 'collection-types' : 'single-types'}/${entryLink.contentTypeUid}/${entryLink.documentId}`,
            search: entryLink.locale
              ? stringify({
                  plugins: {
                    i18n: {
                      locale: entryLink.locale,
                    },
                  },
                })
              : '',
          }}
          variant="secondary"
          fullWidth
          state={{ forceValidation: true }}
        >
          {formatMessage({
            id: 'content-releases.pages.ReleaseDetails.entry-validation.fields.see-errors',
            defaultMessage: 'See errors',
          })}
        </LinkButton>
      )}
    </Flex>
  );
};

interface ReviewStageValidationProps {
  stageReason?: ReleaseActionReason['stage'];
  schema?: ReleaseActionSchema;
}

const getReviewStageIcon = ({ stageReason, schema }: ReviewStageValidationProps) => {
  if (stageReason) {
    return <CrossCircle fill="danger600" />;
  }
  if (!schema?.hasReviewWorkflow) {
    return <CheckCircle fill="neutral200" />;
  }
  return <CheckCircle fill="success600" />;
};

const getReviewStageMessage = (
  { stageReason, schema }: ReviewStageValidationProps,
  formatMessage: (messageDescriptor: MessageDescriptor, values?: Record<string, string>) => string
) => {
  if (stageReason) {
    return formatMessage(
      {
        id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage.not-ready',
        defaultMessage: 'This entry is not at the required stage for publishing ({stageName})',
      },
      {
        stageName: stageReason.requiredStage.name,
      }
    );
  }

  if (!schema?.hasReviewWorkflow) {
    return formatMessage({
      id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage.not-enabled',
      defaultMessage: 'This entry is not associated to any workflow.',
    });
  }

  if (schema.stageRequiredToPublish) {
    return formatMessage(
      {
        id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage.ready',
        defaultMessage: 'This entry is at the required stage for publishing ({stageName})',
      },
      {
        stageName: schema.stageRequiredToPublish.name,
      }
    );
  }

  return formatMessage({
    id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage.stage-not-required',
    defaultMessage: 'No required stage for publication',
  });
};

const ReviewStageValidation = (props: ReviewStageValidationProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" gap={1} width="100%" padding={5}>
      <Flex gap={2} width="100%">
        <Typography fontWeight="bold">
          {formatMessage({
            id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage',
            defaultMessage: 'Review stage',
          })}
        </Typography>
        {getReviewStageIcon(props)}
      </Flex>
      <Typography textColor={props.stageReason ? 'danger600' : 'neutral600'}>
        {getReviewStageMessage(props, formatMessage)}
      </Typography>
    </Flex>
  );
};

interface ReasonDetailsProps {
  reason: ReleaseActionReason | null;
  schema?: ReleaseActionSchema;
  entryLink?: EntryLink;
  isFrozen: boolean;
}

const ReasonDetails = ({ reason, schema, entryLink, isFrozen }: ReasonDetailsProps) => {
  const { formatMessage } = useIntl();

  if (reason?.error) {
    return (
      <Flex direction="column" gap={1} width="100%" padding={5}>
        <Typography textColor="danger600">
          {formatMessage(
            {
              id: 'content-releases.pages.ReleaseDetails.entry-validation.error',
              defaultMessage:
                '{isFrozen, select, true {Couldn’t be published} other {Couldn’t be checked}}: {name}',
            },
            { isFrozen, name: reason.error.name }
          )}
        </Typography>
      </Flex>
    );
  }

  return (
    <StyledPopoverFlex direction="column">
      <FieldsValidation
        errorCount={reason?.validation ? reason.validation.errors.length : null}
        entryLink={entryLink}
      />
      <ReviewStageValidation stageReason={reason?.stage} schema={schema} />
    </StyledPopoverFlex>
  );
};

const getEntryLink = (
  schema: ReleaseActionSchema | undefined,
  entry: ReleaseActionEntry | null
): EntryLink | undefined =>
  schema && entry
    ? {
        kind: schema.kind,
        contentTypeUid: schema.uid,
        documentId: entry.documentId,
        locale: entry.locale,
      }
    : undefined;

interface EntryValidationPopoverProps {
  action: ReleaseAction['type'];
  schema?: ReleaseActionSchema;
  entry: ReleaseActionEntry;
  status: ReleaseAction['status'];
  isEntryValid: ReleaseAction['isEntryValid'] | null;
  reason: ReleaseActionReason | null;
}

export const EntryValidationPopover = ({
  schema,
  entry,
  status,
  action,
  isEntryValid,
  reason,
}: EntryValidationPopoverProps) => {
  const isNotReady = action === 'publish' && isEntryValid !== true;

  return (
    <Popover.Root>
      <EntryStatusTrigger action={action} status={status} isNotReady={isNotReady} />
      <Popover.Content>
        <ReasonDetails
          reason={isNotReady ? reason : null}
          schema={schema}
          entryLink={getEntryLink(schema, entry)}
          isFrozen={false}
        />
      </Popover.Content>
    </Popover.Root>
  );
};

type BadgeColor = 'success' | 'danger' | 'neutral';

const OUTCOME_PILLS = {
  published: {
    color: 'success',
    label: { id: 'content-releases.pages.ReleaseDetails.outcome.done', defaultMessage: 'Done' },
  },
  unpublished: {
    color: 'success',
    label: { id: 'content-releases.pages.ReleaseDetails.outcome.done', defaultMessage: 'Done' },
  },
  skipped_invalid: {
    color: 'danger',
    label: {
      id: 'content-releases.pages.ReleaseDetails.outcome.skipped-invalid',
      defaultMessage: 'Skipped: Validation error',
    },
  },
  skipped_not_approved: {
    color: 'danger',
    label: {
      id: 'content-releases.pages.ReleaseDetails.outcome.skipped-not-approved',
      defaultMessage: 'Skipped: Not ready to publish',
    },
  },
  skipped_error: {
    color: 'danger',
    label: {
      id: 'content-releases.pages.ReleaseDetails.outcome.skipped-error',
      defaultMessage: 'Skipped: Error',
    },
  },
  skipped_held: {
    color: 'danger',
    label: {
      id: 'content-releases.pages.ReleaseDetails.outcome.skipped-held',
      defaultMessage: 'Skipped: Waiting on other entries',
    },
  },
  skipped_missed: {
    color: 'danger',
    label: {
      id: 'content-releases.pages.ReleaseDetails.outcome.skipped-missed',
      defaultMessage: 'Skipped: Server unavailable',
    },
  },
} satisfies Record<ReleaseActionOutcome, { color: BadgeColor; label: MessageDescriptor }>;

const UNKNOWN_PILL = {
  color: 'neutral',
  label: { id: 'content-releases.pages.ReleaseDetails.outcome.unknown', defaultMessage: 'Unknown' },
} satisfies { color: BadgeColor; label: MessageDescriptor };

// Skips with a reason to show. Held and missed entries were never checked.
const OUTCOMES_WITH_DETAILS: ReleaseActionOutcome[] = [
  'skipped_invalid',
  'skipped_not_approved',
  'skipped_error',
];

interface ReleaseActionOutcomeStatusProps {
  outcome: ReleaseActionOutcome | null;
  reason: ReleaseActionReason | null;
  schema?: ReleaseActionSchema;
  entry: ReleaseActionEntry | null;
  // The release failed before the upgrade: the old run recorded nothing, so the outcome the
  // upgrade sweep stored is a guess
  isOutcomeUnknown: boolean;
}

export const ReleaseActionOutcomeStatus = ({
  outcome,
  reason,
  schema,
  entry,
  isOutcomeUnknown,
}: ReleaseActionOutcomeStatusProps) => {
  const { formatMessage } = useIntl();
  const pill = isOutcomeUnknown || !outcome ? UNKNOWN_PILL : OUTCOME_PILLS[outcome];
  const hasDetails = !isOutcomeUnknown && outcome && OUTCOMES_WITH_DETAILS.includes(outcome);

  return (
    <Flex gap={2}>
      <Badge
        textColor={`${pill.color}600`}
        backgroundColor={`${pill.color}100`}
        borderColor={`${pill.color}200`}
      >
        {formatMessage(pill.label)}
      </Badge>
      {hasDetails && (
        <Popover.Root>
          <Popover.Trigger>
            <Button variant="ghost" size="S">
              {formatMessage({
                id: 'content-releases.pages.ReleaseDetails.outcome.details',
                defaultMessage: 'Details',
              })}
            </Button>
          </Popover.Trigger>
          <Popover.Content>
            <ReasonDetails
              reason={reason}
              schema={schema}
              entryLink={getEntryLink(schema, entry)}
              isFrozen
            />
          </Popover.Content>
        </Popover.Root>
      )}
    </Flex>
  );
};

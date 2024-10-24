import * as React from 'react';

import { FormErrors, FormValues } from '@strapi/admin/strapi-admin';
import { unstable_useDocument } from '@strapi/content-manager/strapi-admin';
import { Button, LinkButton, Flex, Typography, Popover } from '@strapi/design-system';
import { CheckCircle, CrossCircle, ArrowsCounterClockwise, CaretDown } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl, MessageDescriptor } from 'react-intl';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';

import type {
  ReleaseAction,
  ReleaseActionEntry,
  Stage,
} from '../../../shared/contracts/release-actions';
import type { Struct } from '@strapi/types';

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

interface EntryValidationPopoverProps {
  action: ReleaseAction['type'];
  schema?: Struct.ContentTypeSchema & {
    hasReviewWorkflow: boolean;
    stageRequiredToPublish?: Stage;
  };
  entry: ReleaseActionEntry;
  status: ReleaseAction['status'];
}

interface ValidationStatusProps {
  action: ReleaseAction['type'];
  status: ReleaseAction['status'];
  hasErrors: boolean | null;
  requiredStage?: Stage;
  entryStage?: Stage;
}

const EntryStatusTrigger = ({
  action,
  status,
  hasErrors,
  requiredStage,
  entryStage,
}: ValidationStatusProps) => {
  const { formatMessage } = useIntl();

  if (action === 'publish') {
    if (hasErrors || (requiredStage && requiredStage.id !== entryStage?.id)) {
      return (
        <Popover.Trigger>
          <Button
            variant="ghost"
            startIcon={<CrossCircle fill="danger600" />}
            endIcon={<CaretDown />}
          >
            <Typography textColor="danger600" variant="omega" fontWeight="bold">
              {formatMessage({
                id: 'content-releases.pages.ReleaseDetails.entry-validation.not-ready',
                defaultMessage: 'Not ready to publish',
              })}
            </Typography>
          </Button>
        </Popover.Trigger>
      );
    }

    if (status === 'draft') {
      return (
        <Popover.Trigger>
          <Button
            variant="ghost"
            startIcon={<CheckCircle fill="success600" />}
            endIcon={<CaretDown />}
          >
            <Typography textColor="success600" variant="omega" fontWeight="bold">
              {formatMessage({
                id: 'content-releases.pages.ReleaseDetails.entry-validation.ready-to-publish',
                defaultMessage: 'Ready to publish',
              })}
            </Typography>
          </Button>
        </Popover.Trigger>
      );
    }

    if (status === 'modified') {
      return (
        <Popover.Trigger>
          <Button
            variant="ghost"
            startIcon={<ArrowsCounterClockwise fill="alternative600" />}
            endIcon={<CaretDown />}
          >
            <Typography variant="omega" fontWeight="bold" textColor="alternative600">
              {formatMessage({
                id: 'content-releases.pages.ReleaseDetails.entry-validation.modified',
                defaultMessage: 'Ready to publish changes',
              })}
            </Typography>
          </Button>
        </Popover.Trigger>
      );
    }

    return (
      <Popover.Trigger>
        <Button
          variant="ghost"
          startIcon={<CheckCircle fill="success600" />}
          endIcon={<CaretDown />}
        >
          <Typography textColor="success600" variant="omega" fontWeight="bold">
            {formatMessage({
              id: 'content-releases.pages.ReleaseDetails.entry-validation.already-published',
              defaultMessage: 'Already published',
            })}
          </Typography>
        </Button>
      </Popover.Trigger>
    );
  }

  if (status === 'published') {
    return (
      <Popover.Trigger>
        <Button
          variant="ghost"
          startIcon={<CheckCircle fill="success600" />}
          endIcon={<CaretDown />}
        >
          <Typography textColor="success600" variant="omega" fontWeight="bold">
            {formatMessage({
              id: 'content-releases.pages.ReleaseDetails.entry-validation.ready-to-unpublish',
              defaultMessage: 'Ready to unpublish',
            })}
          </Typography>
        </Button>
      </Popover.Trigger>
    );
  }

  return (
    <Popover.Trigger>
      <Button variant="ghost" startIcon={<CheckCircle fill="success600" />} endIcon={<CaretDown />}>
        <Typography textColor="success600" variant="omega" fontWeight="bold">
          {formatMessage({
            id: 'content-releases.pages.ReleaseDetails.entry-validation.already-unpublished',
            defaultMessage: 'Already unpublished',
          })}
        </Typography>
      </Button>
    </Popover.Trigger>
  );
};

interface FieldsValidationProps {
  hasErrors: boolean;
  errors: FormErrors<FormValues> | null;
  kind?: string;
  contentTypeUid?: string;
  documentId?: string;
  locale?: string;
}

const FieldsValidation = ({
  hasErrors,
  errors,
  kind,
  contentTypeUid,
  documentId,
  locale,
}: FieldsValidationProps) => {
  const { formatMessage } = useIntl();

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
      <Typography width="100%" textColor="neutral600">
        {hasErrors
          ? formatMessage(
              {
                id: 'content-releases.pages.ReleaseDetails.entry-validation.fields.error',
                defaultMessage: '{errors} errors on fields.',
              },
              { errors: errors ? Object.keys(errors).length : 0 }
            )
          : formatMessage({
              id: 'content-releases.pages.ReleaseDetails.entry-validation.fields.success',
              defaultMessage: 'All fields are filled correctly.',
            })}
      </Typography>
      {hasErrors && (
        <LinkButton
          tag={Link}
          to={{
            pathname: `/content-manager/${kind === 'collectionType' ? 'collection-types' : 'single-types'}/${contentTypeUid}/${documentId}`,
            search: locale
              ? stringify({
                  plugins: {
                    i18n: {
                      locale,
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

const getReviewStageIcon = ({
  contentTypeHasReviewWorkflow,
  requiredStage,
  entryStage,
}: {
  contentTypeHasReviewWorkflow: boolean;
  requiredStage?: Stage;
  entryStage?: Stage;
}) => {
  if (!contentTypeHasReviewWorkflow) {
    return <CheckCircle fill="neutral200" />;
  }
  if (requiredStage && requiredStage.id !== entryStage?.id) {
    return <CrossCircle fill="danger600" />;
  }
  return <CheckCircle fill="success600" />;
};

const getReviewStageMessage = ({
  contentTypeHasReviewWorkflow,
  requiredStage,
  entryStage,
  formatMessage,
}: {
  contentTypeHasReviewWorkflow: boolean;
  requiredStage?: Stage;
  entryStage?: Stage;
  formatMessage: (messageDescriptor: MessageDescriptor, values?: Record<string, string>) => string;
}) => {
  if (!contentTypeHasReviewWorkflow) {
    return formatMessage({
      id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage.not-enabled',
      defaultMessage: 'This entry is not associated to any workflow.',
    });
  }

  if (requiredStage && requiredStage.id !== entryStage?.id) {
    return formatMessage(
      {
        id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage.not-ready',
        defaultMessage: 'This entry is not at the required stage for publishing. ({stageName})',
      },
      {
        stageName: requiredStage?.name ?? '',
      }
    );
  }

  if (requiredStage && requiredStage.id === entryStage?.id) {
    return formatMessage(
      {
        id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage.ready',
        defaultMessage: 'This entry is at the required stage for publishing. ({stageName})',
      },
      {
        stageName: requiredStage?.name ?? '',
      }
    );
  }

  return formatMessage({
    id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage.stage-not-required',
    defaultMessage: 'No required stage for publication',
  });
};

const ReviewStageValidation = ({
  contentTypeHasReviewWorkflow,
  requiredStage,
  entryStage,
}: {
  contentTypeHasReviewWorkflow: boolean;
  requiredStage?: Stage;
  entryStage?: Stage;
}) => {
  const { formatMessage } = useIntl();

  const Icon = getReviewStageIcon({
    contentTypeHasReviewWorkflow,
    requiredStage,
    entryStage,
  });

  return (
    <Flex direction="column" gap={1} width="100%" padding={5}>
      <Flex gap={2} width="100%">
        <Typography fontWeight="bold">
          {formatMessage({
            id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage',
            defaultMessage: 'Review stage',
          })}
        </Typography>
        {Icon}
      </Flex>
      <Typography textColor="neutral600">
        {getReviewStageMessage({
          contentTypeHasReviewWorkflow,
          requiredStage,
          entryStage,
          formatMessage,
        })}
      </Typography>
    </Flex>
  );
};

export const EntryValidationPopover = ({
  schema,
  entry,
  status,
  action,
}: EntryValidationPopoverProps) => {
  const { validate, isLoading } = unstable_useDocument(
    {
      collectionType: schema?.kind ?? '',
      model: schema?.uid ?? '',
    },
    {
      // useDocument makes a request to get more data about the entry, but we only want to have the validation function so we skip the request
      skip: true,
    }
  );

  // Validation errors
  const errors = isLoading ? null : validate(entry);
  const hasErrors = errors ? Object.keys(errors).length > 0 : false;

  // Entry stage
  const contentTypeHasReviewWorkflow = schema?.hasReviewWorkflow ?? false;
  const requiredStage = schema?.stageRequiredToPublish;
  const entryStage = entry.strapi_stage;

  if (isLoading) {
    return null;
  }

  return (
    <Popover.Root>
      <EntryStatusTrigger
        action={action}
        status={status}
        hasErrors={hasErrors}
        requiredStage={requiredStage}
        entryStage={entryStage}
      />
      <Popover.Content>
        <StyledPopoverFlex direction="column">
          <FieldsValidation
            hasErrors={hasErrors}
            errors={errors}
            contentTypeUid={schema?.uid}
            kind={schema?.kind}
            documentId={entry.documentId}
            locale={entry.locale}
          />
          <ReviewStageValidation
            contentTypeHasReviewWorkflow={contentTypeHasReviewWorkflow}
            requiredStage={requiredStage}
            entryStage={entryStage}
          />
        </StyledPopoverFlex>
      </Popover.Content>
    </Popover.Root>
  );
};

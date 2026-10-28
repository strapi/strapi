import * as React from 'react';

import {
  Badge,
  Box,
  Button,
  Flex,
  IconButton,
  LinkButton,
  Typography,
} from '@strapi/design-system';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@strapi/design-system/next';
import { CaretDown, CaretUp, Cross } from '@strapi/icons';
import { useIntl, type MessageDescriptor } from 'react-intl';
import { Link } from 'react-router-dom';
import { styled } from 'styled-components';

import { getFieldLabel, getProblem } from '../utils/fieldErrors';

import { getEntryLinkProps, useCanReadEntry, type EntryLocation } from './EntryLinkButton';
import { InlineBadge, SKIPPED_REASONS, isSkippedOutcome } from './ReleaseActionStatus';
import { DRAWER_STYLE, ScrollArea } from './ReleaseDrawer';

import type { ReleaseActionOutcome } from '../../../shared/constants';
import type { ReleaseAction, ReleaseActionReason } from '../../../shared/contracts/release-actions';

/**
 * A row's entry, and why it wasn't, or won't be, released
 */
export interface EntryReasonDetails {
  id: ReleaseAction['id'];
  entryName: string;
  isUntitled: boolean;
  isDeleted: boolean;
  contentTypeName: string;
  localeCode?: string;
  action: ReleaseAction['type'];
  outcome: ReleaseActionOutcome | null;
  reason: ReleaseActionReason | null;
  missingReason?: 'unchecked' | 'unrecorded';
  location: EntryLocation;
}

interface EntryReasonDrawerProps {
  items: EntryReasonDetails[];
  total?: number;
  /** Loads the rows after `items`, when there are any: Next on the last one steps into them */
  onLoadMore?: () => void;
  /** Rows are loading: Next waits for them. A failed load leaves Next to try again. */
  isLoadingMore?: boolean;
  selectedId: ReleaseAction['id'] | null;
  onSelect: (id: ReleaseAction['id']) => void;
  onClose: () => void;
  releasedAt?: string | null;
}

/* -------------------------------------------------------------------------------------------------
 * Building blocks
 * -----------------------------------------------------------------------------------------------*/

const NOT_CHECKED_TITLE = {
  id: 'content-releases.reason-drawer.title.not-checked',
  defaultMessage: 'Not checked yet',
};

const REVIEW_STAGE_TITLE = {
  id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage',
  defaultMessage: 'Review stage',
};

const getReasonTitle = ({
  outcome,
  reason,
  missingReason,
}: EntryReasonDetails): MessageDescriptor | null => {
  if (outcome && isSkippedOutcome(outcome)) {
    return SKIPPED_REASONS[outcome].title;
  }

  if (missingReason === 'unchecked') {
    return NOT_CHECKED_TITLE;
  }

  if (reason?.error) {
    return SKIPPED_REASONS.skipped_error.title;
  }

  if (reason?.validation) {
    return SKIPPED_REASONS.skipped_invalid.title;
  }

  return reason?.stage ? REVIEW_STAGE_TITLE : null;
};

const useEntryLink = (details: EntryReasonDetails) => {
  const canReadEntry = useCanReadEntry(details.location);

  return !details.isDeleted && canReadEntry ? getEntryLinkProps(details.location) : null;
};

interface IssueSectionProps {
  title: string;
  count: number;
}

/**
 * A group of issues the user can fold away
 */
const IssueSection = ({ title, count, children }: IssueSectionProps & React.PropsWithChildren) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const contentId = React.useId();

  return (
    <Box
      background="neutral0"
      borderColor="warning200"
      borderStyle="solid"
      borderWidth="1px"
      hasRadius
      overflow="hidden"
    >
      <SectionToggle
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <Typography fontWeight="bold" textColor="warning700">
          {title}
        </Typography>
        {/* Spans: a button holds inline content only */}
        <Flex gap={2} tag="span">
          <InlineBadge textColor="warning700" backgroundColor="neutral0" borderColor="warning200">
            {count}
          </InlineBadge>
          {isOpen ? <CaretUp aria-hidden /> : <CaretDown aria-hidden />}
        </Flex>
      </SectionToggle>
      {isOpen && (
        <Flex id={contentId} tag="ul" direction="column" alignItems="stretch" gap={2} padding={3}>
          {children}
        </Flex>
      )}
    </Box>
  );
};

interface IssueCardProps {
  label: string;
  fieldKey?: string;
  problem: string;
}

const IssueCard = ({ label, fieldKey, problem }: IssueCardProps) => {
  return (
    <Box
      tag="li"
      background="neutral0"
      borderColor="neutral200"
      borderStyle="solid"
      borderWidth="1px"
      hasRadius
      padding={3}
    >
      <Flex direction="column" alignItems="stretch" gap={2}>
        <Flex justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography fontWeight="bold">{label}</Typography>
            {/* Orange, like its section: the status badge above is the one red */}
            <Typography textColor="warning700">{problem}</Typography>
          </Flex>
          {fieldKey && (
            <FieldKey variant="pi" title={fieldKey}>
              {fieldKey}
            </FieldKey>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EntryReasonDrawer
 * -----------------------------------------------------------------------------------------------*/

const ReasonBody = ({
  details,
  releasedAt,
}: {
  details: EntryReasonDetails;
  releasedAt?: string | null;
}) => {
  const { formatMessage, formatDate } = useIntl();
  const { reason, outcome, missingReason } = details;
  const isFrozen = outcome !== null;
  const skippedReason: { title: MessageDescriptor; description?: MessageDescriptor } | null =
    outcome && isSkippedOutcome(outcome) ? SKIPPED_REASONS[outcome] : null;
  const description = skippedReason?.description;
  const reasonTitle = getReasonTitle(details);
  const errors = reason?.validation?.errors ?? [];
  const isFieldsUnreadable =
    (Boolean(reason?.validation) && errors.length === 0) || Boolean(missingReason);
  const fieldIssueCount = errors.length || (isFieldsUnreadable ? 1 : 0);
  const issueCount = fieldIssueCount + (reason?.stage ? 1 : 0) + (reason?.error ? 1 : 0);

  return (
    <Flex direction="column" alignItems="stretch" gap={5}>
      <Flex direction="column" alignItems="flex-start" gap={2}>
        <Typography variant="sigma" textColor="neutral600">
          {formatMessage(
            {
              id: 'content-releases.reason-drawer.eyebrow',
              defaultMessage:
                '{isFrozen, select, true {Why this entry was skipped} other {Why this entry isn’t ready}}',
            },
            { isFrozen }
          )}
        </Typography>
        <DrawerTitle>
          <EntryTitle variant="beta" tag="span" $isItalic={details.isUntitled || details.isDeleted}>
            {details.entryName}
          </EntryTitle>
        </DrawerTitle>
        <Typography variant="pi" textColor="neutral600">
          {[
            details.contentTypeName,
            formatMessage(
              {
                id: 'content-releases.pages.ReleaseDetails.table.action-type',
                defaultMessage: '{isPublish, select, true {Publish} other {Unpublish}}',
              },
              { isPublish: details.action === 'publish' }
            ),
            details.localeCode,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Typography>
        <Badge textColor="danger600" backgroundColor="danger100" borderColor="danger200">
          {formatMessage(
            {
              id: 'content-releases.reason-drawer.status',
              defaultMessage:
                '{isFrozen, select, true {Skipped} other {Not ready}}{hasReason, select, true {: {reason}} other {}}',
            },
            {
              isFrozen,
              hasReason: Boolean(reasonTitle),
              reason: reasonTitle ? formatMessage(reasonTitle) : '',
            }
          )}
        </Badge>
      </Flex>

      {description ? (
        <Typography textColor="neutral700">{formatMessage(description)}</Typography>
      ) : (
        <Flex direction="column" alignItems="stretch" gap={3}>
          <Typography fontWeight="bold">
            {formatMessage(
              {
                id: 'content-releases.reason-drawer.issues',
                defaultMessage: '{count, plural, one {# issue} other {# issues}}',
              },
              { count: issueCount }
            )}
          </Typography>

          {reason?.error && (
            <IssueSection title={formatMessage(SKIPPED_REASONS.skipped_error.title)} count={1}>
              <IssueCard
                label={formatMessage(
                  {
                    id: 'content-releases.pages.ReleaseDetails.entry-validation.error',
                    defaultMessage:
                      '{step, select, publish {Couldn’t be published} unpublish {Couldn’t be unpublished} other {Couldn’t be checked}}: {name}',
                  },
                  { step: isFrozen ? details.action : 'check', name: reason.error.name }
                )}
                problem={formatMessage({
                  id: 'content-releases.reason-drawer.error.hint',
                  defaultMessage: 'Something on the server stopped it, not the entry’s content.',
                })}
              />
            </IssueSection>
          )}

          {fieldIssueCount > 0 && (
            <IssueSection
              title={formatMessage({
                id: 'content-releases.pages.ReleaseDetails.entry-validation.fields',
                defaultMessage: 'Fields',
              })}
              count={fieldIssueCount}
            >
              {errors.length > 0 ? (
                errors.map((error, index) => (
                  <IssueCard
                    key={`${error.path.join('.')}-${index}`}
                    label={
                      error.path.length > 0
                        ? getFieldLabel(error.path)
                        : formatMessage({
                            id: 'content-releases.pages.ReleaseDetails.field-error.entry',
                            defaultMessage: 'Entry',
                          })
                    }
                    fieldKey={error.path.length > 0 ? error.path.join('.') : undefined}
                    problem={getProblem(error, formatMessage)}
                  />
                ))
              ) : (
                <IssueCard
                  label={formatMessage({
                    id: 'content-releases.pages.ReleaseDetails.field-error.entry',
                    defaultMessage: 'Entry',
                  })}
                  problem={formatMessage(
                    {
                      id: 'content-releases.reason-drawer.fields.unreadable',
                      defaultMessage:
                        '{missingReason, select, unchecked {This entry hasn’t been checked yet. Saving it checks it.} unrecorded {Why it isn’t ready wasn’t recorded. Saving the entry checks it again.} other {The entry couldn’t be validated}}',
                    },
                    { missingReason: missingReason ?? 'none' }
                  )}
                />
              )}
            </IssueSection>
          )}

          {reason?.stage && (
            <IssueSection
              title={formatMessage({
                id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage',
                defaultMessage: 'Review stage',
              })}
              count={1}
            >
              <IssueCard
                label={formatMessage({
                  id: 'content-releases.pages.ReleaseDetails.entry-validation.review-stage',
                  defaultMessage: 'Review stage',
                })}
                problem={formatMessage(
                  {
                    id: 'content-releases.reason-drawer.stage',
                    defaultMessage:
                      'At {entryStage, select, none {no stage} other {{entryStage}}}, needs {requiredStage} to be published',
                  },
                  {
                    entryStage: reason.stage.entryStage?.name ?? 'none',
                    requiredStage: reason.stage.requiredStage.name,
                  }
                )}
              />
            </IssueSection>
          )}
        </Flex>
      )}

      <Box background="neutral100" hasRadius padding={3}>
        <Typography variant="pi" textColor="neutral600">
          {isFrozen && releasedAt
            ? formatMessage(
                {
                  id: 'content-releases.reason-drawer.captured',
                  defaultMessage:
                    'Captured when the release ran on {date}. The entry may have changed since.',
                },
                {
                  date: formatDate(new Date(releasedAt), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }),
                }
              )
            : formatMessage({
                id: 'content-releases.reason-drawer.checked',
                defaultMessage:
                  'Checked when the entry was last saved. Saving it again checks it again.',
              })}
        </Typography>
      </Box>
    </Flex>
  );
};

const GoToEntryLink = ({ details }: { details: EntryReasonDetails }) => {
  const { formatMessage } = useIntl();
  const link = useEntryLink(details);

  if (!link) {
    return null;
  }

  return (
    <LinkButton tag={Link} {...link}>
      {formatMessage({
        id: 'content-releases.reason-drawer.go-to-entry',
        defaultMessage: 'Go to entry',
      })}
    </LinkButton>
  );
};

/**
 * Why a row's entry wasn't, or won't be, released, in a side panel that steps through the rows
 */
export const EntryReasonDrawer = ({
  items,
  total,
  onLoadMore,
  isLoadingMore = false,
  selectedId,
  onSelect,
  onClose,
  releasedAt,
}: EntryReasonDrawerProps) => {
  const { formatMessage } = useIntl();
  const index = items.findIndex(({ id }) => id === selectedId);
  const current = index >= 0 ? items[index] : null;
  const lastShown = React.useRef<EntryReasonDetails | null>(null);
  React.useEffect(() => {
    if (current) {
      lastShown.current = current;
    }
  });
  const details =
    current ??
    (selectedId === null || lastShown.current?.id === selectedId ? lastShown.current : null);
  const rowCount = Math.max(total ?? 0, items.length);
  // The row Next was pressed on while the rows after it load
  const [advancingFrom, setAdvancingFrom] = React.useState<ReleaseAction['id'] | null>(null);
  const next = index >= 0 ? items[index + 1] : undefined;
  React.useEffect(() => {
    if (advancingFrom === null) {
      return;
    }

    // Stepped elsewhere, or closed, meanwhile: nothing to advance from
    if (advancingFrom !== selectedId) {
      setAdvancingFrom(null);
    } else if (next) {
      setAdvancingFrom(null);
      onSelect(next.id);
    }
  }, [advancingFrom, selectedId, next, onSelect]);
  const handleNext = () => {
    if (index < items.length - 1) {
      onSelect(items[index + 1].id);
    } else if (onLoadMore) {
      setAdvancingFrom(selectedId);
      onLoadMore();
    }
  };

  return (
    <Drawer
      open={selectedId !== null && details !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      swipeDirection="right"
    >
      <DrawerContent style={DRAWER_STYLE}>
        {details && (
          <DrawerLayout>
            <DrawerHeader>
              {/* Lined off from the entry, like the footer's buttons */}
              <Flex
                justifyContent="space-between"
                alignItems="center"
                gap={2}
                paddingBottom={3}
                borderColor="neutral150"
                borderStyle="solid"
                borderWidth="0 0 1px 0"
              >
                <Typography variant="pi" textColor="neutral600">
                  {/* No position for an entry that's no longer in the list */}
                  {index >= 0 &&
                    formatMessage(
                      {
                        id: 'content-releases.reason-drawer.position',
                        defaultMessage:
                          '{current} of {total} {isFrozen, select, true {skipped {total, plural, one {entry} other {entries}}} other {{total, plural, one {entry} other {entries}} not ready}}',
                      },
                      { current: index + 1, total: rowCount, isFrozen: details.outcome !== null }
                    )}
                </Typography>
                <Flex gap={2}>
                  <Button
                    variant="tertiary"
                    size="S"
                    disabled={index <= 0}
                    onClick={() => onSelect(items[index - 1].id)}
                  >
                    {formatMessage({
                      id: 'content-releases.reason-drawer.previous',
                      defaultMessage: 'Previous',
                    })}
                  </Button>
                  <Button
                    variant="tertiary"
                    size="S"
                    disabled={
                      items.length === 0 ||
                      isLoadingMore ||
                      (index === items.length - 1 && !onLoadMore)
                    }
                    onClick={handleNext}
                  >
                    {formatMessage({
                      id: 'content-releases.reason-drawer.next',
                      defaultMessage: 'Next',
                    })}
                  </Button>
                  <IconButton
                    variant="ghost"
                    onClick={onClose}
                    label={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                  >
                    <Cross />
                  </IconButton>
                </Flex>
              </Flex>
            </DrawerHeader>
            <ScrollArea>
              <Box padding={5}>
                <ReasonBody key={details.id} details={details} releasedAt={releasedAt} />
              </Box>
            </ScrollArea>
            <DrawerFooter>
              <Flex
                justifyContent="space-between"
                paddingTop={4}
                borderColor="neutral150"
                borderStyle="solid"
                borderWidth="1px 0 0 0"
              >
                <Button variant="tertiary" onClick={onClose}>
                  {formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                </Button>
                <GoToEntryLink details={details} />
              </Flex>
            </DrawerFooter>
          </DrawerLayout>
        )}
      </DrawerContent>
    </Drawer>
  );
};

const DrawerLayout = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
`;

const EntryTitle = styled(Typography)<{ $isItalic: boolean }>`
  font-style: ${({ $isItalic }) => ($isItalic ? 'italic' : 'normal')};
`;

const SectionToggle = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: ${({ theme }) => theme.spaces[3]};
  background: ${({ theme }) => theme.colors.warning100};
  border: none;
  cursor: pointer;

  &[aria-expanded='true'] {
    border-bottom: 1px solid ${({ theme }) => theme.colors.warning200};
  }

  svg {
    width: 1.2rem;
    height: 1.2rem;
    fill: ${({ theme }) => theme.colors.warning700};
  }
`;

const FieldKey = styled(Typography)`
  flex-shrink: 0;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: monospace;
  color: ${({ theme }) => theme.colors.neutral500};
`;

import * as React from 'react';

import { Badge, Button, IconButton, LinkButton } from '@strapi/design-system';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  cn,
} from '@strapi/design-system/next';
import { CaretDown, CaretUp, Cross } from '@strapi/icons';
import { useIntl, type MessageDescriptor } from 'react-intl';
import { Link } from 'react-router-dom';

import { getFieldLabel, getProblem } from '../utils/fieldErrors';

import { getEntryLinkProps, useCanReadEntry, type EntryLocation } from './EntryLinkButton';
import { InlineBadge, SKIPPED_REASONS, isSkippedOutcome } from './ReleaseActionStatus';
import { RELEASE_DRAWER_CLASS_NAME } from './ReleaseDrawer';

import type { ReleaseActionOutcome } from '../../../shared/constants';
import type { ReleaseAction, ReleaseActionReason } from '../../../shared/contracts/release-actions';
import type { Release } from '../../../shared/contracts/releases';

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
  /** The release the entries are in: when its run captured the reasons */
  release?: ReleaseDates | null;
}

type ReleaseDates = Pick<Release, 'releasedAt' | 'scheduledAt' | 'failureReason'>;

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
    <div className="overflow-hidden rounded-md border border-warning/40 bg-background">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between bg-warning/10 p-3 text-warning aria-expanded:border-b aria-expanded:border-warning/40"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span className="font-semibold">{title}</span>
        {/* Spans: a button holds inline content only */}
        <span className="flex items-center gap-2 [&>svg]:size-3 [&>svg]:fill-current">
          <InlineBadge textColor="warning700" backgroundColor="neutral0" borderColor="warning200">
            {count}
          </InlineBadge>
          {isOpen ? <CaretUp aria-hidden /> : <CaretDown aria-hidden />}
        </span>
      </button>
      {isOpen && (
        <ul id={contentId} className="flex flex-col gap-2 p-3">
          {children}
        </ul>
      )}
    </div>
  );
};

interface IssueCardProps {
  label: string;
  fieldKey?: string;
  problem: string;
}

const IssueCard = ({ label, fieldKey, problem }: IssueCardProps) => {
  return (
    <li className="flex items-start justify-between gap-2 rounded-md border border-border bg-background p-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-semibold">{label}</span>
        {/* Orange, like its section: the status badge above is the one red */}
        <span className="text-warning">{problem}</span>
      </div>
      {fieldKey && (
        <span
          className="max-w-2/5 shrink-0 truncate font-mono text-xs text-muted-foreground"
          title={fieldKey}
        >
          {fieldKey}
        </span>
      )}
    </li>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EntryReasonDrawer
 * -----------------------------------------------------------------------------------------------*/

/**
 * When the reasons were captured. A release that froze without running (it missed its schedule, or
 * failed before the upgrade) is dated by its schedule, not by when it froze.
 */
const useCapturedNote = (isFrozen: boolean, release?: ReleaseDates | null) => {
  const { formatMessage, formatDate } = useIntl();
  const formatReleaseDate = (date: string) =>
    formatDate(new Date(date), { dateStyle: 'medium', timeStyle: 'short' });

  if (isFrozen && release?.failureReason) {
    return formatMessage(
      {
        id: 'content-releases.reason-drawer.captured.not-run',
        defaultMessage:
          '{hasDate, select, true {Scheduled for {date}. } other {}}The entry may have changed since.',
      },
      {
        hasDate: Boolean(release.scheduledAt),
        date: release.scheduledAt ? formatReleaseDate(release.scheduledAt) : '',
      }
    );
  }

  if (isFrozen && release?.releasedAt) {
    return formatMessage(
      {
        id: 'content-releases.reason-drawer.captured',
        defaultMessage:
          'Captured when the release ran on {date}. The entry may have changed since.',
      },
      { date: formatReleaseDate(release.releasedAt) }
    );
  }

  return formatMessage({
    id: 'content-releases.reason-drawer.checked',
    defaultMessage: 'Checked when the entry was last saved. Saving it again checks it again.',
  });
};

const ReasonBody = ({
  details,
  release,
}: {
  details: EntryReasonDetails;
  release?: ReleaseDates | null;
}) => {
  const { formatMessage } = useIntl();
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
  const capturedNote = useCapturedNote(isFrozen, release);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-start gap-2">
        <span className="text-2xs font-semibold text-muted-foreground uppercase">
          {formatMessage(
            {
              id: 'content-releases.reason-drawer.eyebrow',
              defaultMessage:
                '{isFrozen, select, true {Why this entry was skipped} other {Why this entry isn’t ready}}',
            },
            { isFrozen }
          )}
        </span>
        <DrawerTitle
          className={cn(
            'text-xl font-semibold md:text-lg',
            (details.isUntitled || details.isDeleted) && 'italic'
          )}
        >
          {details.entryName}
        </DrawerTitle>
        <span className="text-xs text-muted-foreground">
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
        </span>
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
      </div>

      {description ? (
        <p>{formatMessage(description)}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <span className="font-semibold">
            {formatMessage(
              {
                id: 'content-releases.reason-drawer.issues',
                defaultMessage: '{count, plural, one {# issue} other {# issues}}',
              },
              { count: issueCount }
            )}
          </span>

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
                // The server keeps the message of an error meant for the user only
                problem={
                  reason.error.message ||
                  formatMessage({
                    id: 'content-releases.reason-drawer.error.hint',
                    defaultMessage: 'Something on the server stopped it, not the entry’s content.',
                  })
                }
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
                errors.map((error) => (
                  <IssueCard
                    key={`${error.path.join('.')}-${error.message}`}
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
        </div>
      )}

      <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">{capturedNote}</p>
    </div>
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
  release,
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
      <DrawerContent className={RELEASE_DRAWER_CLASS_NAME}>
        {details && (
          <div className="flex min-h-0 flex-1 flex-col">
            <DrawerHeader>
              {/* Lined off from the entry, like the footer's buttons */}
              <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                <span className="text-xs text-muted-foreground">
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
                </span>
                <div className="flex gap-2">
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
                </div>
              </div>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <ReasonBody key={details.id} details={details} release={release} />
            </div>
            <DrawerFooter>
              <div className="flex justify-between border-t border-border pt-4">
                <Button variant="tertiary" onClick={onClose}>
                  {formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                </Button>
                <GoToEntryLink details={details} />
              </div>
            </DrawerFooter>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};

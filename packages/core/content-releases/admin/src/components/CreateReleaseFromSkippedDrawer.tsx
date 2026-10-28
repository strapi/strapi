import * as React from 'react';

import { useAPIErrorHandler, useNotification } from '@strapi/admin/strapi-admin';
import { Box, Flex, IconButton, Loader, TextButton, Typography } from '@strapi/design-system';
import { CaretDown, CaretUp, Download, Trash, Upload } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import {
  useCreateReleaseFromSkippedEntriesMutation,
  useGetReleaseActionsQuery,
  useGetReleaseSettingsQuery,
} from '../services/release';
import { isBaseQueryError } from '../utils/api';

import { ReleaseDrawer, type ReleaseDrawerValues } from './ReleaseDrawer';

import type {
  FormattedReleaseAction,
  GetReleaseActions,
} from '../../../shared/contracts/release-actions';
import type { Release } from '../../../shared/contracts/releases';

export const COLLAPSED_ENTRIES_COUNT = 10;

/**
 * The query for the skipped entries the panel lists. The details page sends the same one, so
 * opening the panel reads them from the cache.
 */
export const getSkippedEntriesQuery = (releaseId: Release['id'] | string) => ({
  releaseId: releaseId.toString(),
  filter: 'skipped' as const,
  page: 1,
  pageSize: 100,
});

type SkippedEntries = GetReleaseActions.Response;

// The run won't carry over entries deleted after the release froze, so don't list them
export const getExistingEntries = (skippedEntries: SkippedEntries) =>
  Object.values(skippedEntries.data)
    .flat()
    .filter((action) => action.entry !== null);

export const hasLoadedEveryEntry = (skippedEntries: SkippedEntries) =>
  Object.values(skippedEntries.data).flat().length === skippedEntries.meta.pagination.total;

interface CreateReleaseFromSkippedDrawerProps {
  release: Pick<Release, 'id' | 'name'>;
  open: boolean;
  onClose: () => void;
}

export const CreateReleaseFromSkippedDrawer = ({
  release,
  open,
  onClose,
}: CreateReleaseFromSkippedDrawerProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [createRelease, { isLoading: isSubmitting }] = useCreateReleaseFromSkippedEntriesMutation();
  const {
    data: skippedData,
    isLoading: isLoadingEntries,
    isError: isEntriesError,
    error: entriesError,
  } = useGetReleaseActionsQuery(getSkippedEntriesQuery(release.id), { skip: !open });
  const { data: settings } = useGetReleaseSettingsQuery(undefined, { skip: !open });
  const [removedIds, setRemovedIds] = React.useState<Set<FormattedReleaseAction['id']>>(new Set());
  const [isExpanded, setIsExpanded] = React.useState(false);
  const entriesListId = React.useId();

  // The panel stays mounted while closed: start the next opening from every skipped entry
  const close = () => {
    setRemovedIds(new Set());
    setIsExpanded(false);
    onClose();
  };

  const skippedEntries = skippedData ? getExistingEntries(skippedData) : [];
  const carriedOverEntries = skippedEntries.filter((action) => !removedIds.has(action.id));
  const visibleEntries = isExpanded
    ? carriedOverEntries
    : carriedOverEntries.slice(0, COLLAPSED_ENTRIES_COUNT);
  // Removing sends the ids to keep, so it needs every skipped entry, or the unloaded ones are dropped
  const canRemoveEntries = skippedData !== undefined && hasLoadedEveryEntry(skippedData);

  const carriedOverCount = canRemoveEntries
    ? carriedOverEntries.length
    : (skippedData?.meta.pagination.total ?? 0);

  const handleSubmit = async (values: ReleaseDrawerValues) => {
    const response = await createRelease({
      id: release.id,
      ...values,
      ...(removedIds.size > 0 && { actionIds: carriedOverEntries.map((action) => action.id) }),
    });

    if ('data' in response) {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-releases.modal.release-created-notification-success',
          defaultMessage: 'Release created',
        }),
      });
      close();
      navigate(`../${response.data.data.id}`, { relative: 'path' });
    } else if (isBaseQueryError(response.error)) {
      toggleNotification({ type: 'danger', message: formatAPIError(response.error) });
    } else {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  return (
    <ReleaseDrawer
      open={open}
      onClose={close}
      onSubmit={handleSubmit}
      title={formatMessage({
        id: 'content-releases.skipped-drawer.title',
        defaultMessage: 'Create new release from skipped entries',
      })}
      submitLabel={formatMessage({
        id: 'content-releases.release-drawer.form.submit.create',
        defaultMessage: 'Create release',
      })}
      initialValues={{
        name: formatMessage(
          {
            id: 'content-releases.skipped-drawer.form.name.default',
            defaultMessage: '{name} - skipped entries',
          },
          { name: release.name }
        ),
        isScheduled: true,
        scheduledAt: null,
        timezone: null,
        // Some skipped entries may still not be ready: don't let them block the others
        releaseCondition: 'allow_partial',
      }}
      defaultTimezone={settings?.data.defaultTimezone}
      isSubmitting={isSubmitting}
      isSubmitDisabled={isLoadingEntries || carriedOverEntries.length === 0}
    >
      <Box background="neutral100" padding={4}>
        {isEntriesError ? (
          <Typography tag="p" variant="omega" textColor="danger600" role="alert">
            {isBaseQueryError(entriesError)
              ? formatAPIError(entriesError)
              : formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' })}
          </Typography>
        ) : isLoadingEntries ? (
          <Flex justifyContent="center" padding={4}>
            <Loader small />
          </Flex>
        ) : (
          <>
            <Flex justifyContent="space-between" alignItems="center" paddingBottom={3}>
              <Typography variant="delta" tag="h3">
                {formatMessage(
                  {
                    id: 'content-releases.skipped-drawer.entries.title',
                    defaultMessage:
                      '{count, plural, one {# entry carried over} other {# entries carried over}}',
                  },
                  { count: carriedOverCount }
                )}
              </Typography>
              {carriedOverEntries.length > COLLAPSED_ENTRIES_COUNT && (
                <TextButton
                  onClick={() => setIsExpanded((prev) => !prev)}
                  endIcon={isExpanded ? <CaretUp /> : <CaretDown />}
                  aria-expanded={isExpanded}
                  aria-controls={entriesListId}
                >
                  {isExpanded
                    ? formatMessage({
                        id: 'content-releases.skipped-drawer.entries.show-less',
                        defaultMessage: 'Show less',
                      })
                    : formatMessage({
                        id: 'content-releases.skipped-drawer.entries.show-more',
                        defaultMessage: 'Show more',
                      })}
                </TextButton>
              )}
            </Flex>
            <Flex tag="ul" id={entriesListId} direction="column" alignItems="stretch" gap={2}>
              {visibleEntries.map((action) => (
                <CarriedOverEntry
                  key={action.id}
                  action={action}
                  onRemove={
                    canRemoveEntries && carriedOverEntries.length > 1
                      ? () => setRemovedIds((prev) => new Set(prev).add(action.id))
                      : undefined
                  }
                />
              ))}
            </Flex>
          </>
        )}
      </Box>
    </ReleaseDrawer>
  );
};

/* -------------------------------------------------------------------------------------------------
 * CarriedOverEntry
 * -----------------------------------------------------------------------------------------------*/

interface CarriedOverEntryProps {
  action: FormattedReleaseAction;
  onRemove?: () => void;
}

const CarriedOverEntry = ({ action, onRemove }: CarriedOverEntryProps) => {
  const { formatMessage } = useIntl();
  const entryTitle = action.contentType.mainFieldValue || action.entryDocumentId;

  return (
    <Flex
      tag="li"
      background="neutral0"
      hasRadius
      borderColor="neutral150"
      paddingTop={2}
      paddingBottom={2}
      paddingLeft={3}
      paddingRight={2}
      gap={3}
    >
      <Box flex={2} minWidth={0}>
        <Typography variant="pi" fontWeight="semiBold" ellipsis>
          {entryTitle}
        </Typography>
      </Box>
      <Box flex={1}>
        <Typography variant="pi" textColor="neutral600">
          {action.locale?.name ?? '-'}
        </Typography>
      </Box>
      <Flex flex={1} gap={1}>
        {action.type === 'publish' ? <Upload /> : <Download />}
        <Typography variant="pi" textColor="neutral600">
          {action.type === 'publish'
            ? formatMessage({
                id: 'content-releases.skipped-drawer.entries.publish',
                defaultMessage: 'Publish',
              })
            : formatMessage({
                id: 'content-releases.skipped-drawer.entries.unpublish',
                defaultMessage: 'Unpublish',
              })}
        </Typography>
      </Flex>
      <IconButton
        variant="ghost"
        onClick={onRemove}
        disabled={!onRemove}
        label={formatMessage(
          {
            id: 'content-releases.skipped-drawer.entries.remove',
            defaultMessage: 'Remove {entry}',
          },
          { entry: entryTitle }
        )}
      >
        <Trash />
      </IconButton>
    </Flex>
  );
};

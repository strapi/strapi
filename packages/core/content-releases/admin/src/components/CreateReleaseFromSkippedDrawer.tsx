import * as React from 'react';

import { isFetchError, useAPIErrorHandler, useNotification } from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Checkbox,
  DatePicker,
  Field,
  Flex,
  IconButton,
  Loader,
  Radio,
  TextButton,
  TextInput,
  TimePicker,
  Typography,
} from '@strapi/design-system';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@strapi/design-system/next';
import { CaretDown, CaretUp, Cross, Download, Trash, Upload } from '@strapi/icons';
import { format, formatISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { Form, Formik } from 'formik';
import { useIntl, type MessageDescriptor } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { DEFAULT_RELEASE_CONDITION, RELEASE_CONDITIONS } from '../../../shared/constants';
import {
  useCreateReleaseFromSkippedEntriesMutation,
  useGetReleaseActionsQuery,
  useGetReleaseSettingsQuery,
} from '../services/release';
import { getTimezones } from '../utils/time';
import { RELEASE_SCHEMA } from '../validation/schemas';

import { TimezoneComponent, type FormValues } from './ReleaseModal';

import type { FormattedReleaseAction } from '../../../shared/contracts/release-actions';
import type { Release, ReleaseCondition } from '../../../shared/contracts/releases';

const SKIPPED_ENTRIES_PAGE_SIZE = 100;
export const COLLAPSED_ENTRIES_COUNT = 10;
const DRAWER_STYLE = {
  '--drawer-inset': '1.6rem',
  '--drawer-content-width': '50rem',
} as React.CSSProperties;

interface DrawerFormValues extends FormValues {
  releaseCondition: ReleaseCondition;
}

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
  const { formatAPIError } = useAPIErrorHandler();
  const [createRelease, { isLoading: isSubmitting }] = useCreateReleaseFromSkippedEntriesMutation();
  const { data: settings } = useGetReleaseSettingsQuery();
  const { data: skippedData, isLoading: isLoadingEntries } = useGetReleaseActionsQuery(
    {
      releaseId: release.id.toString(),
      filter: 'skipped',
      page: 1,
      pageSize: SKIPPED_ENTRIES_PAGE_SIZE,
    },
    { skip: !open }
  );
  const [removedIds, setRemovedIds] = React.useState<Set<FormattedReleaseAction['id']>>(new Set());
  const [isExpanded, setIsExpanded] = React.useState(false);

  // The panel stays mounted while closed: start the next opening from every skipped entry
  const close = () => {
    setRemovedIds(new Set());
    setIsExpanded(false);
    onClose();
  };

  // The run won't carry over entries deleted after the release froze, so don't list them
  const skippedEntries = Object.values(skippedData?.data ?? {})
    .flat()
    .filter((action) => action.entry !== null);
  const carriedOverEntries = skippedEntries.filter((action) => !removedIds.has(action.id));
  const visibleEntries = isExpanded
    ? carriedOverEntries
    : carriedOverEntries.slice(0, COLLAPSED_ENTRIES_COUNT);
  // Only send the ids to keep when every skipped entry is loaded, or the rest would be dropped
  const canRemoveEntries =
    skippedData !== undefined &&
    Object.values(skippedData.data).flat().length === skippedData.meta.pagination.total;

  const carriedOverCount = canRemoveEntries
    ? carriedOverEntries.length
    : (skippedData?.meta.pagination.total ?? 0);

  const { timezoneList, systemTimezone = { value: 'UTC+00:00-Africa/Abidjan ' } } = getTimezones(
    new Date()
  );
  const defaultTimezone =
    timezoneList.find((timezone) => timezone.value.split('&')[1] === settings?.data.defaultTimezone)
      ?.value ?? systemTimezone.value;

  const handleSubmit = async (values: DrawerFormValues) => {
    const timezone = values.isScheduled ? values.timezone!.split('&')[1] : null;
    const scheduledAt =
      values.isScheduled && values.date && values.time && timezone
        ? zonedTimeToUtc(`${values.date} ${values.time}`, timezone)
        : null;

    const response = await createRelease({
      id: release.id,
      name: values.name,
      scheduledAt,
      timezone,
      releaseCondition: values.releaseCondition,
      ...(removedIds.size > 0 && { actionIds: carriedOverEntries.map((action) => action.id) }),
    });

    if ('data' in response) {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-releases.modal.release-created-notification-success',
          defaultMessage: 'Release created.',
        }),
      });
      close();
      navigate(`../${response.data.data.id}`, { relative: 'path' });
    } else if (isFetchError(response.error)) {
      toggleNotification({ type: 'danger', message: formatAPIError(response.error) });
    } else {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) close();
      }}
      swipeDirection="right"
    >
      <DrawerContent style={DRAWER_STYLE}>
        <Formik<DrawerFormValues>
          onSubmit={handleSubmit}
          initialValues={{
            name: formatMessage(
              {
                id: 'content-releases.skipped-drawer.form.name.default',
                defaultMessage: '{name} – skipped entries',
              },
              { name: release.name }
            ),
            date: format(new Date(), 'yyyy-MM-dd'),
            time: '',
            isScheduled: true,
            scheduledAt: null,
            timezone: defaultTimezone,
            releaseCondition: DEFAULT_RELEASE_CONDITION,
          }}
          validationSchema={RELEASE_SCHEMA}
          validateOnChange={false}
          enableReinitialize
        >
          {({ values, errors, handleChange, setFieldValue }) => (
            <DrawerForm>
              <DrawerHeader>
                <Flex justifyContent="space-between" alignItems="center" gap={2}>
                  <DrawerTitle>
                    <Typography variant="omega" fontWeight="bold">
                      {formatMessage({
                        id: 'content-releases.skipped-drawer.title',
                        defaultMessage: 'Create new release from skipped entries',
                      })}
                    </Typography>
                  </DrawerTitle>
                  <IconButton
                    variant="ghost"
                    onClick={close}
                    label={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                  >
                    <Cross />
                  </IconButton>
                </Flex>
              </DrawerHeader>
              <ScrollArea>
                <Box background="neutral100" padding={4}>
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
                  {isLoadingEntries ? (
                    <Flex justifyContent="center" padding={4}>
                      <Loader small />
                    </Flex>
                  ) : (
                    <Flex tag="ul" direction="column" alignItems="stretch" gap={2}>
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
                  )}
                </Box>
                <Flex direction="column" alignItems="stretch" gap={4} padding={4}>
                  <Typography variant="delta" tag="h3">
                    {formatMessage({
                      id: 'content-releases.skipped-drawer.release-info.title',
                      defaultMessage: 'Release info',
                    })}
                  </Typography>
                  <Field.Root
                    name="name"
                    error={
                      errors.name && formatMessage({ id: errors.name, defaultMessage: errors.name })
                    }
                    required
                  >
                    <Field.Label>
                      {formatMessage({
                        id: 'content-releases.skipped-drawer.form.name.label',
                        defaultMessage: 'Release name',
                      })}
                    </Field.Label>
                    <TextInput type="text" value={values.name} onChange={handleChange} />
                    <Field.Error />
                  </Field.Root>
                  <Flex direction="column" alignItems="stretch" gap={2}>
                    <Typography variant="pi" fontWeight="bold" textColor="neutral800">
                      {formatMessage({
                        id: 'content-releases.skipped-drawer.form.schedule.label',
                        defaultMessage: 'Schedule',
                      })}
                    </Typography>
                    {values.isScheduled && (
                      <>
                        <Flex gap={2} alignItems="start">
                          <Box flex={1}>
                            <Field.Root
                              name="date"
                              error={
                                errors.date &&
                                formatMessage({ id: errors.date, defaultMessage: errors.date })
                              }
                              required
                            >
                              <DatePicker
                                aria-label={formatMessage({
                                  id: 'content-releases.modal.form.input.label.date',
                                  defaultMessage: 'Date',
                                })}
                                onChange={(date) => {
                                  setFieldValue(
                                    'date',
                                    date ? formatISO(date, { representation: 'date' }) : null
                                  );
                                }}
                                clearLabel={formatMessage({
                                  id: 'content-releases.modal.form.input.clearLabel',
                                  defaultMessage: 'Clear',
                                })}
                                onClear={() => setFieldValue('date', null)}
                                value={values.date ? new Date(values.date) : new Date()}
                                minDate={utcToZonedTime(
                                  new Date(),
                                  (values.timezone ?? defaultTimezone).split('&')[1]
                                )}
                              />
                              <Field.Error />
                            </Field.Root>
                          </Box>
                          <Box flex={1}>
                            <Field.Root
                              name="time"
                              error={
                                errors.time &&
                                formatMessage({ id: errors.time, defaultMessage: errors.time })
                              }
                              required
                            >
                              <TimePicker
                                aria-label={formatMessage({
                                  id: 'content-releases.modal.form.input.label.time',
                                  defaultMessage: 'Time',
                                })}
                                onChange={(time) => setFieldValue('time', time)}
                                clearLabel={formatMessage({
                                  id: 'content-releases.modal.form.input.clearLabel',
                                  defaultMessage: 'Clear',
                                })}
                                onClear={() => setFieldValue('time', '')}
                                value={values.time || undefined}
                              />
                              <Field.Error />
                            </Field.Root>
                          </Box>
                        </Flex>
                        <TimezoneComponent timezoneOptions={timezoneList} />
                      </>
                    )}
                    <Checkbox
                      name="isScheduled"
                      checked={!values.isScheduled}
                      onCheckedChange={(checked) => {
                        setFieldValue('isScheduled', !checked);
                        if (checked) {
                          setFieldValue('date', null);
                          setFieldValue('time', '');
                          setFieldValue('timezone', null);
                        } else {
                          setFieldValue('date', format(new Date(), 'yyyy-MM-dd'));
                          setFieldValue('timezone', defaultTimezone);
                        }
                      }}
                    >
                      {formatMessage({
                        id: 'content-releases.skipped-drawer.form.no-schedule',
                        defaultMessage: "I don't have a release date yet",
                      })}
                    </Checkbox>
                  </Flex>
                </Flex>
                <Box borderColor="neutral150" borderStyle="solid" borderWidth="1px 0 0 0" />
                <Flex direction="column" alignItems="stretch" gap={4} padding={4}>
                  <Typography variant="delta" tag="h3" id="release-condition-label">
                    {formatMessage({
                      id: 'content-releases.skipped-drawer.release-mode.title',
                      defaultMessage: 'Release mode',
                    })}
                  </Typography>
                  <Radio.Group
                    aria-labelledby="release-condition-label"
                    value={values.releaseCondition}
                    onValueChange={(value) => setFieldValue('releaseCondition', value)}
                  >
                    <Flex direction="column" alignItems="stretch" gap={4}>
                      {RELEASE_CONDITIONS.map((condition) => (
                        <Flex key={condition} direction="column" alignItems="stretch" gap={1}>
                          <Radio.Item value={condition}>
                            {formatMessage(RELEASE_CONDITION_MESSAGES[condition].label)}
                          </Radio.Item>
                          <Box paddingLeft={6}>
                            <Typography variant="pi" textColor="neutral600">
                              {formatMessage(RELEASE_CONDITION_MESSAGES[condition].description)}
                            </Typography>
                          </Box>
                        </Flex>
                      ))}
                    </Flex>
                  </Radio.Group>
                </Flex>
              </ScrollArea>
              <DrawerFooter>
                <Flex
                  justifyContent="space-between"
                  paddingTop={4}
                  borderColor="neutral150"
                  borderStyle="solid"
                  borderWidth="1px 0 0 0"
                >
                  <Button variant="tertiary" onClick={close}>
                    {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
                  </Button>
                  <Button
                    type="submit"
                    loading={isSubmitting}
                    disabled={isLoadingEntries || carriedOverEntries.length === 0}
                  >
                    {formatMessage({
                      id: 'content-releases.skipped-drawer.form.submit',
                      defaultMessage: 'Create release',
                    })}
                  </Button>
                </Flex>
              </DrawerFooter>
            </DrawerForm>
          )}
        </Formik>
      </DrawerContent>
    </Drawer>
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

const RELEASE_CONDITION_MESSAGES = {
  allow_partial: {
    label: {
      id: 'content-releases.release-condition.allow_partial.label',
      defaultMessage: 'Release all ready items',
    },
    description: {
      id: 'content-releases.release-condition.allow_partial.description',
      defaultMessage: 'Releases entries that are ready and skips the rest at the scheduled time.',
    },
  },
  all_or_nothing: {
    label: {
      id: 'content-releases.release-condition.all_or_nothing.label',
      defaultMessage: 'Require every entry to be ready',
    },
    description: {
      id: 'content-releases.release-condition.all_or_nothing.description',
      defaultMessage: 'Nothing is released unless every entry is ready at the scheduled time.',
    },
  },
} satisfies Record<ReleaseCondition, Record<'label' | 'description', MessageDescriptor>>;

const DrawerForm = styled(Form)`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
`;

const ScrollArea = styled(Box)`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

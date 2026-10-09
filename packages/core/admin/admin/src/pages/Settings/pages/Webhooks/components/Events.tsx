import * as React from 'react';

import {
  Box,
  Checkbox,
  Flex,
  RawTable as Table,
  RawTbody as Tbody,
  RawTd as Td,
  RawTh as Th,
  RawThead as Thead,
  RawTr as Tr,
  Typography,
  VisuallyHidden,
  Field,
  CheckboxProps,
  useCollator,
} from '@strapi/design-system';
import { MessageDescriptor, useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useField } from '../../../../../components/Form';
import { useContentTypes } from '../../../../../hooks/useContentTypes';

import type { ContentType } from '../../../../../../../shared/contracts/content-types';

/* -------------------------------------------------------------------------------------------------
 * EventsRoot
 * -----------------------------------------------------------------------------------------------*/

interface EventsRootProps {
  children: React.ReactNode;
}

const EventsRoot = ({ children }: EventsRootProps) => {
  const { formatMessage } = useIntl();

  const label = formatMessage({
    id: 'Settings.webhooks.form.events',
    defaultMessage: 'Events',
  });

  return (
    <Flex direction="column" alignItems="stretch" gap={1}>
      <Field.Label aria-hidden>{label}</Field.Label>
      {/* @ts-expect-error – TODO: add colCount & rowCount */}
      <StyledTable aria-label={label}>{children}</StyledTable>
    </Flex>
  );
};

// TODO check whether we want to move alternating background colour tables to the design system
const StyledTable = styled(Table)`
  tbody tr:nth-child(odd) {
    background: ${({ theme }) => theme.colors.neutral100};
  }

  thead th span {
    color: ${({ theme }) => theme.colors.neutral500};
  }

  td,
  th {
    padding-block-start: ${({ theme }) => theme.spaces[3]};
    padding-block-end: ${({ theme }) => theme.spaces[3]};
    width: 6%;
    vertical-align: middle;
  }

  tbody tr td:first-child {
    /**
     * Add padding to the start of the first column to avoid the checkbox appearing
     * too close to the edge of the table
     */
    padding-inline-start: ${({ theme }) => theme.spaces[2]};
  }
`;

/* -------------------------------------------------------------------------------------------------
 * EventsHeaders
 * -----------------------------------------------------------------------------------------------*/

interface EventsHeadersProps {
  getHeaders?: typeof getCEHeaders;
}

const getCEHeaders = (): MessageDescriptor[] => {
  const headers = [
    { id: 'Settings.webhooks.events.create', defaultMessage: 'Create' },
    { id: 'Settings.webhooks.events.update', defaultMessage: 'Update' },
    { id: 'app.utils.delete', defaultMessage: 'Delete' },
    { id: 'app.utils.publish', defaultMessage: 'Publish' },
    { id: 'app.utils.unpublish', defaultMessage: 'Unpublish' },
  ];

  return headers;
};

const EventsHeaders = ({ getHeaders = getCEHeaders }: EventsHeadersProps) => {
  const { formatMessage } = useIntl();
  const headers = getHeaders();

  return (
    <Thead>
      <Tr>
        <Th>
          <VisuallyHidden>
            {formatMessage({
              id: 'Settings.webhooks.event.select',
              defaultMessage: 'Select event',
            })}
          </VisuallyHidden>
        </Th>
        {headers.map((header) => {
          if (['app.utils.publish', 'app.utils.unpublish'].includes(header?.id ?? '')) {
            return (
              <Th
                key={header.id}
                title={formatMessage({
                  id: 'Settings.webhooks.event.publish-tooltip',
                  defaultMessage: 'This event only exists for content with draft & publish enabled',
                })}
              >
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage(header)}
                </Typography>
              </Th>
            );
          }

          return (
            <Th key={header.id}>
              <Typography variant="sigma" textColor="neutral600">
                {formatMessage(header)}
              </Typography>
            </Th>
          );
        })}
      </Tr>
    </Thead>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EventsBody
 * -----------------------------------------------------------------------------------------------*/
interface FormikContextValue {
  events: string[];
}

interface EventsBodyProps {
  providedEvents?: Record<string, FormikContextValue['events']>;
}

const EventsBody = ({ providedEvents }: EventsBodyProps) => {
  const events = providedEvents || getCEEvents();
  const { value = [], onChange } = useField<string[]>('events');

  const inputName = 'events';
  const inputValue = value;
  const disabledEvents: string[] = [];

  const formattedValue = inputValue.reduce<Record<string, string[]>>((acc, curr) => {
    const key = curr.split('.')[0];

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);

    return acc;
  }, {});

  const handleSelect: EventsRowProps['handleSelect'] = (name, value) => {
    const set = new Set(inputValue);

    if (value) {
      set.add(name);
    } else {
      set.delete(name);
    }

    onChange(inputName, Array.from(set));
  };

  const handleSelectAll: EventsRowProps['handleSelectAll'] = (name, value) => {
    const set = new Set(inputValue);

    if (value) {
      events[name].forEach((event) => {
        if (!disabledEvents.includes(event)) {
          set.add(event);
        }
      });
    } else {
      events[name].forEach((event) => set.delete(event));
    }

    onChange(inputName, Array.from(set));
  };

  return (
    <Tbody>
      {Object.entries(events).map(([event, value]) => {
        return (
          <React.Fragment key={event}>
            <EventsRow
              disabledEvents={disabledEvents}
              name={event}
              events={value}
              inputValue={formattedValue[event]}
              handleSelect={handleSelect}
              handleSelectAll={handleSelectAll}
            />
            {event === 'entry' && (
              <EventsContentTypes events={value} selectedEvents={formattedValue[event]} />
            )}
          </React.Fragment>
        );
      })}
    </Tbody>
  );
};

const getCEEvents = (): Required<Pick<EventsBodyProps, 'providedEvents'>>['providedEvents'] => {
  const entryEvents: FormikContextValue['events'] = [
    'entry.create',
    'entry.update',
    'entry.delete',
    'entry.publish',
    'entry.unpublish',
  ];

  return {
    entry: entryEvents,
    media: ['media.create', 'media.update', 'media.delete'],
  };
};

/* -------------------------------------------------------------------------------------------------
 * EventsContentTypes
 * -----------------------------------------------------------------------------------------------*/

const DRAFT_AND_PUBLISH_EVENTS = ['entry.publish', 'entry.unpublish'];

interface EventsContentTypesProps {
  /**
   * The entry events, one per column
   */
  events: string[];
  /**
   * The entry events selected for every content type
   */
  selectedEvents?: string[];
}

/**
 * Lists the content types below the entry events, to select events for a single content type.
 * The events selected for every content type are displayed as selected and can't be changed.
 */
const EventsContentTypes = ({ events, selectedEvents = [] }: EventsContentTypesProps) => {
  const { locale } = useIntl();
  const { isLoading, collectionTypes, singleTypes } = useContentTypes();
  const { value = {}, onChange } = useField<Record<string, string[]>>('contentTypeEvents');

  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const toRows = (contentTypes: ContentType[]) =>
    contentTypes
      .map((contentType) => ({
        uid: contentType.uid as string,
        label: contentType.info.displayName,
        unavailableEvents: contentType.options?.draftAndPublish ? [] : DRAFT_AND_PUBLISH_EVENTS,
      }))
      .sort((a, b) => formatter.compare(a.label, b.label));

  const rows = [...toRows(collectionTypes), ...toRows(singleTypes)];

  /**
   * Content types saved on the webhook that are not listed above (e.g. deleted since then)
   * are displayed with their uid, otherwise they could neither be seen nor removed.
   */
  const unlistedRows = isLoading
    ? []
    : Object.keys(value)
        .filter((uid) => !rows.some((row) => row.uid === uid))
        .map((uid) => ({ uid, label: uid, unavailableEvents: [] as string[] }));

  const setEvents = (uid: string, uidEvents: string[]) => {
    const contentTypeEvents = { ...value, [uid]: uidEvents };

    if (uidEvents.length === 0) {
      delete contentTypeEvents[uid];
    }

    onChange('contentTypeEvents', contentTypeEvents);
  };

  return (
    <>
      {[...rows, ...unlistedRows].map(({ uid, label, unavailableEvents }) => {
        const ownEvents = value[uid] ?? [];
        const availableEvents = events.filter((event) => !unavailableEvents.includes(event));
        const selectableEvents = availableEvents.filter((event) => !selectedEvents.includes(event));

        return (
          <EventsRow
            key={uid}
            name={uid}
            label={label}
            events={events}
            disabledEvents={[...unavailableEvents, ...selectedEvents]}
            inputValue={availableEvents.filter(
              (event) => selectedEvents.includes(event) || ownEvents.includes(event)
            )}
            handleSelect={(event, isSelected) => {
              setEvents(
                uid,
                isSelected ? [...ownEvents, event] : ownEvents.filter((e) => e !== event)
              );
            }}
            handleSelectAll={(_, isSelected) => {
              setEvents(
                uid,
                isSelected
                  ? Array.from(new Set([...ownEvents, ...selectableEvents]))
                  : ownEvents.filter((event) => !selectableEvents.includes(event))
              );
            }}
          />
        );
      })}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * EventsRow
 * -----------------------------------------------------------------------------------------------*/

interface EventsRowProps {
  disabledEvents?: string[];
  events?: string[];
  inputValue?: string[];
  handleSelect: (name: string, value: boolean) => void;
  handleSelectAll: (name: string, value: boolean) => void;
  name: string;
  /**
   * Displayed instead of the name, for the rows nested below another one (e.g. a content type)
   */
  label?: string;
}

const EventsRow = ({
  disabledEvents = [],
  name,
  label,
  events = [],
  inputValue = [],
  handleSelect,
  handleSelectAll,
}: EventsRowProps) => {
  const { formatMessage } = useIntl();
  const isNested = label !== undefined;
  const enabledCheckboxes = events.filter((event) => !disabledEvents.includes(event));

  const hasSomeCheckboxSelected = inputValue.length > 0;
  // A disabled checkbox can't be selected by the user, so it doesn't prevent the row from being fully selected
  const areAllCheckboxesSelected =
    hasSomeCheckboxSelected &&
    events.every((event) => inputValue.includes(event) || disabledEvents.includes(event));

  const onChangeAll: CheckboxProps['onCheckedChange'] = () => {
    const valueToSet = !areAllCheckboxesSelected;

    handleSelectAll(name, valueToSet);
  };

  const targetColumns = 5;

  return (
    <Tr>
      <Td>
        <Box paddingLeft={isNested ? 6 : 0}>
          <Checkbox
            aria-label={
              isNested
                ? undefined
                : formatMessage({
                    id: 'global.select-all-entries',
                    defaultMessage: 'Select all entries',
                  })
            }
            name={name}
            disabled={enabledCheckboxes.length === 0}
            checked={
              hasSomeCheckboxSelected && !areAllCheckboxesSelected
                ? 'indeterminate'
                : areAllCheckboxesSelected
            }
            onCheckedChange={onChangeAll}
          >
            {label ?? removeHyphensAndTitleCase(name)}
          </Checkbox>
        </Box>
      </Td>

      {events.map((event) => {
        return (
          <Td key={event} textAlign="center">
            <Flex width="100%" justifyContent="center">
              <Checkbox
                disabled={disabledEvents.includes(event)}
                aria-label={isNested ? `${label}: ${event}` : event}
                name={isNested ? `${name}.${event}` : event}
                checked={inputValue.includes(event)}
                onCheckedChange={(value) => handleSelect(event, !!value)}
              />
            </Flex>
          </Td>
        );
      })}
      {events.length < targetColumns && <Td colSpan={targetColumns - events.length} />}
    </Tr>
  );
};

/**
 * Converts a string to title case and removes hyphens.
 */
const removeHyphensAndTitleCase = (str: string): string =>
  str
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const Events = { Root: EventsRoot, Headers: EventsHeaders, Body: EventsBody, Row: EventsRow };

export { Events };
export type { EventsRowProps, EventsHeadersProps, EventsRootProps, EventsBodyProps };

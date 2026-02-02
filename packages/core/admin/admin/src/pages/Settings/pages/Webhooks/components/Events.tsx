import * as React from 'react';

import {
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
} from '@strapi/design-system';
import { MessageDescriptor, useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useField } from '../../../../../components/Form';

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
          <EventsRow
            disabledEvents={disabledEvents}
            key={event}
            name={event}
            events={value}
            inputValue={formattedValue[event]}
            handleSelect={handleSelect}
            handleSelectAll={handleSelectAll}
          />
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
 * EventsRow
 * -----------------------------------------------------------------------------------------------*/

interface EventsRowProps {
  disabledEvents?: string[];
  events?: string[];
  inputValue?: string[];
  handleSelect: (name: string, value: boolean) => void;
  handleSelectAll: (name: string, value: boolean) => void;
  name: string;
}

const EventsRow = ({
  disabledEvents = [],
  name,
  events = [],
  inputValue = [],
  handleSelect,
  handleSelectAll,
}: EventsRowProps) => {
  const { formatMessage } = useIntl();
  const enabledCheckboxes = events.filter((event) => !disabledEvents.includes(event));

  const hasSomeCheckboxSelected = inputValue.length > 0;
  const areAllCheckboxesSelected = inputValue.length === enabledCheckboxes.length;

  const onChangeAll: CheckboxProps['onCheckedChange'] = () => {
    const valueToSet = !areAllCheckboxesSelected;

    handleSelectAll(name, valueToSet);
  };

  const targetColumns = 5;

  return (
    <Tr>
      <Td>
        <Checkbox
          aria-label={formatMessage({
            id: 'global.select-all-entries',
            defaultMessage: 'Select all entries',
          })}
          name={name}
          checked={
            hasSomeCheckboxSelected && !areAllCheckboxesSelected
              ? 'indeterminate'
              : areAllCheckboxesSelected
          }
          onCheckedChange={onChangeAll}
        >
          {removeHyphensAndTitleCase(name)}
        </Checkbox>
      </Td>

      {events.map((event) => {
        return (
          <Td key={event} textAlign="center">
            <Flex width="100%" justifyContent="center">
              <Checkbox
                disabled={disabledEvents.includes(event)}
                aria-label={event}
                name={event}
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

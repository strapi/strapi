import * as React from 'react';

import { createContext } from '@radix-ui/react-context';
import {
  BaseCheckbox,
  Checkbox,
  FieldLabel,
  Flex,
  Loader,
  RawTable as Table,
  RawTbody as Tbody,
  RawTd as Td,
  RawTh as Th,
  RawThead as Thead,
  RawTr as Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { useFormikContext, FieldInputProps } from 'formik';
import { MessageDescriptor, useIntl } from 'react-intl';
import styled from 'styled-components';

import { useContentTypes } from '../../../../../hooks/useContentTypes';

/* -------------------------------------------------------------------------------------------------
 * EventsRoot
 * -----------------------------------------------------------------------------------------------*/

interface WebhookEventContextValue {
  isDraftAndPublish: boolean;
}

const [WebhookEventProvider, useWebhookEvent] =
  createContext<WebhookEventContextValue>('WebhookEvent');

interface EventsRootProps {
  children: React.ReactNode;
}

const EventsRoot = ({ children }: EventsRootProps) => {
  const { formatMessage } = useIntl();
  const { collectionTypes, isLoading } = useContentTypes();

  const isDraftAndPublish = React.useMemo(
    () => collectionTypes.some((ct) => ct.options?.draftAndPublish === true),
    [collectionTypes]
  );

  const label = formatMessage({
    id: 'Settings.webhooks.form.events',
    defaultMessage: 'Events',
  });

  return (
    <WebhookEventProvider isDraftAndPublish={isDraftAndPublish}>
      <Flex direction="column" alignItems="stretch" gap={1}>
        <FieldLabel aria-hidden>{label}</FieldLabel>
        {isLoading && (
          <Loader>
            {formatMessage({
              id: 'Settings.webhooks.events.isLoading',
              defaultMessage: 'Events loading',
            })}
          </Loader>
        )}
        <StyledTable aria-label={label}>{children}</StyledTable>
      </Flex>
    </WebhookEventProvider>
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
    width: 10%;
    vertical-align: middle;
    text-align: center;
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

const getCEHeaders = (isDraftAndPublish: boolean): MessageDescriptor[] => {
  const headers = [
    { id: 'Settings.webhooks.events.create', defaultMessage: 'Create' },
    { id: 'Settings.webhooks.events.update', defaultMessage: 'Update' },
    { id: 'app.utils.delete', defaultMessage: 'Delete' },
  ];

  if (isDraftAndPublish) {
    headers.push({ id: 'app.utils.publish', defaultMessage: 'Publish' });
    headers.push({ id: 'app.utils.unpublish', defaultMessage: 'Unpublish' });
  }

  return headers;
};

const EventsHeaders = ({ getHeaders = getCEHeaders }: EventsHeadersProps) => {
  const { isDraftAndPublish } = useWebhookEvent('Headers');

  const { formatMessage } = useIntl();
  const headers = getHeaders(isDraftAndPublish);

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
  const { isDraftAndPublish } = useWebhookEvent('Body');

  const events = providedEvents || getCEEvents(isDraftAndPublish);
  const { values, handleChange: onChange } = useFormikContext<FormikContextValue>();

  const inputName = 'events';
  const inputValue = values.events;
  const disabledEvents: string[] = [];

  const formattedValue = inputValue.reduce<Record<string, string[]>>((acc, curr) => {
    const key = curr.split('.')[0];

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);

    return acc;
  }, {});

  const handleSelect: React.ChangeEventHandler<HTMLInputElement> = ({
    target: { name, value },
  }) => {
    const set = new Set(inputValue);

    if (value) {
      set.add(name);
    } else {
      set.delete(name);
    }
    onChange({ target: { name: inputName, value: Array.from(set) } });
  };

  const handleSelectAll: React.ChangeEventHandler<HTMLInputElement> = ({
    target: { name, value },
  }) => {
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
    onChange({ target: { name: inputName, value: Array.from(set) } });
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

const getCEEvents = (
  isDraftAndPublish: boolean
): Required<Pick<EventsBodyProps, 'providedEvents'>>['providedEvents'] => {
  const entryEvents: FormikContextValue['events'] = [
    'entry.create',
    'entry.update',
    'entry.delete',
  ];

  if (isDraftAndPublish) {
    entryEvents.push('entry.publish', 'entry.unpublish');
  }

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
  handleSelect: FieldInputProps<string>['onChange'];
  handleSelectAll: FieldInputProps<string>['onChange'];
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

  const onChangeAll: React.ChangeEventHandler<HTMLInputElement> = ({ target: { name } }) => {
    const valueToSet = !areAllCheckboxesSelected;

    handleSelectAll({
      target: { name, value: valueToSet },
    });
  };

  const targetColumns = 5;

  return (
    <Tr>
      <Td>
        <Checkbox
          indeterminate={hasSomeCheckboxSelected && !areAllCheckboxesSelected}
          aria-label={formatMessage({
            id: 'global.select-all-entries',
            defaultMessage: 'Select all entries',
          })}
          name={name}
          onChange={onChangeAll}
          value={areAllCheckboxesSelected}
        >
          {removeHyphensAndTitleCase(name)}
        </Checkbox>
      </Td>

      {events.map((event) => {
        return (
          <Td key={event}>
            <BaseCheckbox
              disabled={disabledEvents.includes(event)}
              aria-label={event}
              name={event}
              value={inputValue.includes(event)}
              onValueChange={(value) => handleSelect({ target: { name: event, value } })}
            />
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

import * as React from 'react';
import PropTypes from 'prop-types';

import { useFormikContext } from 'formik';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import {
  FieldLabel,
  Flex,
  Typography,
  BaseCheckbox,
  Checkbox,
  Loader,
  RawTable as Table,
  RawTh as Th,
  RawTd as Td,
  RawTr as Tr,
  RawThead as Thead,
  RawTbody as Tbody,
  VisuallyHidden,
} from '@strapi/design-system';

import { useContentTypes } from '../../../../../../../hooks/useContentTypes';

export const formatValue = (value) =>
  value.reduce((acc, curr) => {
    const key = curr.split('.')[0];

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);

    return acc;
  }, {});

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
    // Add padding to the start of the first column to avoid the checkbox appearing
    // too close to the edge of the table
    padding-inline-start: ${({ theme }) => theme.spaces[2]};
  }
`;

const getCEHeaders = (isDraftAndPublish) => {
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

const getCEEvents = (isDraftAndPublish) => {
  const entryEvents = ['entry.create', 'entry.update', 'entry.delete'];

  if (isDraftAndPublish) {
    entryEvents.push('entry.publish', 'entry.unpublish');
  }

  return {
    entry: entryEvents,
    media: ['media.create', 'media.update', 'media.delete'],
  };
};

const WebhookEventContext = React.createContext();

const Root = ({ children }) => {
  const { formatMessage } = useIntl();
  const { collectionTypes, isLoading } = useContentTypes();

  const isDraftAndPublish = React.useMemo(
    () => collectionTypes.some((ct) => ct.options.draftAndPublish === true),
    [collectionTypes]
  );

  const label = formatMessage({
    id: 'Settings.webhooks.form.events',
    defaultMessage: 'Events',
  });

  return (
    <WebhookEventContext.Provider value={{ isDraftAndPublish }}>
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
    </WebhookEventContext.Provider>
  );
};

Root.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
};

const Headers = ({ getHeaders = getCEHeaders }) => {
  const { isDraftAndPublish } = React.useContext(WebhookEventContext);

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
          if (['app.utils.publish', 'app.utils.unpublish'].includes(header.id)) {
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

Headers.defaultProps = {
  getHeaders: getCEHeaders,
};

Headers.propTypes = {
  getHeaders: PropTypes.func,
};

const Body = ({ providedEvents }) => {
  const { isDraftAndPublish } = React.useContext(WebhookEventContext);

  const events = providedEvents || getCEEvents(isDraftAndPublish);
  const { values, handleChange: onChange } = useFormikContext();

  const inputName = 'events';
  const inputValue = values.events;
  const disabledEvents = [];

  const formattedValue = formatValue(inputValue);

  const handleSelect = ({ target: { name, value } }) => {
    let set = new Set(inputValue);

    if (value) {
      set.add(name);
    } else {
      set.delete(name);
    }
    onChange({ target: { name: inputName, value: Array.from(set) } });
  };

  const handleSelectAll = ({ target: { name, value } }) => {
    let set = new Set(inputValue);

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
          <EventRow
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

Body.defaultProps = {
  providedEvents: null,
};

Body.propTypes = {
  providedEvents: PropTypes.object,
};

/**
 * Converts a string to title case and removes hyphens.
 *
 * @param {string} str - The string to convert.
 * @returns {string} The converted string.
 */
const removeHyphensAndTitleCase = (str) =>
  str
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const EventRow = ({ disabledEvents, name, events, inputValue, handleSelect, handleSelectAll }) => {
  const { formatMessage } = useIntl();
  const enabledCheckboxes = events.filter((event) => !disabledEvents.includes(event));

  const hasSomeCheckboxSelected = inputValue.length > 0;
  const areAllCheckboxesSelected = inputValue.length === enabledCheckboxes.length;

  const onChangeAll = ({ target: { name } }) => {
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
      {events.length < targetColumns && <Td colSpan={`${targetColumns - events.length}`} />}
    </Tr>
  );
};

EventRow.defaultProps = {
  disabledEvents: [],
  events: [],
  inputValue: [],
  handleSelect() {},
  handleSelectAll() {},
};

EventRow.propTypes = {
  disabledEvents: PropTypes.array,
  events: PropTypes.array,
  inputValue: PropTypes.array,
  handleSelect: PropTypes.func,
  handleSelectAll: PropTypes.func,
  name: PropTypes.string.isRequired,
};

export default { Root, Headers, Body, EventRow };

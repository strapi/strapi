import * as React from 'react';
import PropTypes from 'prop-types';

import { useFormikContext } from 'formik';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { FieldLabel, Flex, Typography, BaseCheckbox, Checkbox } from '@strapi/design-system';

import { useModels } from '../../../../../../../hooks';

export const formatValue = (value) =>
  value.reduce((acc, curr) => {
    const key = curr.split('.')[0];

    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);

    return acc;
  }, {});

const StyledTable = styled.table`
  td {
    height: ${52 / 16}rem;
    width: 10%;
    vertical-align: middle;
    text-align: center;
  }

  tbody tr:nth-child(odd) {
    background: ${({ theme }) => theme.colors.neutral100};
  }

  tbody tr td:first-child {
    padding-left: ${({ theme }) => theme.spaces[7]};
  }
`;

const getCEHeaders = (isDraftAndPublish) => {
  if (isDraftAndPublish) {
    return [
      { id: 'Settings.webhooks.events.create', defaultMessage: 'Create' },
      { id: 'Settings.webhooks.events.update', defaultMessage: 'Update' },
      { id: 'app.utils.delete', defaultMessage: 'Delete' },
      { id: 'app.utils.publish', defaultMessage: 'Publish' },
      { id: 'app.utils.unpublish', defaultMessage: 'Unpublish' },
    ];
  }

  return [
    { id: 'Settings.webhooks.events.create', defaultMessage: 'Create' },
    { id: 'Settings.webhooks.events.update', defaultMessage: 'Update' },
    { id: 'app.utils.delete', defaultMessage: 'Delete' },
  ];
};

const getCEEvents = (isDraftAndPublish) => {
  if (isDraftAndPublish) {
    return {
      entry: ['entry.create', 'entry.update', 'entry.delete', 'entry.publish', 'entry.unpublish'],
      media: ['media.create', 'media.update', 'media.delete'],
    };
  }

  return {
    entry: ['entry.create', 'entry.update', 'entry.delete'],
    media: ['media.create', 'media.update', 'media.delete'],
  };
};

const Root = ({ children }) => {
  const { formatMessage } = useIntl();
  const { collectionTypes } = useModels();

  const isDraftAndPublish = React.useMemo(
    () => collectionTypes.some((ct) => ct.options.draftAndPublish === true),
    [collectionTypes]
  );

  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { isDraftAndPublish });
    }

    return child;
  });

  return (
    <Flex direction="column" alignItems="stretch" gap={1}>
      <FieldLabel>
        {formatMessage({
          id: 'Settings.webhooks.form.events',
          defaultMessage: 'Events',
        })}
      </FieldLabel>
      <StyledTable>{childrenWithProps}</StyledTable>
    </Flex>
  );
};

Root.propTypes = {
  children: PropTypes.node.isRequired,
};

const Headers = ({ getHeaders = getCEHeaders, isDraftAndPublish = false }) => {
  const { formatMessage } = useIntl();
  const headers = getHeaders(isDraftAndPublish);

  return (
    <thead>
      <tr>
        <td />
        {headers.map((header) => {
          if (header.id === 'app.utils.publish' || header.id === 'app.utils.unpublish') {
            return (
              <td
                key={header.id}
                title={formatMessage({
                  id: 'Settings.webhooks.event.publish-tooltip',
                  defaultMessage: 'This event only exists for content with draft & publish enabled',
                })}
              >
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage(header)}
                </Typography>
              </td>
            );
          }

          return (
            <td key={header.id}>
              <Typography variant="sigma" textColor="neutral600">
                {formatMessage(header)}
              </Typography>
            </td>
          );
        })}
      </tr>
    </thead>
  );
};

Headers.propTypes = {
  getHeaders: PropTypes.func.isRequired,
  isDraftAndPublish: PropTypes.bool.isRequired,
};

const Body = ({ providedEvents, isDraftAndPublish }) => {
  const events = providedEvents || getCEEvents(isDraftAndPublish);
  const { values, handleChange: onChange } = useFormikContext();

  const inputName = 'events';
  const inputValue = values.events;
  const disabledEvents = [];

  const formattedValue = formatValue(inputValue);

  const handleChange = ({ target: { name, value } }) => {
    let set = new Set(inputValue);

    if (value) {
      set.add(name);
    } else {
      set.delete(name);
    }
    onChange({ target: { name: inputName, value: Array.from(set) } });
  };

  const handleChangeAll = ({ target: { name, value } }) => {
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
    <tbody>
      {Object.keys(events).map((event) => {
        return (
          <EventRow
            disabledEvents={disabledEvents}
            key={event}
            name={event}
            events={events[event]}
            inputValue={formattedValue[event]}
            handleChange={handleChange}
            handleChangeAll={handleChangeAll}
          />
        );
      })}
    </tbody>
  );
};

Body.defaultProps = {
  providedEvents: null,
};

Body.propTypes = {
  providedEvents: PropTypes.object,
  isDraftAndPublish: PropTypes.bool.isRequired,
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

const EventRow = ({ disabledEvents, name, events, inputValue, handleChange, handleChangeAll }) => {
  const enabledCheckboxes = events.filter((event) => !disabledEvents.includes(event));

  const hasSomeCheckboxSelected = inputValue.length > 0;
  const areAllCheckboxesSelected = inputValue.length === enabledCheckboxes.length;

  const onChangeAll = ({ target: { name } }) => {
    const valueToSet = !areAllCheckboxesSelected;

    handleChangeAll({
      target: { name, value: valueToSet },
    });
  };

  return (
    <tr>
      <td>
        <Checkbox
          indeterminate={hasSomeCheckboxSelected && !areAllCheckboxesSelected}
          aria-label="Select all entries"
          name={name}
          onChange={onChangeAll}
          value={areAllCheckboxesSelected}
        >
          {removeHyphensAndTitleCase(name)}
        </Checkbox>
      </td>

      {events.map((event) => {
        return (
          <td key={event}>
            <BaseCheckbox
              disabled={disabledEvents.includes(event)}
              aria-label={event}
              name={event}
              value={inputValue.includes(event)}
              onValueChange={(value) => handleChange({ target: { name: event, value } })}
            />
          </td>
        );
      })}
    </tr>
  );
};

EventRow.defaultProps = {
  disabledEvents: [],
  events: [],
  inputValue: [],
  handleChange() {},
  handleChangeAll() {},
};

EventRow.propTypes = {
  disabledEvents: PropTypes.array,
  events: PropTypes.array,
  inputValue: PropTypes.array,
  handleChange: PropTypes.func,
  handleChangeAll: PropTypes.func,
  name: PropTypes.string.isRequired,
};

export default { Root, Headers, Body, EventRow };

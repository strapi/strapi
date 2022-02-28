import React from 'react';
import PropTypes from 'prop-types';
import { FieldLabel } from '@strapi/design-system/Field';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { useFormikContext } from 'formik';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import EventRow from './EventRow';
import formatValue from './utils/formatValue';

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

const displayedData = {
  headers: {
    default: [
      'Settings.webhooks.events.create',
      'Settings.webhooks.events.update',
      'app.utils.delete',
    ],
    draftAndPublish: [
      'Settings.webhooks.events.create',
      'Settings.webhooks.events.update',
      'app.utils.delete',
      'app.utils.publish',
      'app.utils.unpublish',
    ],
  },
  events: {
    default: {
      entry: ['entry.create', 'entry.update', 'entry.delete'],
      media: ['media.create', 'media.update', 'media.delete'],
    },
    draftAndPublish: {
      entry: ['entry.create', 'entry.update', 'entry.delete', 'entry.publish', 'entry.unpublish'],
      media: ['media.create', 'media.update', 'media.delete'],
    },
  },
};

const EventInput = ({ isDraftAndPublish }) => {
  const headersName = isDraftAndPublish
    ? displayedData.headers.draftAndPublish
    : displayedData.headers.default;

  const events = isDraftAndPublish
    ? displayedData.events.draftAndPublish
    : displayedData.events.default;

  const { formatMessage } = useIntl();
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
      events[name].forEach(event => {
        if (!disabledEvents.includes(event)) {
          set.add(event);
        }
      });
    } else {
      events[name].forEach(event => set.delete(event));
    }
    onChange({ target: { name: inputName, value: Array.from(set) } });
  };

  return (
    <Stack size={1}>
      <FieldLabel>
        {formatMessage({
          id: 'Settings.webhooks.form.events',
          defaultMessage: 'Events',
        })}
      </FieldLabel>
      <StyledTable>
        <thead>
          <tr>
            <td />
            {headersName.map(header => {
              if (header === 'app.utils.publish' || header === 'app.utils.unpublish') {
                return (
                  <td
                    key={header}
                    title={formatMessage({
                      id: 'Settings.webhooks.event.publish-tooltip',
                      defaultMessage:
                        'This event only exists for contents with Draft/Publish system enabled',
                    })}
                  >
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage({ id: header, defaultMessage: header })}
                    </Typography>
                  </td>
                );
              }

              return (
                <td key={header}>
                  <Typography variant="sigma" textColor="neutral600">
                    {formatMessage({ id: header, defaultMessage: header })}
                  </Typography>
                </td>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Object.keys(events).map(event => {
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
      </StyledTable>
    </Stack>
  );
};

EventInput.propTypes = {
  isDraftAndPublish: PropTypes.bool.isRequired,
};

export default EventInput;

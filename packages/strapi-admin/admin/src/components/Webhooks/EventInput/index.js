import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import formatValue from './utils/formatValue';
import Wrapper from './Wrapper';
import EventRow from './EventRow';

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

const EventInput = ({ onChange, name: inputName, value: inputValue, shouldShowDPEvents }) => {
  const headersName = shouldShowDPEvents
    ? displayedData.headers.draftAndPublish
    : displayedData.headers.default;
  const events = shouldShowDPEvents
    ? displayedData.events.draftAndPublish
    : displayedData.events.default;

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
    <Wrapper>
      <table>
        <thead>
          <tr>
            <td />
            {headersName.map(header => {
              if (header === 'app.utils.publish' || header === 'app.utils.unpublish') {
                return (
                  <FormattedMessage id="Settings.webhooks.event.publish-tooltip" key={header}>
                    {msg => (
                      <td title={msg}>
                        <FormattedMessage id={header} />
                      </td>
                    )}
                  </FormattedMessage>
                );
              }

              return (
                <td key={header}>
                  <FormattedMessage id={header} />
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
      </table>
    </Wrapper>
  );
};

EventInput.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  shouldShowDPEvents: PropTypes.bool.isRequired,
  value: PropTypes.array.isRequired,
};

export default EventInput;

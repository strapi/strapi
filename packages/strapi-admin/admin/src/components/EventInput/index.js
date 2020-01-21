import React from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext } from 'strapi-helper-plugin';

import Wrapper from './Wrapper';
import EventRow from './EventRow';

const EventInput = ({ onChange, name: inputName, value: inputValue }) => {
  const { formatMessage } = useGlobalContext();

  const headersName = [
    formatMessage({ id: 'Settings.webhooks.events.create' }),
    formatMessage({ id: 'Settings.webhooks.events.edit' }),
    formatMessage({ id: 'Settings.webhooks.events.delete' }),
  ];

  const events = {
    entry: ['entry.create', 'entry.update', 'entry.delete'],
    media: ['media.create', 'media.update', 'media.delete'],
  };

  // Media update disabled for now - until the media libray is ready
  const disabledEvents = ['media.update'];

  const formatValue = inputValue.reduce((acc, curr) => {
    const key = curr.split('.')[0];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);

    return acc;
  }, {});

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
              return <td key={header}>{header}</td>;
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
                inputValue={formatValue[event]}
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

EventInput.defaultProps = {};

EventInput.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.array.isRequired,
};

export default EventInput;

import React from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext } from 'strapi-helper-plugin';

import Wrapper from './Wrapper';
import EventRow from './EventRow';

const EventInput = ({ onChange, name: inputName, value: inputValue }) => {
  const { formatMessage } = useGlobalContext();

  const headersName = [
    formatMessage({ id: `Settings.webhooks.events.create` }),
    formatMessage({ id: `Settings.webhooks.events.edit` }),
    formatMessage({ id: `Settings.webhooks.events.delete` }),
  ];

  const events = {
    entry: ['entry.create', 'entry.update', 'entry.delete'],
    media: ['media.create', 'media.update', 'media.delete'],
  };

  const formatValue = (name, value, newValue = inputValue) => {
    if (value) {
      if (!newValue.includes(name)) {
        newValue.push(name);
      }
    } else {
      if (newValue.includes(name)) {
        const index = newValue.indexOf(name);
        if (index > -1) {
          newValue.splice(index, 1);
        }
      }
    }
    return newValue;
  };

  const handleChange = ({ target: { name, value } }) => {
    const newValue = formatValue(name, value);
    onChange({ target: { name: inputName, value: newValue } });
  };

  const handleChangeAll = ({ target: { name, value } }) => {
    let newValue = inputValue;

    events[name].map(event => {
      newValue = formatValue(event, value, newValue);
    });

    onChange({ target: { name: inputName, value: inputValue } });
  };

  return (
    <Wrapper>
      <table>
        <thead>
          <tr>
            <td></td>
            {headersName.map(header => {
              return <td key={header}>{header}</td>;
            })}
          </tr>
        </thead>
        <tbody>
          {Object.keys(events).map(event => {
            return (
              <EventRow
                key={event}
                name={event}
                events={events[event]}
                inputValue={inputValue}
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
  value: PropTypes.array,
};

export default EventInput;

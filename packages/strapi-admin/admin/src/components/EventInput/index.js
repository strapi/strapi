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
    entry: ['createEntry', 'updateEntry', 'deleteEntry'],
    media: ['createMedia', 'updateMedia', 'deleteMedia'],
  };

  const handleChange = ({ target: { name, value } }) => {
    let newValue = inputValue;

    if (value) {
      if (!inputValue.includes(name)) {
        newValue.push(name);
      }
    } else {
      if (inputValue.includes(name)) {
        const index = inputValue.indexOf(name);
        if (index > -1) {
          newValue.splice(index, 1);
        }
      }
    }

    onChange({ target: { name: inputName, value: newValue } });
  };

  const handleChangeAll = ({ target: { name, value } }) => {
    let newValue = inputValue;

    if (value) {
      events[name].map(event => {
        if (!inputValue.includes(event)) {
          newValue.push(event);
        }
      });
    } else {
      events[name].map(event => {
        const index = inputValue.indexOf(event);
        if (index > -1) {
          newValue.splice(index, 1);
        }
      });
    }

    onChange({ target: { name: inputName, value: newValue } });
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

EventInput.defaultProps = {
  handleClick: () => {},
  onClick: () => {},
};

EventInput.propTypes = {
  handleClick: PropTypes.func,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  value: PropTypes.array,
};

export default EventInput;

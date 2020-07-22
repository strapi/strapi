import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';

const EventRow = ({ disabledEvents, name, events, inputValue, handleChange, handleChangeAll }) => {
  const enabledCheckboxes = events.filter(event => {
    return !disabledEvents.includes(event);
  });

  const areAllCheckboxesSelected = inputValue.length === enabledCheckboxes.length;
  const hasSomeCheckboxSelected = inputValue.length > 0;

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
          name={name}
          onChange={onChangeAll}
          message={name}
          someChecked={hasSomeCheckboxSelected && !areAllCheckboxesSelected}
          value={areAllCheckboxesSelected}
        />
      </td>

      {events.map(event => {
        return (
          <td key={event}>
            <Checkbox
              disabled={disabledEvents.includes(event)}
              name={event}
              value={inputValue.includes(event)}
              onChange={handleChange}
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
  handleChange: () => {},
  handleChangeAll: () => {},
};

EventRow.propTypes = {
  disabledEvents: PropTypes.array,
  events: PropTypes.array,
  inputValue: PropTypes.array,
  handleChange: PropTypes.func,
  handleChangeAll: PropTypes.func,
  name: PropTypes.string.isRequired,
};

export default EventRow;

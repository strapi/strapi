import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';

const EventRow = ({
  name,
  events,
  inputValue,
  handleChange,
  handleChangeAll,
}) => {
  const areAllCheckboxesSelected = inputValue.length === 3;
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
  events: [],
  inputValue: [],
  handleChange: () => {},
  handleChangeAll: () => {},
};

EventRow.propTypes = {
  events: PropTypes.array,
  inputValue: PropTypes.array,
  handleChange: PropTypes.func,
  handleChangeAll: PropTypes.func,
  name: PropTypes.string.isRequired,
};

export default EventRow;

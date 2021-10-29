import React from 'react';
import PropTypes from 'prop-types';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { Checkbox } from '@strapi/design-system/Checkbox';
import upperFirst from 'lodash/upperFirst';

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
          indeterminate={hasSomeCheckboxSelected && !areAllCheckboxesSelected}
          aria-label="Select all entries"
          name={name}
          onChange={onChangeAll}
          value={areAllCheckboxesSelected}
        >
          {upperFirst(name)}
        </Checkbox>
      </td>

      {events.map(event => {
        return (
          <td key={event}>
            <BaseCheckbox
              disabled={disabledEvents.includes(event)}
              aria-label={event}
              name={event}
              value={inputValue.includes(event)}
              onValueChange={value => handleChange({ target: { name: event, value } })}
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

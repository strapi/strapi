import React, { memo } from 'react';
import PropTypes from 'prop-types';
import InputCheckbox from '../InputCheckbox';
import ItemDropdown from './ItemDropdownReset';

const DropdownItem = ({ name, onChange, value }) => {
  const handleChange = () => {
    onChange({ name, value });
  };

  return (
    <ItemDropdown key={name} toggle={false} onClick={handleChange}>
      <div>
        <InputCheckbox onChange={handleChange} name={name} value={value} />
      </div>
    </ItemDropdown>
  );
};

DropdownItem.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.bool.isRequired,
};

export default memo(DropdownItem);

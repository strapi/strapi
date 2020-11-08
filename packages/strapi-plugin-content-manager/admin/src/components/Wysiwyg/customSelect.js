/**
 *
 *
 * CustomSelect
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { InputSelect as Select } from 'strapi-helper-plugin';
import useWysiwyg from '../../hooks/useWysiwyg';
import { SELECT_OPTIONS } from './constants';
import SelectWrapper from './SelectWrapper';

const CustomSelect = ({ disabled }) => {
  const { headerValue, isFullscreen, handleChangeSelect } = useWysiwyg();

  return (
    <SelectWrapper isFullscreen={isFullscreen}>
      <Select
        disabled={disabled}
        name="headerSelect"
        onChange={handleChangeSelect}
        value={headerValue}
        selectOptions={SELECT_OPTIONS}
      />
    </SelectWrapper>
  );
};

CustomSelect.defaultProps = {
  disabled: false,
};

CustomSelect.propTypes = {
  disabled: PropTypes.bool,
};

export default CustomSelect;

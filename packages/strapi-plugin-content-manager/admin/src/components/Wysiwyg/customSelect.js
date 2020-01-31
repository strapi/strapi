/**
 *
 *
 * CustomSelect
 *
 */

import React from 'react';
import { InputSelect as Select } from 'strapi-helper-plugin';
import useWysiwyg from '../../hooks/useWysiwyg';
import { SELECT_OPTIONS } from './constants';
import SelectWrapper from './SelectWrapper';

const CustomSelect = () => {
  const {
    isPreviewMode,
    headerValue,
    isFullscreen,
    handleChangeSelect,
  } = useWysiwyg();

  return (
    <SelectWrapper isFullscreen={isFullscreen}>
      <Select
        disabled={isPreviewMode}
        name="headerSelect"
        onChange={handleChangeSelect}
        value={headerValue}
        selectOptions={SELECT_OPTIONS}
      />
    </SelectWrapper>
  );
};

export default CustomSelect;

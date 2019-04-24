/**
 *
 *
 * CustomSelect
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import { InputSelect as Select } from 'strapi-helper-plugin';
import { SELECT_OPTIONS } from './constants';

import styles from './componentsStyles.scss';

class CustomSelect extends React.Component {
  render() {
    const {
      isPreviewMode,
      headerValue,
      isFullscreen,
      handleChangeSelect,
    } = this.context;
    const selectClassName = isFullscreen
      ? styles.selectFullscreen
      : styles.editorSelect;

    return (
      <div className={selectClassName}>
        <Select
          disabled={isPreviewMode}
          name="headerSelect"
          onChange={handleChangeSelect}
          value={headerValue}
          selectOptions={SELECT_OPTIONS}
        />
      </div>
    );
  }
}

CustomSelect.contextTypes = {
  handleChangeSelect: PropTypes.func,
  headerValue: PropTypes.string,
  isPreviewMode: PropTypes.bool,
  isFullscreen: PropTypes.bool,
};

export default CustomSelect;

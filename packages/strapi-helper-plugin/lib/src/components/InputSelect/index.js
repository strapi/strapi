/**
 *
 * InputSelect
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, map } from 'lodash';
import cn from 'classnames';

// Design
import SelectOption from 'components/SelectOption';

import styles from './styles.scss';

function InputSelect(props) {
  return (
    <select
      autoFocus={props.autoFocus}
      className={cn(
        styles.inputSelect,
        'form-control',
        !props.deactivateErrorHighlight && props.error && 'is-invalid',
        !isEmpty(props.className) && props.className,
      )}
      disabled={props.disabled}
      id={props.name}
      name={props.name}
      onBlur={props.onBlur}
      onChange={props.onChange}
      onFocus={props.onFocus}
      style={props.style}
      tabIndex={props.tabIndex}
      value={props.value}
    >
      {map(props.selectOptions, (option, key) => <SelectOption key={key} {...option} />)}
    </select>
  );
}

InputSelect.defaultProps = {
  autoFocus: false,
  className: '',
  deactivateErrorHighlight: false,
  disabled: false,
  error: false,
  onBlur: () => {},
  onFocus: () => {},
  style: {},
  tabIndex: '0',
};

InputSelect.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  selectOptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      params: PropTypes.object,
      value: PropTypes.string.isRequired,
    }).isRequired,
  ).isRequired,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  value: PropTypes.string.isRequired,
};

export default InputSelect;

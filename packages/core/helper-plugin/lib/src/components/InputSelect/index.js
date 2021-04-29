/**
 *
 * InputSelect
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty, isObject, map } from 'lodash';
import cn from 'classnames';
// Design
import SelectOption from '../SelectOption';
import Select from './Select';

function InputSelect(props) {
  return (
    <Select
      autoFocus={props.autoFocus}
      className={cn(
        'form-control',
        !props.deactivateErrorHighlight && props.error && 'is-invalid',
        !isEmpty(props.className) && props.className
        // props.disabled && styles.inputSelectDisabled
      )}
      disabled={props.disabled}
      id={props.name}
      name={props.name}
      onBlur={props.onBlur}
      onChange={props.onChange}
      onFocus={props.onFocus}
      ref={props.inputRef}
      style={props.style}
      tabIndex={props.tabIndex}
      value={props.value}
    >
      {props.withOptionPlaceholder && (
        <FormattedMessage id="components.InputSelect.option.placeholder">
          {msg => (
            <option disabled hidden value="">
              {msg}
            </option>
          )}
        </FormattedMessage>
      )}
      {map(props.selectOptions, (option, key) => {
        if (isObject(option)) {
          if (option.label) {
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            );
          }

          return <SelectOption key={key} {...option} />;
        }

        return (
          <option key={key} value={option}>
            {option}
          </option>
        );
      })}
    </Select>
  );
}

InputSelect.defaultProps = {
  autoFocus: false,
  className: '',
  deactivateErrorHighlight: false,
  disabled: false,
  error: false,
  inputRef: () => {},
  onBlur: () => {},
  onFocus: () => {},
  style: {},
  tabIndex: '0',
  withOptionPlaceholder: false,
};

InputSelect.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  inputRef: PropTypes.func,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  selectOptions: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        params: PropTypes.object,
        value: PropTypes.string.isRequired,
      }),
      PropTypes.string,
    ])
  ).isRequired,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  value: PropTypes.string.isRequired,
  withOptionPlaceholder: PropTypes.bool,
};

export default InputSelect;

/**
 *
 * InputDate
 *
 */

import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import DateTime from 'react-datetime';
import { FormattedMessage } from 'react-intl';
import { isEmpty, isObject } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

/* eslint-disable react/jsx-boolean-value */
function InputDate(props) {
  const value =
    isObject(props.value) && props.value._isAMomentObject === true
      ? props.value
      : moment(props.value);
  const formattedPlaceholder =
    props.placeholder === ''
      ? 'app.utils.placeholder.defaultMessage'
      : props.placeholder;

  return (
    <FormattedMessage
      id={formattedPlaceholder}
      defaultMessage={formattedPlaceholder}
    >
      {placeholder => (
        <DateTime
          dateFormat="YYYY-MM-DD"
          inputProps={{
            autoFocus: props.autoFocus,
            className: cn(
              'form-control',
              styles.inputDate,
              !props.deactivateErrorHighlight && props.error && 'is-invalid',
              !isEmpty(props.className) && props.className,
            ),
            disabled: props.disabled,
            id: props.name,
            name: props.name,
            placeholder,
            style: props.style,
          }}
          onBlur={moment =>
            props.onBlur({
              target: {
                name: props.name,
                value: moment,
              },
            })
          }
          onChange={moment =>
            props.onChange({
              target: {
                name: props.name,
                value: moment,
              },
            })
          }
          onFocus={props.onFocus}
          ref={props.inputRef}
          tabIndex={props.tabIndex}
          timeFormat="HH:mm:ss"
          utc={true}
          value={value}
          style={props.style}
        />
      )}
    </FormattedMessage>
  );
}

InputDate.defaultProps = {
  autoFocus: false,
  className: '',
  deactivateErrorHighlight: false,
  disabled: false,
  error: false,
  inputRef: () => {},
  onBlur: () => {},
  onFocus: () => {},
  placeholder: 'app.utils.placeholder.defaultMessage',
  style: {},
  tabIndex: '0',
};

InputDate.propTypes = {
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
  placeholder: PropTypes.string,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
};

export default InputDate;

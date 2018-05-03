/**
 *
 * InputTextArea
 *
 */

/* eslint-disable jsx-a11y/no-autofocus */
import React from 'react';
import { FormattedMessage } from 'react-intl';
import { isEmpty } from 'lodash';
import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

function InputTextArea(props) {
  const placeholder = isEmpty(props.placeholder) ? 'app.utils.placeholder.defaultMessage' : props.placeholder;

  return (
    <FormattedMessage id={placeholder} defaultMessage={placeholder}>
      {(message) => (
        <textarea
          autoFocus={props.autoFocus}
          className={cn(
            'form-control',
            styles.inputTextArea,
            !isEmpty(props.className) && props.className,
            !props.deactivateErrorHighlight && props.error && 'is-invalid',
          )}
          disabled={props.disabled}
          id={props.name}
          name={props.name}
          onBlur={props.onBlur}
          onChange={props.onChange}
          onFocus={props.onFocus}
          placeholder={message}
          style={props.style}
          tabIndex={props.tabIndex}
          value={props.value}
        />
      )}
    </FormattedMessage>
  );
}

InputTextArea.defaultProps = {
  autoFocus: false,
  className: '',
  deactivateErrorHighlight: false,
  disabled: false,
  error: false,
  onBlur: () => {},
  onFocus: () => {},
  placeholder: 'app.utils.placeholder.defaultMessage',
  style: {},
  tabIndex: '0',
};

InputTextArea.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  placeholder: PropTypes.string,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  value: PropTypes.string.isRequired,
};

export default InputTextArea;

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty, isFunction, isObject } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

function InputDescription(props) {
  let content = props.children;

  if (typeof(props.message) === 'string') {
    content = props.message;
  }

  if (isObject(props.message) && props.message.id) {
    content = <FormattedMessage id={props.message.id} defaultMessage={props.message.id} values={props.message.params} />;
  }

  if (isFunction(props.message)) {
    content = props.message();
  }
  return (
    <div
      className={cn(
        styles.inputDescriptionContainer,
        !isEmpty(props.className) && props.className
      )}
      style={props.style}
    >
      <small>
        {content}
      </small>
    </div>
  );
}

InputDescription.defaultProps = {
  children: '',
  className: '',
  message: '',
  style: {},
};

InputDescription.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  message: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  style: PropTypes.object,
};

export default InputDescription;

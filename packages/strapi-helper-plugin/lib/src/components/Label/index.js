import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isFunction, isObject, upperFirst } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

function Label(props) {
  let content = props.children;

  if (typeof(props.message) === 'string') {
    content = props.message;
  }

  if (isObject(props.message) && props.message.id) {
    content = <FormattedMessage id={props.message.id} defaultMessage=" " values={props.message.params} />;
  }

  if (isFunction(props.message)) {
    content = props.message();
  }

  return (
    <label
      className={cn(styles.label, props.className)}
      htmlFor={props.htmlFor}
      style={props.style}
    >
      {content}
    </label>
  );
}

Label.defaultProps = {
  children: '',
  className: '',
  htmlFor: '',
  message: '',
  style: {},
};

Label.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  htmlFor: PropTypes.string,
  message: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.string,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  style: PropTypes.object,
};

export default Label;

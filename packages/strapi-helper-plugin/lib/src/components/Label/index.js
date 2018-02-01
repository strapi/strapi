import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isFunction, isObject, upperFirst } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

function Label(props) {
  let content = props.children;

  if (typeof(props.value) === 'string') {
    content = props.value;
  }

  if (isObject(props.value) && props.value.id) {
    content = <FormattedMessage id={props.value.id} defaultMessage=" " values={props.value.params} />;
  }

  if (isFunction(props.value)) {
    content = props.value();
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
  style: {},
  values: '',
};

Label.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  htmlFor: PropTypes.string.isRequired,
  style: PropTypes.object,
  values: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.string,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
};

export default Label;

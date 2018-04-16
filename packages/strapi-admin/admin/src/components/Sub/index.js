/**
 *
 * Sub
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isFunction, isObject } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

function Sub({ bordered, content, name, style, title, underline }) {
  if (isObject(title)) {
    return (
      <div className={cn(styles.subWrapper, bordered && styles.subBordered)}>
        <FormattedMessage {...title}>
          {message => <span className={cn(underline && styles.underlinedTitle)}>{message}{name}</span>}
        </FormattedMessage>
        {content()}
      </div>
    );
  }

  return (
    <div className={cn(styles.subWrapper, bordered && styles.subBordered)}>
      <span>{title}</span>
      <p style={style}>
        {isFunction(content) ? content() : content}
      </p>
    </div>
  );
}

Sub.defaultProps = {
  bordered: false,
  content: () => '',
  name: '',
  style: {},
  title: {
    id: 'app.utils.defaultMessage',
    defaultMessage: 'app.utils.defaultMessage',
    values: {},
  },
  underline: false,
};

Sub.propTypes = {
  bordered: PropTypes.bool,
  content: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.string,
  ]),
  name: PropTypes.string,
  style: PropTypes.object,
  title: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.string,
  ]),
  underline: PropTypes.bool,
};

export default Sub;

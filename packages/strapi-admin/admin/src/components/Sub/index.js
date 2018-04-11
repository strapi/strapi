/**
 *
 * Sub
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import styles from './styles.scss';

function Sub({ bordered, content, title, underline }) {
  return (
    <div className={cn(styles.subWrapper, bordered && styles.subBordered)}>
      <FormattedMessage {...title}>
        {message => <span className={cn(underline && styles.underlinedTitle)}>{message}</span>}
      </FormattedMessage>
      {content()}
    </div>
  );
}

Sub.defaultProps = {
  bordered: false,
  content: () => '',
  title: {
    id: 'app.utils.defaultMessage',
    defaultMessage: 'app.utils.defaultMessage',
    values: {},
  },
  underline: false,
};

Sub.propTypes = {
  bordered: PropTypes.bool,
  content: PropTypes.func,
  title: PropTypes.object,
  underline: PropTypes.bool,
};

export default Sub;

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

function Sub({ content, title, underline }) {
  return (
    <div className={styles.subWrapper}>
      <FormattedMessage {...title}>
        {message => <span className={cn(underline && styles.underlinedTitle)}>{message}</span>}
      </FormattedMessage>
      <FormattedMessage {...content}>{message => <p>{message}</p>}</FormattedMessage>
    </div>
  );
}

Sub.defaultProps = {
  content: {
    id: 'app.utils.defaultMessage',
    defaultMessage: 'app.utils.defaultMessage',
    values: {},
  },
  title: {
    id: 'app.utils.defaultMessage',
    defaultMessage: 'app.utils.defaultMessage',
    values: {},
  },
  underline: true,
};

Sub.propTypes = {
  content: PropTypes.object,
  title: PropTypes.object,
  underline: PropTypes.bool,
};

export default Sub;

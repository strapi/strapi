/**
 * NotFoundPage
 *
 * This is the page we show when the user visits a url that doesn't have a route
 *
 * NOTE: while this component should technically be a stateless functional
 * component (SFC), hot reloading does not currently support SFCs. If hot
 * reloading is not a neccessity for you then you can refactor it and remove
 * the linting exception.
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import styles from './styles.scss';
import { Link } from 'react-router';

export default class NotFound extends React.Component { // eslint-disable-line react/prefer-stateless-function

  render() {
    return (
      <div className={styles.notFound}>
        <h1 className={styles.notFoundTitle}>
          <FormattedMessage {...messages.header} />
        </h1>
        <h2 className={styles.notFoundDescription}>
          <FormattedMessage {...messages.description} />
        </h2>
        <Link to={'/'}>Back to home page.</Link>
      </div>
    );
  }
}

/**
 *
 * LeftMenuLink
 *
 */

import React from 'react';
import { Link } from 'react-router';
import appMessages from 'containers/App/messages.json';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

class LeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const messageKey = `${this.props.link.value}SectionTitle`;
    return (
      <li className={styles.leftMenuLink}>
        <Link
          className={styles.leftMenuLinkDestination}
          activeClassName={styles.leftMenuLinkDestinationActive}
          to={`/plugins/settings-manager/${this.props.link.to}`}
        >
          <FormattedMessage {...appMessages[messageKey]} />
          <i className={`ion ion-arrow-right-c ${styles.leftMenuLinkIcon}`}></i>
        </Link>
      </li>
    );
  }
}

export default LeftMenuLink;

LeftMenuLink.propTypes = {
  link: React.PropTypes.object,
};

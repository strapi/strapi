/**
 *
 * LeftMenuLink
 *
 */

import React from 'react';
import { startsWith } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';

import styles from './styles.scss';

class LeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    // We need to create our own active url checker,
    // because of the two levels router.
    const isLinkActive = startsWith(window.location.pathname.replace('/admin', ''), this.props.destination);

    return (
      <li className={styles.item}>
        <Link
          className={`${styles.link} ${isLinkActive ? styles.linkActive : ''}`}
          to={{
            pathname: this.props.destination,
            search: this.props.source ? `?source=${this.props.source}` : '',
          }}
        >
          <i className={`${styles.linkIcon} fa-${this.props.icon} fa`}></i>
          <FormattedMessage
            id={this.props.label}
            defaultMessage='{label}'
            values={{
              label: `${this.props.label} ${this.props.source !== 'content-manager' ? '⬖' : ''}`,
            }}
            className={styles.linkLabel}
          />
        </Link>
      </li>
    );
  }
}

LeftMenuLink.propTypes = {
  destination: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  source: PropTypes.string,
};

LeftMenuLink.defaultProps = {
  source: '',
};

export default LeftMenuLink;

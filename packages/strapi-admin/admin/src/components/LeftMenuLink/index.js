/**
 *
 * LeftMenuLink
 *
 */

import React from 'react';
import { startsWith, upperFirst } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router-dom';

import en from 'translations/en.json';

import styles from './styles.scss';

class LeftMenuLink extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  render() {
    // We need to create our own active url checker,
    // because of the two levels router.
    const isLinkActive = startsWith(
      window.location.pathname.replace('/admin', '').concat('/'),
      this.props.destination.concat('/'),
    );

    const plugin =
      this.props.source !== 'content-manager' && this.props.source !== '' ? (
        <div className={styles.plugin}>
          <span>{upperFirst(this.props.source.split('-').join(' '))}</span>
        </div>
      ) : (
        ''
      );

    // Check if messageId exists in en locale to prevent warning messages
    const content = en[this.props.label] ? (
      <FormattedMessage
        id={this.props.label}
        defaultMessage="{label}"
        values={{
          label: `${this.props.label}`,
        }}
        className={styles.linkLabel}
      />
    ) : (
      <span className={styles.linkLabel}>{this.props.label}</span>
    );

    return (
      <li className={styles.item}>
        <Link
          className={`${styles.link} ${isLinkActive ? styles.linkActive : ''}`}
          to={{
            pathname: this.props.destination,
            search: this.props.source ? `?source=${this.props.source}` : '',
          }}
        >
          <i className={`${styles.linkIcon} fa-${this.props.icon} fa`} />
          {content}
        </Link>
        {plugin}
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

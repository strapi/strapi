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

import en from '../../translations/en.json';

import styles from './styles.scss';

function LeftMenuLink(props) {
  const isLinkActive = startsWith(
    props.location.pathname.replace('/admin', '').concat('/'),
    props.destination.concat('/'),
  );

  const plugin =
    props.source !== 'content-manager' && props.source !== '' ? (
      <div className={styles.plugin}>
        <span>{upperFirst(props.source.split('-').join(' '))}</span>
      </div>
    ) : (
      ''
    );

  // Check if messageId exists in en locale to prevent warning messages
  const content = en[props.label] ? (
    <FormattedMessage
      id={props.label}
      defaultMessage="{label}"
      values={{
        label: `${props.label}`,
      }}
      className={styles.linkLabel}
    />
  ) : (
    <span className={styles.linkLabel}>{props.label}</span>
  );

  // Icon.
  const icon = <i className={`${styles.linkIcon} fa-${props.icon} fa`} />;

  // Create external or internal link.
  const link = props.destination.includes('http') ? (
    <a
      className={`${styles.link} ${isLinkActive ? styles.linkActive : ''}`}
      href={props.destination}
      target="_blank"
    >
      {icon}
      {content}
    </a>
  ) : (
    <Link
      className={`${styles.link} ${isLinkActive ? styles.linkActive : ''}`}
      to={{
        pathname: props.destination,
        search: props.source ? `?source=${props.source}` : '',
      }}
    >
      {icon}
      {content}
    </Link>
  );

  return (
    <li className={styles.item}>
      {link}
      {plugin}
    </li>
  );
}

LeftMenuLink.propTypes = {
  destination: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string,
  }).isRequired,
  source: PropTypes.string,
};

LeftMenuLink.defaultProps = {
  source: '',
};

export default LeftMenuLink;

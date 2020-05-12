/**
 *
 * LeftMenuLink
 *
 */

import React from 'react';
import { startsWith } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styled from 'styled-components';
import { Link, withRouter } from 'react-router-dom';

import en from '../../translations/en.json';
import LeftMenuIcon from './LeftMenuIcon';
import A from './A';

const LinkLabel = styled.span`
  display: inline-block;
  width: 100%;
  padding-right: 1rem;
  padding-left: 2.6rem;
`;

const LeftMenuLinkContent = ({
  destination,
  iconName,
  label,
  location,
  source,
  suffixUrlToReplaceForLeftMenuHighlight,
}) => {
  const isLinkActive = startsWith(
    location.pathname.replace('/admin', '').concat('/'),

    destination.replace(suffixUrlToReplaceForLeftMenuHighlight, '').concat('/')
  );

  // Check if messageId exists in en locale to prevent warning messages
  const content = en[label] ? (
    <FormattedMessage
      id={label}
      defaultMessage="{label}"
      values={{
        label: `${label}`,
      }}
    >
      {message => <LinkLabel>{message}</LinkLabel>}
    </FormattedMessage>
  ) : (
    <LinkLabel>{label}</LinkLabel>
  );

  // Create external or internal link.
  return destination.includes('http') ? (
    <A
      className={isLinkActive ? 'linkActive' : ''}
      href={destination}
      target="_blank"
      rel="noopener noreferrer"
    >
      <LeftMenuIcon icon={iconName} />
      {content}
    </A>
  ) : (
    <A
      as={Link}
      className={isLinkActive ? 'linkActive' : ''}
      to={{
        pathname: destination,
        search: source ? `?source=${source}` : '',
      }}
    >
      <LeftMenuIcon icon={iconName} />
      {content}
    </A>
  );
};

LeftMenuLinkContent.propTypes = {
  destination: PropTypes.string.isRequired,
  iconName: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string,
  }).isRequired,
  source: PropTypes.string,
  suffixUrlToReplaceForLeftMenuHighlight: PropTypes.string,
};

LeftMenuLinkContent.defaultProps = {
  source: '',
  suffixUrlToReplaceForLeftMenuHighlight: '',
};

export default withRouter(LeftMenuLinkContent);

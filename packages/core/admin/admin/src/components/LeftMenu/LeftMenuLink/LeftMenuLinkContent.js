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
import en from '../../../translations/en.json';
import LeftMenuIcon from './LeftMenuIcon';
import A from './A';
import NotificationCount from './NotificationCount';

const LinkLabel = styled.span`
  display: inline-block;
  width: 100%;
  padding-right: 1rem;
  padding-left: 2.5rem;
`;

// TODO: refacto this file
const LeftMenuLinkContent = ({
  destination,
  iconName,
  label,
  location,
  notificationsCount,
  search,
}) => {
  const isLinkActive = startsWith(
    location.pathname.replace('/admin', '').concat('/'),
    destination.concat('/')
  );

  // Check if messageId exists in en locale to prevent warning messages
  const labelId = label.id || label;
  const content =
    en[labelId] || label.defaultMessage ? (
      <FormattedMessage
        id={labelId}
        defaultMessage={label.defaultMessage || '{label}'}
        values={{
          label: `${label.id || label}`,
        }}
      >
        {message => <LinkLabel>{message}</LinkLabel>}
      </FormattedMessage>
    ) : (
      <LinkLabel>{labelId}</LinkLabel>
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
        search,
      }}
    >
      <LeftMenuIcon icon={iconName} />
      {content}
      {notificationsCount > 0 && <NotificationCount count={notificationsCount} />}
    </A>
  );
};

LeftMenuLinkContent.defaultProps = {
  search: null,
};
LeftMenuLinkContent.propTypes = {
  destination: PropTypes.string.isRequired,
  iconName: PropTypes.string.isRequired,
  label: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string,
  }).isRequired,
  notificationsCount: PropTypes.number.isRequired,
  search: PropTypes.string,
};

export default withRouter(LeftMenuLinkContent);

import React from 'react';

import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import MagicLinkWrapper from './MagicLinkWrapper';

export const MagicLinkCE = ({ registrationToken }) => {
  const { formatMessage } = useIntl();
  const target = `${window.location.origin}${process.env.ADMIN_PATH.replace(
    window.location.origin,
    ''
  )}auth/register?registrationToken=${registrationToken}`;

  return (
    <MagicLinkWrapper target={target}>
      {formatMessage({
        id: 'app.components.Users.MagicLink.connect',
        defaultMessage: 'Copy and share this link to give access to this user',
      })}
    </MagicLinkWrapper>
  );
};

MagicLinkCE.defaultProps = {
  registrationToken: '',
};

MagicLinkCE.propTypes = {
  registrationToken: PropTypes.string,
};

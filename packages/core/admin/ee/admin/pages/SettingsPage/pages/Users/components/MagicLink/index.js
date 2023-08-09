import React from 'react';

import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import basename from '../../../../../../../../admin/src/core/utils/basename';
import MagicLinkWrapper from '../../../../../../../../admin/src/pages/SettingsPage/pages/Users/components/MagicLink/MagicLinkWrapper';

// FIXME replace with parts compo when ready
export const MagicLinkEE = ({ registrationToken }) => {
  const { formatMessage } = useIntl();

  if (registrationToken) {
    return (
      <MagicLinkWrapper
        target={`${window.location.origin}${basename}auth/register?registrationToken=${registrationToken}`}
      >
        {formatMessage({
          id: 'app.components.Users.MagicLink.connect',
          defaultMessage: 'Copy and share this link to give access to this user',
        })}
      </MagicLinkWrapper>
    );
  }

  return (
    <MagicLinkWrapper target={`${window.location.origin}${basename}auth/login`}>
      {formatMessage({
        id: 'app.components.Users.MagicLink.connect.sso',
        defaultMessage:
          'Send this link to the user, the first login can be made via a SSO provider.',
      })}
    </MagicLinkWrapper>
  );
};

MagicLinkEE.defaultProps = {
  registrationToken: '',
};

MagicLinkEE.propTypes = {
  registrationToken: PropTypes.string,
};

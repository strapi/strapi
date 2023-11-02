import React from 'react';

import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getBasename } from '../../../../../../core/utils/basename';

import MagicLinkWrapper from './MagicLinkWrapper';

export const MagicLinkCE = ({ registrationToken }) => {
  const { formatMessage } = useIntl();
  const target = `${
    window.location.origin
  }${getBasename()}auth/register?registrationToken=${registrationToken}`;

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

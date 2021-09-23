import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import basename from '../../../../../../core/utils/basename';
import MagicLinkWrapper from './MagicLinkWrapper';

const MagicLink = ({ registrationToken }) => {
  const { formatMessage } = useIntl();
  const target = `${window.location.origin}${basename}auth/register?registrationToken=${registrationToken}`;

  return (
    <MagicLinkWrapper target={target}>
      {formatMessage({
        id: 'app.components.Users.MagicLink.connect',
        defaultMessage: 'Send this link to the user for them to connect.',
      })}
    </MagicLinkWrapper>
  );
};

MagicLink.defaultProps = {
  registrationToken: '',
};

MagicLink.propTypes = {
  registrationToken: PropTypes.string,
};

export default MagicLink;

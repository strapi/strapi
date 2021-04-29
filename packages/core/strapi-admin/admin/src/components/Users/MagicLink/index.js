import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import LinkNotification from '../LinkNotification';
import basename from '../../../utils/basename';

const MagicLink = ({ registrationToken }) => {
  const { formatMessage } = useIntl();

  const link = `${window.location.origin}${basename}auth/register?registrationToken=${registrationToken}`;

  return (
    <LinkNotification target={link}>
      {formatMessage({ id: 'app.components.Users.MagicLink.connect' })}
    </LinkNotification>
  );
};

MagicLink.defaultProps = {
  registrationToken: '',
};

MagicLink.propTypes = {
  registrationToken: PropTypes.string,
};

export default MagicLink;

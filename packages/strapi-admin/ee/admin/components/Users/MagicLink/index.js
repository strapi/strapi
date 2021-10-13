import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import LinkNotification from '../../../../../admin/src/components/Users/LinkNotification';
import basename from '../../../../../admin/src/utils/basename';

const MagicLink = ({ registrationToken }) => {
  const { formatMessage } = useIntl();

  if (registrationToken) {
    return (
      <LinkNotification
        target={`${window.location.origin}${basename}auth/register?registrationToken=${registrationToken}`}
      >
        {formatMessage({ id: 'app.components.Users.MagicLink.connect' })}
      </LinkNotification>
    );
  }

  return (
    <LinkNotification target={`${window.location.origin}${basename}`}>
      {formatMessage({ id: 'app.components.Users.MagicLink.connect.sso' })}
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

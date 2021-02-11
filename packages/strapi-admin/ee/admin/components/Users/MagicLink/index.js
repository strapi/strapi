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
        link={`${window.location.origin}${basename}auth/register?registrationToken=${registrationToken}`}
        description={formatMessage({ id: 'app.components.Users.MagicLink.connect' })}
      />
    );
  }

  return (
    <LinkNotification
      link={`${window.location.origin}${basename}`}
      description={formatMessage({ id: 'app.components.Users.MagicLink.connect.sso' })}
    />
  );
};

MagicLink.defaultProps = {
  registrationToken: '',
};

MagicLink.propTypes = {
  registrationToken: PropTypes.string,
};

export default MagicLink;

import React from 'react';
import PropTypes from 'prop-types';
import LinkNotification from '../LinkNotification';
import basename from '../../../utils/basename';

const MagicLink = ({ registrationToken, description }) => {
  const link = `${window.location.origin}${basename}auth/register?registrationToken=${registrationToken}`;

  return <LinkNotification link={link} description={description} />;
};

MagicLink.defaultProps = {
  registrationToken: '',
  description: '',
};

MagicLink.propTypes = {
  registrationToken: PropTypes.string,
  description: PropTypes.string,
};

export default MagicLink;

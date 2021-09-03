import React from 'react';
import { useIntl } from 'react-intl';
import { Text } from '@strapi/parts/Text';
import PropTypes from 'prop-types';
import basename from '../../../../core/utils/basename';
import MagicLinkWrapper from './MagicLinkWrapper';

const MagicLink = ({ registrationToken }) => {
  const { formatMessage } = useIntl();
  const target = `${window.location.origin}${basename}auth/register?registrationToken=${registrationToken}`;

  return (
    <MagicLinkWrapper target={target}>
      <Text small textColor="neutral600" highlighted>
        {formatMessage({
          id: 'app.components.Users.MagicLink.connect',
          defaultMessage: 'Send this link to the user for them to connect.',
        })}
      </Text>
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

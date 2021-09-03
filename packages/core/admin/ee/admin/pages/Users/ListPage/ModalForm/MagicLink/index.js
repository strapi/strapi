import React from 'react';
import { useIntl } from 'react-intl';
import { Text } from '@strapi/parts/Text';
import PropTypes from 'prop-types';
import basename from '../../../../../../../admin/src/core/utils/basename';
import MagicLinkWrapper from '../../../../../../../admin/src/pages/Users/ListPage/ModalForm/MagicLink/MagicLinkWrapper';

// FIXME replace with parts compo when ready
const MagicLink = ({ registrationToken }) => {
  const { formatMessage } = useIntl();

  if (registrationToken) {
    return (
      <MagicLinkWrapper
        target={`${window.location.origin}${basename}auth/register?registrationToken=${registrationToken}`}
      >
        <Text small textColor="neutral500" highlighted>
          {formatMessage({
            id: 'app.components.Users.MagicLink.connect',
            defaultMessage: 'Send this link to the user for them to connect.',
          })}
        </Text>
      </MagicLinkWrapper>
    );
  }

  return (
    <MagicLinkWrapper target={`${window.location.origin}${basename}auth/register`}>
      <Text small textColor="neutral500" highlighted>
        {formatMessage({
          id: 'app.components.Users.MagicLink.connect.sso',
          defaultMessage:
            'Send this link to the user, the first login can be made via a SSO provider.',
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

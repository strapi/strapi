import { useIntl } from 'react-intl';

import { getBasename } from '../../../../../../../../admin/src/core/utils/basename';
import { MagicLinkWrapper } from '../../../../../../../../admin/src/pages/Settings/pages/Users/components/MagicLinkWrapper';

import type { MagicLinkCEProps } from '../../../../../../../../admin/src/pages/Settings/pages/Users/components/MagicLinkCE';

// FIXME replace with parts compo when ready
export const MagicLinkEE = ({ registrationToken }: MagicLinkCEProps) => {
  const { formatMessage } = useIntl();

  if (registrationToken) {
    return (
      <MagicLinkWrapper
        target={`${
          window.location.origin
        }${getBasename()}/auth/register?registrationToken=${registrationToken}`}
      >
        {formatMessage({
          id: 'app.components.Users.MagicLink.connect',
          defaultMessage: 'Copy and share this link to give access to this user',
        })}
      </MagicLinkWrapper>
    );
  }

  return (
    <MagicLinkWrapper target={`${window.location.origin}${getBasename()}/auth/login`}>
      {formatMessage({
        id: 'app.components.Users.MagicLink.connect.sso',
        defaultMessage:
          'Send this link to the user, the first login can be made via a SSO provider.',
      })}
    </MagicLinkWrapper>
  );
};

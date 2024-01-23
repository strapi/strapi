import { useIntl } from 'react-intl';

import { getBasename } from '../../../../../core/utils/basename';

import { MagicLinkWrapper } from './MagicLinkWrapper';

interface MagicLinkCEProps {
  registrationToken: string;
}

const MagicLinkCE = ({ registrationToken }: MagicLinkCEProps) => {
  const { formatMessage } = useIntl();
  const target = `${
    window.location.origin
  }${getBasename()}/auth/register?registrationToken=${registrationToken}`;

  return (
    <MagicLinkWrapper target={target}>
      {formatMessage({
        id: 'app.components.Users.MagicLink.connect',
        defaultMessage: 'Copy and share this link to give access to this user',
      })}
    </MagicLinkWrapper>
  );
};

export { MagicLinkCE };
export type { MagicLinkCEProps };

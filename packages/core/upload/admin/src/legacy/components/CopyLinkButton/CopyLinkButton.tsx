// TODO: find a better naming convention for the file that was an index file before
import { useNotification, useClipboard } from '@strapi/admin/strapi-admin';
import { IconButton } from '@strapi/design-system';
import { Link as LinkIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

export const CopyLinkButton = ({ url }: { url: string }) => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const { copy } = useClipboard();

  const handleClick = async () => {
    const didCopy = await copy(url);

    if (didCopy) {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'notification.link-copied',
          defaultMessage: 'Link copied into the clipboard',
        }),
      });
    }
  };

  return (
    <IconButton
      label={formatMessage({
        id: getTrad('control-card.copy-link'),
        defaultMessage: 'Copy link',
      })}
      onClick={handleClick}
    >
      <LinkIcon />
    </IconButton>
  );
};

import { IconButton } from '@strapi/design-system';
import { ContentBox, useClipboard, useNotification, useTracking } from '@strapi/helper-plugin';
import { Duplicate, Key } from '@strapi/icons';
import { useIntl } from 'react-intl';

interface TokenBoxProps {
  token?: string;
  tokenType: 'transfer-token' | 'api-token';
}

export const TokenBox = ({ token, tokenType }: TokenBoxProps) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();

  const { copy } = useClipboard();

  const handleClick = (token: TokenBoxProps['token']) => async () => {
    if (token) {
      const didCopy = await copy(token);

      if (didCopy) {
        trackUsage('didCopyTokenKey', {
          tokenType,
        });
        toggleNotification({
          type: 'success',
          message: { id: 'Settings.tokens.notification.copied' },
        });
      }
    }
  };

  return (
    <ContentBox
      endAction={
        token && (
          <span style={{ alignSelf: 'start' }}>
            <IconButton
              label={formatMessage({
                id: 'app.component.CopyToClipboard.label',
                defaultMessage: 'Copy to clipboard',
              })}
              onClick={handleClick(token)}
              borderWidth={0}
              icon={<Duplicate />}
              style={{ padding: 0, height: '1rem' }}
            />
          </span>
        )
      }
      title={
        token ||
        formatMessage({
          id: 'Settings.tokens.copy.editTitle',
          defaultMessage: 'This token isn’t accessible anymore.',
        })
      }
      subtitle={
        token
          ? formatMessage({
              id: 'Settings.tokens.copy.lastWarning',
              defaultMessage: 'Make sure to copy this token, you won’t be able to see it again!',
            })
          : formatMessage({
              id: 'Settings.tokens.copy.editMessage',
              defaultMessage: 'For security reasons, you can only see your token once.',
            })
      }
      icon={<Key />}
      iconBackground="neutral100"
    />
  );
};

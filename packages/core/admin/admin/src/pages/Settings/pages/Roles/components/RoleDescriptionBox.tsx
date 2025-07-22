import { IconButton } from '@strapi/design-system';
import { Duplicate, Sparkle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { ContentBox } from '../../../../../components/ContentBox';
import { useNotification } from '../../../../../features/Notifications';
import { useClipboard } from '../../../../../hooks/useClipboard';

interface RoleDescriptionBoxProps {
  description: string;
}

const StyledContentBox = styled(ContentBox)`
  margin-bottom: 10px;
`;

export const RoleDescriptionBox = ({ description }: RoleDescriptionBoxProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { copy } = useClipboard();

  const handleCopy = async () => {
    if (description) {
      const didCopy = await copy(description);

      if (didCopy) {
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'Settings.roles.description.notification.copied',
            defaultMessage: 'Role description copied to clipboard',
          }),
        });
      }
    }
  };

  return (
    <StyledContentBox
      endAction={
        <span style={{ alignSelf: 'start' }}>
          <IconButton
            label={formatMessage({
              id: 'app.component.CopyToClipboard.label',
              defaultMessage: 'Copy to clipboard',
            })}
            onClick={handleCopy}
            variant="ghost"
            type="button"
            style={{ padding: 0, height: '1.6rem' }}
          >
            <Duplicate />
          </IconButton>
        </span>
      }
      subtitle={description}
      title={formatMessage({
        id: 'Settings.roles.description.ai-generated.subtitle',
        defaultMessage: 'AI-generated role description',
      })}
      icon={<Sparkle />}
      iconBackground="neutral100"
    />
  );
};

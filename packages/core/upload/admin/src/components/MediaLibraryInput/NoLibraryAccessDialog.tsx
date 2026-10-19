import { Page } from '@strapi/admin/strapi-admin';
import { Button, Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../utils/translations';

interface NoLibraryAccessDialogProps {
  onClose: () => void;
}

/**
 * What the library picker shows a role without read access, without mounting
 * the picker itself: its hooks would still request the upload settings and
 * configuration, and collect a 403 each.
 */
export const NoLibraryAccessDialog = ({ onClose }: NoLibraryAccessDialogProps) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslationKey('header.actions.add-assets'),
              defaultMessage: 'Add new assets',
            })}
          </Modal.Title>
        </Modal.Header>
        <Page.NoPermissions />
        <Modal.Footer>
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

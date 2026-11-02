import * as React from 'react';

import { Button, Field, Modal, Textarea } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { validateUrls } from '../../../utils/files';
import { getTranslationKey } from '../../../utils/translations';

interface ImportFromUrlDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (urls: string[]) => Promise<void>;
}

export const ImportFromUrlDialog = ({ open, onClose, onUpload }: ImportFromUrlDialogProps) => {
  const { formatMessage } = useIntl();
  const [urls, setUrls] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleClose = () => {
    setUrls('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URLs
    const { urls: validUrls, error: validationError } = validateUrls(urls);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    // Close dialog and let the mutation handle fetching and uploading
    handleClose();

    // Pass URLs to mutation which handles fetching and upload progress
    await onUpload(validUrls);
  };

  return (
    <Modal.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <Modal.Content>
        <form onSubmit={handleSubmit}>
          <Modal.Header>
            <Modal.Title>
              {formatMessage({
                id: getTranslationKey('modal.url.title'),
                defaultMessage: 'Import from URL',
              })}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Field.Root
              error={error || undefined}
              hint={formatMessage({
                id: getTranslationKey('input.url.description'),
                defaultMessage: 'Separate your URL links by a carriage return.',
              })}
            >
              <Field.Label>
                {formatMessage({
                  id: getTranslationKey('input.url.label'),
                  defaultMessage: 'URL(s)',
                })}
              </Field.Label>
              <Textarea
                name="urls"
                minHeight="unset"
                rows={Math.min(urls.split('\n').length, 7)}
                maxHeight="10.5rem"
                placeholder={formatMessage({
                  id: getTranslationKey('input.url.placeholder'),
                  defaultMessage: 'Empty',
                })}
                value={urls}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setUrls(e.target.value);
                  setError(null);
                }}
              />
              <Field.Hint />
              <Field.Error />
            </Field.Root>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="tertiary" onClick={handleClose}>
              {formatMessage({
                id: 'app.components.Button.cancel',
                defaultMessage: 'Cancel',
              })}
            </Button>
            <Button type="submit">
              {formatMessage({
                id: getTranslationKey('modal.url.upload'),
                defaultMessage: 'Upload',
              })}
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

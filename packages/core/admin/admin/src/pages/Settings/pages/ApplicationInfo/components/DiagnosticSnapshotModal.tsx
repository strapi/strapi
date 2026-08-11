import * as React from 'react';

import { Box, Button, Flex, Loader, Modal, Typography } from '@strapi/design-system';
import { Download, Duplicate } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useNotification } from '../../../../../features/Notifications';
import { useClipboard } from '../../../../../hooks/useClipboard';
import { useLazyGetDebugDumpQuery } from '../../../../../services/admin';

/* -------------------------------------------------------------------------------------------------
 * DiagnosticSnapshotModal
 * -----------------------------------------------------------------------------------------------*/

interface DiagnosticSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Generates the redacted diagnostic snapshot behind the Support card's "Generate snapshot" action.
 * The fetch is triggered as soon as the modal opens, so the user only ever sees a spinner followed
 * by the payload (or, on failure, a notification while the modal closes itself).
 */
const DiagnosticSnapshotModal = ({ isOpen, onClose }: DiagnosticSnapshotModalProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { copy } = useClipboard();
  const [triggerGetDump, { data, isFetching, isError }] = useLazyGetDebugDumpQuery();

  React.useEffect(() => {
    if (isOpen) {
      triggerGetDump();
    }
  }, [isOpen, triggerGetDump]);

  React.useEffect(() => {
    if (isOpen && isError) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'Settings.debug-dump.error',
          defaultMessage: 'Failed to generate the debug dump. Check the server logs and try again.',
        }),
      });
      onClose();
    }
  }, [isOpen, isError, toggleNotification, formatMessage, onClose]);

  const serialized = React.useMemo(
    () => (data === undefined ? '' : JSON.stringify(data, null, 2)),
    [data]
  );

  const isReady = !isFetching && data !== undefined;

  const handleCopy = async () => {
    const didCopy = await copy(serialized);
    toggleNotification({
      type: didCopy ? 'success' : 'danger',
      message: didCopy
        ? formatMessage({ id: 'Settings.debug-dump.copied', defaultMessage: 'Copied to clipboard' })
        : formatMessage({
            id: 'Settings.debug-dump.copy-failed',
            defaultMessage: 'Could not copy to clipboard',
          }),
    });
  };

  const handleDownload = () => {
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `strapi-debug-dump-${new Date().toISOString().replace(/:/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={onClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: 'Settings.debug-dump.snapshot-modal.title',
              defaultMessage: 'Diagnostic snapshot',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isReady ? (
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Typography textColor="neutral600">
                {formatMessage({
                  id: 'Settings.debug-dump.snapshot-modal.description',
                  defaultMessage:
                    "This snapshot describes how your project is built so a third party can reproduce the bug locally. It does not contain any of your app's content and no credentials.",
                })}
              </Typography>
              <Typography variant="sigma" textColor="neutral600">
                {formatMessage({
                  id: 'Settings.debug-dump.payload-label',
                  defaultMessage: 'payload',
                })}
              </Typography>
              <Box background="neutral800" hasRadius padding={4} maxHeight="26rem" overflow="auto">
                <Typography
                  tag="pre"
                  variant="pi"
                  textColor="neutral0"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}
                >
                  {serialized}
                </Typography>
              </Box>
            </Flex>
          ) : (
            <Flex justifyContent="center" alignItems="center" padding={7}>
              <Loader>Generating diagnostic snapshot</Loader>
            </Flex>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="tertiary"
            onClick={handleCopy}
            startIcon={<Duplicate />}
            disabled={!isReady}
          >
            {formatMessage({ id: 'Settings.debug-dump.copy', defaultMessage: 'Copy' })}
          </Button>
          <Button onClick={handleDownload} startIcon={<Download />} disabled={!isReady}>
            {formatMessage({ id: 'Settings.debug-dump.download', defaultMessage: 'Download' })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { DiagnosticSnapshotModal };
export type { DiagnosticSnapshotModalProps };

import { Box, Button, Dialog, Flex, Portal, ProgressBar, Typography } from '@strapi/design-system';
import { CheckCircle, Download, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useBlocker } from 'react-router-dom';
import { styled } from 'styled-components';

import { useWarnIfUnsavedChanges } from '../../../../../../../../admin/src/hooks/useWarnIfUnsavedChanges';

import type { ExportProgress, ExportResult } from '../hooks/useExportAuditLogs';

const ExportProgressBar = styled(ProgressBar)`
  width: 100%;
  background-color: ${({ theme }) => theme.colors.neutral150};

  > div {
    background-color: ${({ theme }) => theme.colors.primary600};
  }
`;

interface ExportCardProps {
  progress: ExportProgress | null;
  exportResult: ExportResult | null;
  onDownload: () => void;
  onDismiss: () => void;
}

const ExportCard = ({ progress, exportResult, onDownload, onDismiss }: ExportCardProps) => {
  const { formatMessage } = useIntl();

  const isExportPending = Boolean(progress || exportResult);

  useWarnIfUnsavedChanges(isExportPending);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isExportPending && currentLocation.pathname !== nextLocation.pathname
  );

  if (!progress && !exportResult) {
    return null;
  }

  const progressCaption = progress
    ? formatMessage(
        {
          id: 'Settings.permissions.auditLogs.listview.export.progress.caption',
          defaultMessage:
            'Preparing your export - {fetched, number} out of {total, plural, one {# event} other {# events}}',
        },
        { fetched: progress.fetched, total: progress.total }
      )
    : null;

  return (
    <Portal>
      <Box position="fixed" bottom={4} right={4} zIndex={200} width="32rem" role="status">
        <Flex
          direction="column"
          alignItems="stretch"
          gap={2}
          padding={4}
          hasRadius
          background="neutral0"
          borderColor="neutral150"
          shadow="popupShadow"
        >
          {progress ? (
            <>
              <Typography fontWeight="bold">
                {formatMessage({
                  id: 'Settings.permissions.auditLogs.listview.export.progress.title',
                  defaultMessage: 'Exporting audit logs',
                })}
              </Typography>
              <ExportProgressBar
                size="S"
                value={
                  progress.total > 0 ? Math.round((progress.fetched / progress.total) * 100) : 0
                }
                aria-label={progressCaption ?? undefined}
              />
              <Typography variant="pi" textColor="neutral600">
                {progressCaption}
              </Typography>
            </>
          ) : (
            exportResult && (
              <>
                <Flex gap={2}>
                  <CheckCircle fill="success500" />
                  <Typography fontWeight="bold">
                    {formatMessage({
                      id: 'Settings.permissions.auditLogs.listview.export.ready.title',
                      defaultMessage: 'Export ready',
                    })}
                  </Typography>
                </Flex>
                <Typography variant="pi" textColor="neutral600">
                  {exportResult.fileName}
                </Typography>
                <Flex gap={2}>
                  <Button startIcon={<Download />} onClick={onDownload}>
                    {formatMessage({
                      id: 'Settings.permissions.auditLogs.listview.export.ready.download',
                      defaultMessage: 'Download CSV',
                    })}
                  </Button>
                  <Button variant="tertiary" onClick={onDismiss}>
                    {formatMessage({
                      id: 'app.components.Button.cancel',
                      defaultMessage: 'Cancel',
                    })}
                  </Button>
                </Flex>
              </>
            )
          )}
        </Flex>
      </Box>
      {blocker.state === 'blocked' && (
        <Dialog.Root
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              blocker.reset();
            }
          }}
        >
          <Dialog.Content>
            <Dialog.Header>
              {formatMessage({
                id: 'app.components.ConfirmDialog.title',
                defaultMessage: 'Confirmation',
              })}
            </Dialog.Header>
            <Dialog.Body
              icon={<WarningCircle width="24px" height="24px" fill="danger600" />}
              textAlign="center"
            >
              {formatMessage({
                id: 'Settings.permissions.auditLogs.listview.export.leave',
                defaultMessage:
                  'Are you sure you want to leave? Your ongoing export will be canceled.',
              })}
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.Cancel>
                <Button variant="tertiary" fullWidth>
                  {formatMessage({
                    id: 'app.components.Button.cancel',
                    defaultMessage: 'Cancel',
                  })}
                </Button>
              </Dialog.Cancel>
              <Button onClick={() => blocker.proceed()} variant="danger-light" fullWidth>
                {formatMessage({
                  id: 'app.components.Button.confirm',
                  defaultMessage: 'Confirm',
                })}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </Portal>
  );
};

export { ExportCard };
export type { ExportCardProps };

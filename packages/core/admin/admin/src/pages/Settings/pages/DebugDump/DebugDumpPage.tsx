import * as React from 'react';

import { Box, Button, Flex, Typography } from '@strapi/design-system';
import { Download, Duplicate } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useNotification } from '../../../../features/Notifications';
import { useClipboard } from '../../../../hooks/useClipboard';
import { useLazyGetDebugDumpQuery } from '../../../../services/admin';

const DebugDumpPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const [triggerGetDump, { isFetching }] = useLazyGetDebugDumpQuery();
  const { copy } = useClipboard();
  const [dump, setDump] = React.useState<unknown>(undefined);

  const serialized = React.useMemo(
    () => (dump === undefined ? '' : JSON.stringify(dump, null, 2)),
    [dump]
  );

  const handleGenerate = async () => {
    const result = await triggerGetDump();
    if ('data' in result && result.data) {
      setDump(result.data);
    } else {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'Settings.debug-dump.error',
          defaultMessage: 'Failed to generate the debug dump. Check the server logs and try again.',
        }),
      });
    }
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

  const handleCopy = async () => {
    const didCopy = await copy(serialized);
    if (didCopy) {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'Settings.debug-dump.copied',
          defaultMessage: 'Copied to clipboard',
        }),
      });
    }
  };

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: formatMessage({
              id: 'Settings.debug-dump.title',
              defaultMessage: 'Debug & support',
            }),
          }
        )}
      </Page.Title>
      <Layouts.Header
        title={formatMessage({
          id: 'Settings.debug-dump.title',
          defaultMessage: 'Debug & support',
        })}
        subtitle={formatMessage({
          id: 'Settings.debug-dump.subtitle',
          defaultMessage: 'Generate a diagnostic export to share with Strapi Support',
        })}
        primaryAction={
          <Button loading={isFetching} onClick={handleGenerate} startIcon={<Download />}>
            {formatMessage({ id: 'Settings.debug-dump.generate', defaultMessage: 'Generate dump' })}
          </Button>
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Typography variant="pi" textColor="neutral600">
            {formatMessage({
              id: 'Settings.debug-dump.description',
              defaultMessage:
                'Secrets and credentials are redacted. Review the preview before sharing.',
            })}
          </Typography>
          {dump !== undefined && (
            <Box
              hasRadius
              background="neutral0"
              shadow="tableShadow"
              padding={4}
              maxHeight="480px"
              overflow="auto"
            >
              <Flex justifyContent="flex-end" gap={2} paddingBottom={2}>
                <Button variant="tertiary" onClick={handleCopy} startIcon={<Duplicate />}>
                  {formatMessage({ id: 'Settings.debug-dump.copy', defaultMessage: 'Copy' })}
                </Button>
                <Button variant="secondary" onClick={handleDownload} startIcon={<Download />}>
                  {formatMessage({
                    id: 'Settings.debug-dump.download',
                    defaultMessage: 'Download',
                  })}
                </Button>
              </Flex>
              <Box tag="pre" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                <Typography variant="pi" tag="code">
                  {serialized}
                </Typography>
              </Box>
            </Box>
          )}
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
};

const ProtectedDebugDumpPage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['debug-dump']?.main
  );

  return (
    <Page.Protect permissions={permissions}>
      <DebugDumpPage />
    </Page.Protect>
  );
};

export { DebugDumpPage, ProtectedDebugDumpPage };

import * as React from 'react';

import { Box, Button, Flex, LinkButton, Textarea, Typography } from '@strapi/design-system';
import { Download, Duplicate, ExternalLink } from '@strapi/icons';
import { useIntl, type MessageDescriptor } from 'react-intl';

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

  // Support channels depend on the edition: Growth/Enterprise (EE) route to Strapi
  // Support, Community (CE) to the community channels.
  const isEnterprise = window.strapi.isEE;
  const supportLinks: Array<{ id: string; href: string; label: MessageDescriptor }> = isEnterprise
    ? [
        {
          id: 'strapi-support',
          href: 'https://support.strapi.io',
          label: { id: 'Settings.debug-dump.support.strapi', defaultMessage: 'Strapi Support' },
        },
        {
          id: 'github-issues',
          href: 'https://github.com/strapi/strapi/issues',
          label: {
            id: 'Settings.debug-dump.support.github-issues',
            defaultMessage: 'GitHub Issues',
          },
        },
      ]
    : [
        {
          id: 'discord',
          href: 'https://discord.strapi.io',
          label: { id: 'Settings.debug-dump.support.discord', defaultMessage: 'Discord' },
        },
        {
          id: 'github-discussions',
          href: 'https://github.com/strapi/strapi/discussions',
          label: {
            id: 'Settings.debug-dump.support.github-discussions',
            defaultMessage: 'GitHub Discussions',
          },
        },
        {
          id: 'github-issues',
          href: 'https://github.com/strapi/strapi/issues',
          label: {
            id: 'Settings.debug-dump.support.github-issues',
            defaultMessage: 'GitHub Issues',
          },
        },
      ];

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
          <Box hasRadius background="neutral0" shadow="tableShadow" padding={4}>
            <Flex direction="column" alignItems="start" gap={3}>
              <Flex direction="column" alignItems="start" gap={1}>
                <Typography variant="delta" tag="h2">
                  {formatMessage(
                    isEnterprise
                      ? {
                          id: 'Settings.debug-dump.support.enterprise',
                          defaultMessage: 'Get help from Strapi Support',
                        }
                      : {
                          id: 'Settings.debug-dump.support.community',
                          defaultMessage: 'Get help from the community',
                        }
                  )}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {formatMessage({
                    id: 'Settings.debug-dump.support.description',
                    defaultMessage:
                      'Generate the export below, then share it with us through one of these channels.',
                  })}
                </Typography>
              </Flex>
              <Flex gap={2} wrap="wrap">
                {supportLinks.map((link) => (
                  <LinkButton
                    key={link.id}
                    variant="secondary"
                    href={link.href}
                    endIcon={<ExternalLink />}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {formatMessage(link.label)}
                  </LinkButton>
                ))}
              </Flex>
            </Flex>
          </Box>
          <Typography variant="pi" textColor="neutral600">
            {formatMessage({
              id: 'Settings.debug-dump.description',
              defaultMessage:
                'Secrets and credentials are redacted. Review the preview before sharing.',
            })}
          </Typography>
          {dump !== undefined && (
            <Box hasRadius background="neutral0" shadow="tableShadow" padding={4}>
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
              <Textarea
                value={serialized}
                readOnly
                aria-label={formatMessage({
                  id: 'Settings.debug-dump.preview-label',
                  defaultMessage: 'Debug dump preview',
                })}
                rows={20}
              />
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

import { useClipboard, useNotification } from '@strapi/admin/strapi-admin';
import { Box, Typography, Tabs, IconButton, Flex, Tooltip } from '@strapi/design-system';
import { Duplicate } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTrad } from '../utils/getTrad';

const CopyCommandButton = ({ command }: { command: string }) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { copy } = useClipboard();

  const copyLabel = formatMessage({
    id: getTrad('Homepage.deploy.cli.copy'),
    defaultMessage: 'Copy',
  });

  const handleCopy = async () => {
    const didCopy = await copy(command);

    if (didCopy) {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTrad('Homepage.deploy.cli.copySuccess'),
          defaultMessage: 'Command copied to clipboard',
        }),
      });
    }
  };

  return (
    <Tooltip label={copyLabel}>
      <IconButton size="XS" variant="ghost" label={copyLabel} onClick={handleCopy}>
        <Duplicate />
      </IconButton>
    </Tooltip>
  );
};

const commands: Record<'yarn' | 'npm', { link: string; deploy: string }> = {
  yarn: {
    link: 'yarn strapi link',
    deploy: 'yarn strapi deploy',
  },
  npm: {
    link: 'npm run strapi link',
    deploy: 'npm run strapi deploy',
  },
};

const CLIDeployTabs = () => {
  const { formatMessage } = useIntl();

  return (
    <Box minWidth="28em" maxWidth="28em" paddingTop={8}>
      <Tabs.Root defaultValue="yarn">
        <Tabs.List
          aria-label={formatMessage({
            id: getTrad('Homepage.deploy.cli.ariaLabel'),
            defaultMessage: 'Package manager',
          })}
        >
          <Tabs.Trigger value="yarn">
            <Typography variant="omega">Yarn</Typography>
          </Tabs.Trigger>
          <Tabs.Trigger value="npm">
            <Typography variant="omega">NPM</Typography>
          </Tabs.Trigger>
        </Tabs.List>

        {(['yarn', 'npm'] as const).map((packageManager) => (
          <Tabs.Content key={packageManager} value={packageManager}>
            <Box background="neutral100">
              <Box padding={4}>
                <Flex direction="column" gap={4}>
                  <Flex direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                    <Typography tag="code" textColor="neutral800">
                      {commands[packageManager].link}
                    </Typography>
                    <CopyCommandButton command={commands[packageManager].link} />
                  </Flex>
                  <Flex direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                    <Typography tag="code" textColor="neutral800">
                      {commands[packageManager].deploy}
                    </Typography>
                    <CopyCommandButton command={commands[packageManager].deploy} />
                  </Flex>
                </Flex>
              </Box>
            </Box>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </Box>
  );
};

export { CLIDeployTabs };

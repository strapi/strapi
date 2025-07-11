import { useClipboard } from '@strapi/admin/strapi-admin';
import { Box, Typography, Tabs, IconButton, Flex, Tooltip } from '@strapi/design-system';
import { Duplicate } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTrad } from '../utils/getTrad';

const CopyCommandButton = ({ command }: { command: string }) => {
  const { formatMessage } = useIntl();

  const { copy } = useClipboard();

  const copyLabel = formatMessage({
    id: getTrad('Homepage.deploy.cli.copy'),
    defaultMessage: 'Copy',
  });

  const handleCopy = async () => await copy(command);

  return (
    <Tooltip label={copyLabel}>
      <IconButton size="XS" variant="ghost" label={copyLabel} onClick={handleCopy}>
        <Duplicate />
      </IconButton>
    </Tooltip>
  );
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

        <Tabs.Content value="yarn">
          <Box background="neutral100">
            <Box padding={4}>
              <Flex direction="row" justifyContent="space-between" alignItems="center">
                <Typography tag="code" textColor="neutral800">
                  yarn strapi deploy
                </Typography>
                <CopyCommandButton command="yarn strapi deploy" />
              </Flex>
            </Box>
          </Box>
        </Tabs.Content>
        <Tabs.Content value="npm">
          <Box background="neutral100">
            <Box padding={4}>
              <Flex direction="row" justifyContent="space-between" alignItems="center">
                <Typography tag="code" textColor="neutral800">
                  npm run deploy
                </Typography>
                <CopyCommandButton command="npm run deploy" />
              </Flex>
            </Box>
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
};

export { CLIDeployTabs };

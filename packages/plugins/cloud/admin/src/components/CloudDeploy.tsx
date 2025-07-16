/*
 *
 * Cloud component
 *
 */

import {
  Box,
  Flex,
  Typography,
  Link,
  LinkButton,
  Tabs,
  Badge,
  BaseLink,
} from '@strapi/design-system';
import { ExternalLink, CloudUpload, Code } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { CLIDeployTabs } from '../components/CLIDeployTabs';
import { getTrad } from '../utils/getTrad';

const CloudDeploy = () => {
  const { formatMessage } = useIntl();

  const documentationLink = formatMessage({
    id: getTrad('Homepage.deploy.documentation'),
    defaultMessage: 'Having trouble? Check our documentation',
  });

  return (
    <Box paddingBottom={5}>
      <Flex direction="column">
        <Typography variant="delta" paddingBottom={5} paddingTop={2}>
          {formatMessage({
            id: getTrad('Homepage.deploy.title'),
            defaultMessage: 'Choose your preferred deployment method',
          })}
        </Typography>
      </Flex>

      <Tabs.Root defaultValue="cloud" variant="simple">
        <Flex direction="column">
          <Tabs.List
            aria-label={formatMessage({
              id: getTrad('Homepage.deploy.ariaLabel'),
              defaultMessage: 'Deployment options',
            })}
          >
            <Tabs.Trigger value="cloud">
              <Box minWidth={{ initial: '10em', medium: '20em' }}>
                <Flex direction="row" gap={2} justifyContent="center">
                  <Typography variant="omega">Cloud</Typography>
                  <Badge active>
                    {formatMessage({
                      id: getTrad('Homepage.deploy.git.badge'),
                      defaultMessage: 'Recommended',
                    })}
                  </Badge>
                </Flex>
              </Box>
            </Tabs.Trigger>

            <Tabs.Trigger value="cli">
              <Box minWidth={{ initial: '10em', medium: '20em' }}>
                <Flex justifyContent="center">
                  <Typography variant="omega">CLI</Typography>
                </Flex>
              </Box>
            </Tabs.Trigger>
          </Tabs.List>
        </Flex>

        <Box>
          <Tabs.Content value="cloud">
            <Flex direction="column" paddingTop={6}>
              <Box>
                <BaseLink
                  isExternal
                  href="https://cloud.strapi.io/login?utm_campaign=Strapi%20Cloud%20Plugin&utm_source=In-Product&utm_medium=CTA"
                >
                  <CloudUpload height={40} width={40} fill="buttonPrimary600" />
                </BaseLink>
              </Box>
              <Box paddingBottom={2} paddingTop={5}>
                <Typography variant="delta" textColor="neutral1000">
                  {formatMessage({
                    id: getTrad('Homepage.deploy.git.title'),
                    defaultMessage: 'Deploy to Strapi Cloud',
                  })}
                </Typography>
              </Box>
              <Typography variant="omega" textColor="neutral600">
                {formatMessage({
                  id: getTrad('Homepage.deploy.git.subTitle'),
                  defaultMessage: 'Deploy a GitHub or GitLab project directly within Strapi Cloud',
                })}
              </Typography>
              <Box paddingTop={8}>
                <LinkButton
                  variant="default"
                  endIcon={<ExternalLink fill="neutral0" />}
                  href="https://cloud.strapi.io/login?utm_campaign=Strapi%20Cloud%20Plugin&utm_source=In-Product&utm_medium=CTA"
                  isExternal
                  size="M"
                >
                  {formatMessage({
                    id: getTrad('Homepage.deploy.git.button'),
                    defaultMessage: 'Deploy to Strapi Cloud',
                  })}
                </LinkButton>
              </Box>
              <Box paddingTop={5}>
                <Link isExternal href="https://docs.strapi.io/cloud/getting-started/deployment">
                  {documentationLink}
                </Link>
              </Box>
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="cli">
            <Flex direction="column" paddingTop={6}>
              <Code height={40} width={40} fill="buttonPrimary600" />
              <Box paddingBottom={2} paddingTop={5}>
                <Typography variant="delta" textColor="neutral1000">
                  {formatMessage({
                    id: getTrad('Homepage.deploy.cli.title'),
                    defaultMessage: 'Deploy via CLI',
                  })}
                </Typography>
              </Box>
              <Typography variant="omega" textColor="neutral600">
                {formatMessage({
                  id: getTrad('Homepage.deploy.cli.subTitle'),
                  defaultMessage: 'Use the command line to deploy your Strapi project directly',
                })}
              </Typography>

              <CLIDeployTabs />

              <Box paddingTop={5}>
                <Link isExternal href="https://docs.strapi.io/cloud/getting-started/deployment-cli">
                  {documentationLink}
                </Link>
              </Box>
            </Flex>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Box>
  );
};

export { CloudDeploy };

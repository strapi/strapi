/*
 *
 * HomePage
 *
 */

import { Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { CloudDeploy } from '../components/CloudDeploy';
import { CloudFree } from '../components/CloudFree';
import { getTrad } from '../utils/getTrad';

export const HomePage = () => {
  const { formatMessage } = useIntl();

  return (
    <Box paddingLeft={6} paddingRight={6} paddingTop={5} paddingBottom={3} background="neutral100">
      <Flex direction="column" gap={2}>
        <Typography variant="alpha">
          {formatMessage({
            id: getTrad('Homepage.title'),
            defaultMessage: 'Deploy with Strapi Cloud for Free!',
          })}
        </Typography>

        <Flex direction={{ initial: 'row', medium: 'column' }}>
          <Typography variant="epsilon" textColor="neutral600">
            {formatMessage({
              id: getTrad('Homepage.subTitle'),
              defaultMessage:
                'Start with our completely free plan - no credit card required, no time limits.',
            })}
          </Typography>
        </Flex>
      </Flex>

      <Box padding={8}>
        <CloudFree />
        <Box paddingTop={8}>
          <Box padding={6} background="neutral0" shadow="tableShadow">
            <CloudDeploy />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

/*
 *
 * Cloud component
 *
 */

import { Box, Flex, Typography, LinkButton } from '@strapi/design-system';
import { ExternalLink } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTrad } from '../utils/getTrad';

import { UploadIcon } from './Icons/UploadIcon';

const EmptyStateIconWrapper = styled(Box)`
  svg {
    height: 8.8rem;
  }
`;

const CloudBox = () => {
  const { formatMessage } = useIntl();

  return (
    <Box padding={4} hasRadius>
      <Flex alignItems="center" direction="column" padding={11} hasRadius>
        <EmptyStateIconWrapper paddingBottom={6} aria-hidden>
          <UploadIcon />
        </EmptyStateIconWrapper>
        <Box paddingBottom={4}>
          <Typography variant="beta" tag="p" textAlign="center" textColor="neutral1000">
            {formatMessage({
              id: getTrad('Homepage.cloudBox.title'),
              defaultMessage: 'Deploy to Strapi Cloud',
            })}
          </Typography>
        </Box>
        <Typography variant="epsilon" tag="p" textAlign="center" textColor="neutral600">
          {formatMessage({
            id: getTrad('Homepage.cloudBox.subTitle'),
            defaultMessage:
              'Enjoy a Strapi-optimized stack including database, email provider, and CDN.',
          })}
        </Typography>
        <Box marginTop={4}>
          <LinkButton
            variant="default"
            endIcon={<ExternalLink />}
            href="https://cloud.strapi.io/login?utm_campaign=Strapi%20Cloud%20Plugin&utm_source=In-Product&utm_medium=CTA"
            isExternal
            target="_blank"
          >
            {formatMessage({
              id: getTrad('Homepage.cloudBox.buttonText'),
              defaultMessage: 'Deploy to Strapi Cloud',
            })}
          </LinkButton>
        </Box>
      </Flex>
    </Box>
  );
};

export { CloudBox };

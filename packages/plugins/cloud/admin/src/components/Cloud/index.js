/*
 *
 * Github component
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';

import styled from 'styled-components';

import { ExternalLink } from '@strapi/icons';
import { Box, Flex, Typography } from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';

import { UploadIcon } from '../Icons/upload';

import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';

const EmptyStateIconWrapper = styled(Box)`
  svg {
    height: ${88 / 16}rem;
  }
`;

const CloudBox = () => {
  const { formatMessage } = useIntl();

  return (
    <Box padding={4} hasRadius key={`box-github}`}>
      <Flex alignItems="center" direction="column" padding={11} hasRadius={true}>
        <EmptyStateIconWrapper paddingBottom={6} aria-hidden>
          <UploadIcon />
        </EmptyStateIconWrapper>
        <Box paddingBottom={4}>
          <Typography variant="beta" as="p" textAlign="center" textColor="neutral1000">
            {formatMessage({
              id: getTrad('Homepage.cloudBox.title'),
              defaultMessage: 'Deploy to Strapi Cloud',
            })}
          </Typography>
        </Box>
        <Typography variant="epsilon" as="p" textAlign="center" textColor="neutral600">
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
            href="https://cloud.strapi.io/login?utm_source=Strapi+Cloud+Plugin"
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

export default CloudBox;

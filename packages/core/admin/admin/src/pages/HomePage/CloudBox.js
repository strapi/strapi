import React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { pxToRem, useTracking } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import cloudIconBackgroundImage from './assets/strapi-cloud-background.png';
import cloudFlagsImage from './assets/strapi-cloud-flags.svg';
import cloudIcon from './assets/strapi-cloud-icon.svg';

const BlockLink = styled.a`
  text-decoration: none;
`;

const CloudCustomWrapper = styled(Box)`
  background-image: url(${({ backgroundImage }) => backgroundImage});
`;

const CloudIconWrapper = styled(Flex)`
  background: rgba(255, 255, 255, 0.3);
`;

const CloudBox = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  return (
    <BlockLink
      href="https://cloud.strapi.io"
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={() => {
        trackUsage('didClickOnTryStrapiCloudSection');
      }}
    >
      <Flex
        shadow="tableShadow"
        hasRadius
        padding={6}
        background="neutral0"
        position="relative"
        gap={6}
      >
        <CloudCustomWrapper backgroundImage={cloudIconBackgroundImage} hasRadius padding={3}>
          <CloudIconWrapper
            width={pxToRem(32)}
            height={pxToRem(32)}
            justifyContent="center"
            hasRadius
            alignItems="center"
          >
            <img
              src={cloudIcon}
              alt={formatMessage({
                id: 'app.components.BlockLink.cloud',
                defaultMessage: 'Strapi Cloud',
              })}
            />
          </CloudIconWrapper>
        </CloudCustomWrapper>
        <Flex gap={1} direction="column" alignItems="start">
          <Flex>
            <Typography fontWeight="semiBold" variant="pi">
              {formatMessage({
                id: 'app.components.BlockLink.cloud',
                defaultMessage: 'Strapi Cloud',
              })}
            </Typography>
          </Flex>
          <Typography textColor="neutral600">
            {formatMessage({
              id: 'app.components.BlockLink.cloud.content',
              defaultMessage:
                'A fully composable, and collaborative platform to boost your team velocity.',
            })}
          </Typography>
          <Box src={cloudFlagsImage} position="absolute" top={0} right={0} as="img" />
        </Flex>
      </Flex>
    </BlockLink>
  );
};

export default CloudBox;

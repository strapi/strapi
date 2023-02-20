import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { useTracking } from '@strapi/helper-plugin';
import { Box, Flex, Stack, Typography } from '@strapi/design-system';
import cloudIconBackground from './assets/strapi-cloud-background.png';
import cloudIcon from './assets/strapi-cloud-icon.svg';
import cloudFlags from './assets/strapi-cloud-flags.svg';

const BlockLink = styled.a`
  text-decoration: none;
`;

const CloudCustomWrapper = styled.div`
  width: 56px;
  height: 56px;
  background-image: url(${({ src }) => src});
  padding: 11px;
  margin-right: ${({ theme }) => theme.spaces[6]};
`;

const CloudIconWrapper = styled.div`
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
`;

const CloudFlags = styled.img`
  position: absolute;
  top: 0;
  right: 0;
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
      <Flex shadow="tableShadow" hasRadius padding={6} background="neutral0" position="relative">
        <CloudCustomWrapper src={cloudIconBackground}>
          <CloudIconWrapper>
            <img src={cloudIcon} alt="Strapi Cloud" />
          </CloudIconWrapper>
        </CloudCustomWrapper>
        <Stack spacing={1}>
          <Flex>
            <Typography fontWeight="semiBold" variant="pi">
              {formatMessage({
                id: 'app.components.BlockLink.cloud',
                defaultMessage: 'Strapi Cloud',
              })}
            </Typography>
          </Flex>
          <Box width="80%">
            <Typography textColor="neutral600">
              {formatMessage({
                id: 'app.components.BlockLink.cloud.content',
                defaultMessage:
                  'A fully composable, and collaborative platform to boost your team velocity',
              })}
            </Typography>
          </Box>
          <CloudFlags src={cloudFlags} />
        </Stack>
      </Flex>
    </BlockLink>
  );
};

export default CloudBox;

/*
 *
 * HomePage
 *
 */

import { Box, GridLayout, Flex, Typography, Link } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { CloudBox } from '../components/Cloud';
import { GithubBox } from '../components/Github';
import { getTrad } from '../utils/getTrad';

import cornerOrnamentPath from './assets/corner-ornament.svg';
import leftSideCloudPath from './assets/left-side-cloud.png';
import rightSideCloudPath from './assets/right-side-cloud.png';

const LogoContainer = styled(Box)`
  position: absolute;
  top: 0;
  right: 0;

  img {
    width: ${150 / 16}rem;
  }
`;

const RightSideCloudContainer = styled(Box)`
  position: absolute;
  top: 400px;
  right: 0;

  img {
    width: ${150 / 16}rem;
  }
`;

const LeftSideCloudContainer = styled(Box)`
  position: absolute;
  top: 150px;
  left: 220px;

  img {
    width: ${150 / 16}rem;
  }
`;

const HomePage = () => {
  const { formatMessage } = useIntl();

  return (
    <Box paddingLeft={10} paddingRight={10}>
      <RightSideCloudContainer>
        <img alt="right-side-cloud" aria-hidden src={rightSideCloudPath} />
      </RightSideCloudContainer>
      <LeftSideCloudContainer>
        <img alt="left-side-cloud" aria-hidden src={leftSideCloudPath} />
      </LeftSideCloudContainer>
      <LogoContainer>
        <img alt="strapi-corner-ornament" aria-hidden src={cornerOrnamentPath} />
      </LogoContainer>

      <Box paddingLeft={10} paddingRight={10} paddingBottom={8} paddingTop={10}>
        <Flex justifyContent="space-between" alignItems="center" direction="column">
          <Flex minWidth={0}>
            <Typography as="h1" variant="alpha">
              {formatMessage({
                id: getTrad('Homepage.title'),
                defaultMessage: 'Fully-managed Cloud Hosting for your Strapi Project',
              })}
            </Typography>
          </Flex>
        </Flex>
        <Flex alignItems="center" direction="column">
          <Typography variant="epsilon" textColor="neutral600" as="p">
            {formatMessage({
              id: getTrad('Homepage.subTitle'),
              defaultMessage:
                'Follow this 2 steps process to get Everything You Need to Run Strapi in Production.',
            })}
          </Typography>
        </Flex>
      </Box>
      <Box padding={10}>
        <GridLayout>
          <GithubBox />
          <CloudBox />
        </GridLayout>
        <Box padding={6} borderRadius={8} hasRadius background="neutral0" borderColor="neutral200">
          <Box paddingBottom={2}>
            <Typography variant="delta" fontWeight="bold" textColor="neutral1000" as="p">
              {formatMessage({
                id: getTrad('Homepage.textBox.label.versioned'),
                defaultMessage: 'Try Strapi Cloud for Free!',
              })}
            </Typography>
          </Box>

          <Typography variant="epsilon" textColor="neutral1000" as="p">
            {formatMessage({
              id: getTrad('Homepage.textBox.text.versioned'),
              defaultMessage:
                'Strapi Cloud offers a 14 days free trial for you to experiment with your project on the cloud including all features.',
            })}{' '}
            <Link href="https://strapi.io/cloud?utm_campaign=Strapi%20Cloud%20Plugin&utm_source=In-Product&utm_medium=CTA">
              Learn more
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export { HomePage };

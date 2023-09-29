/*
 *
 * HomePage
 *
 */

import React, { useState, useEffect } from 'react';
// import PropTypes from 'prop-types';

import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import { verifyIfProjectIsVersionOnGit } from '../../utils/api';

import { Box, GridLayout, Flex, Typography, Link } from '@strapi/design-system';

import styled from 'styled-components';

import GithubBox from '../../components/Github';
import CloudBox from '../../components/Cloud';

import cornerOrnamentPath from './assets/corner-ornament.svg';
import rightSideCloudPath from './assets/right-side-cloud.png';
import leftSideCloudPath from './assets/left-side-cloud.png';

import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';

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

  const [isLoading, setIsLoading] = useState(true);
  const [isVersionedOnGit, setIsVersionedOnGit] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await verifyIfProjectIsVersionOnGit();
        setIsVersionedOnGit(res || false);
      } catch (error) {
        console.log(error);
      }
    };
    fetchData().then(() => {
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Box paddingLeft={10} paddingRight={10}>
      <RightSideCloudContainer>
        <img alt="" aria-hidden src={rightSideCloudPath} />
      </RightSideCloudContainer>
      <LeftSideCloudContainer>
        <img alt="" aria-hidden src={leftSideCloudPath} />
      </LeftSideCloudContainer>
      <LogoContainer>
        <img alt="" aria-hidden src={cornerOrnamentPath} />
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
          <GithubBox isVersionedOnGit={isVersionedOnGit} />
          <CloudBox />
        </GridLayout>
        <Box
          padding={6}
          borderRadius={8}
          hasRadius
          background="neutral0"
          borderColor="neutral200"
        >
          <Box paddingBottom={2}>
            <Typography variant="delta" fontWeight="bold" textColor="neutral1000" as="p">
              {isVersionedOnGit
                ? formatMessage({
                    id: getTrad('Homepage.textBox.label.versioned'),
                    defaultMessage: 'Try Strapi Cloud for Free!',
                  })
                : formatMessage({
                    id: getTrad('Homepage.textBox.label.not-versioned'),
                    defaultMessage: 'Why uploading my project to GitHub?',
                  })}
            </Typography>
          </Box>

          <Typography variant="epsilon" textColor="neutral1000" as="p">
            {isVersionedOnGit ? (
              <>
                {formatMessage({
                  id: getTrad('Homepage.textBox.text.versioned'),
                  defaultMessage:
                    'Strapi Cloud offers a 14 days free trial for you to experiment with your project on the cloud including all features.',
                })}{' '}
                <Link href="https://strapi.io/cloud" isExternal>
                  Learn more
                </Link>
              </>
            ) : (
              formatMessage({
                id: getTrad('Homepage.textBox.text.not-versioned'),
                defaultMessage:
                  'Strapi Cloud will fetch and deploy your project from your GitHub repository. This is the best way to version, manage and deploy your project. Follow the steps on GitHub to successfully upload it.',
              })
            )}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;

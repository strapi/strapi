import * as React from 'react';

import { Box, Flex, Grid, Main, Typography, BoxComponent } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { Layouts } from '../components/Layouts/Layout';
import { Page } from '../components/PageHelpers';
import { useContentTypes } from '../hooks/useContentTypes';
import { useEnterprise } from '../hooks/useEnterprise';

import cornerOrnamentPath from './assets/corner-ornament.svg';
/* -------------------------------------------------------------------------------------------------
 * HomePageCE
 * -----------------------------------------------------------------------------------------------*/

const HomePageCE = () => {
  const { formatMessage } = useIntl();
  // Temporary until we develop the menu API
  const { isLoading: isLoadingForModels } = useContentTypes();

  if (isLoadingForModels) {
    console.log({ isLoadingForModels });
    return <Page.Loading />;
  }

  return (
    <Layouts.Root>
      <Page.Title>
        {formatMessage({
          id: 'HomePage.head.title',
          defaultMessage: 'Homepage',
        })}
      </Page.Title>
      <Main>
        <LogoContainer>
          <img alt="" aria-hidden src={cornerOrnamentPath} />
        </LogoContainer>
        <Box padding={10}>
          <Grid.Root>
            <Grid.Item col={8} s={12} direction="column" alignItems="stretch">
              <div>
                <Box paddingLeft={6} paddingBottom={10}>
                  <Flex direction="column" alignItems="flex-start" gap={5}>
                    <Typography tag="h1" variant="alpha">
                      {formatMessage({
                        id: 'app.components.HomePage.welcome.again',
                        defaultMessage: 'Welcome 👋',
                      })}
                    </Typography>
                  </Flex>
                </Box>
              </div>
            </Grid.Item>
          </Grid.Root>
        </Box>
      </Main>
    </Layouts.Root>
  );
};

const LogoContainer = styled<BoxComponent>(Box)`
  position: absolute;
  top: 0;
  right: 0;

  img {
    width: 15rem;
  }
`;

/* -------------------------------------------------------------------------------------------------
 * HomePage
 * -----------------------------------------------------------------------------------------------*/

const HomePage = () => {
  return <HomePageCE />;
};

export { HomePage, HomePageCE };

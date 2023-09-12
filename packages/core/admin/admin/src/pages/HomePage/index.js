/*
 * HomePage
 *
 */

import React, { useMemo } from 'react';

import { Box, Grid, GridItem, Layout, Main } from '@strapi/design-system';
import { LoadingIndicatorPage, useGuidedTour } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { FormattedMessage } from 'react-intl';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

import GuidedTourHomepage from '../../components/GuidedTour/Homepage';
import isGuidedTourCompleted from '../../components/GuidedTour/utils/isGuidedTourCompleted';
import { useContentTypes } from '../../hooks/useContentTypes';
import { useEnterprise } from '../../hooks/useEnterprise';

import cornerOrnamentPath from './assets/corner-ornament.svg';
import ContentBlocks from './ContentBlocks';
import HomeHeader from './HomeHeader';
import SocialLinks from './SocialLinks';

const LogoContainer = styled(Box)`
  position: absolute;
  top: 0;
  right: 0;

  img {
    width: ${150 / 16}rem;
  }
`;

export const HomePageCE = () => {
  // Temporary until we develop the menu API
  const { collectionTypes, singleTypes, isLoading: isLoadingForModels } = useContentTypes();
  const { guidedTourState, isGuidedTourVisible, isSkipped } = useGuidedTour();
  const showGuidedTour =
    !isGuidedTourCompleted(guidedTourState) && isGuidedTourVisible && !isSkipped;
  const { push } = useHistory();
  const handleClick = (e) => {
    e.preventDefault();

    push('/plugins/content-type-builder/content-types/create-content-type');
  };

  const hasAlreadyCreatedContentTypes = useMemo(() => {
    const filterContentTypes = (contentTypes) => contentTypes.filter((c) => c.isDisplayed);

    return (
      filterContentTypes(collectionTypes).length > 1 || filterContentTypes(singleTypes).length > 0
    );
  }, [collectionTypes, singleTypes]);

  if (isLoadingForModels) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Layout>
      <FormattedMessage id="HomePage.helmet.title" defaultMessage="Homepage">
        {(title) => <Helmet title={title[0]} />}
      </FormattedMessage>
      <Main>
        <LogoContainer>
          <img alt="" aria-hidden src={cornerOrnamentPath} />
        </LogoContainer>
        <Box padding={10}>
          <Grid>
            <GridItem col={8} s={12}>
              <HomeHeader
                onCreateCT={handleClick}
                hasCreatedContentType={hasAlreadyCreatedContentTypes}
              />
            </GridItem>
          </Grid>
          <Grid gap={6}>
            <GridItem col={8} s={12}>
              {showGuidedTour ? <GuidedTourHomepage /> : <ContentBlocks />}
            </GridItem>
            <GridItem col={4} s={12}>
              <SocialLinks />
            </GridItem>
          </Grid>
        </Box>
      </Main>
    </Layout>
  );
};

function HomePageSwitch() {
  const HomePage = useEnterprise(
    HomePageCE,
    // eslint-disable-next-line import/no-cycle
    async () => (await import('../../../../ee/admin/pages/HomePage')).HomePageEE
  );

  // block rendering until the EE component is fully loaded
  if (!HomePage) {
    return null;
  }

  return <HomePage />;
}

export default HomePageSwitch;

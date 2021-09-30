/*
 * HomePage
 *
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import styled from 'styled-components';
import { Helmet } from 'react-helmet';
import { useHistory } from 'react-router-dom';
import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Layout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import { Box } from '@strapi/parts/Box';
import { Grid, GridItem } from '@strapi/parts/Grid';
import Logo from '../../assets/images/homepage-logo.png';
import { useModels } from '../../hooks';
import SocialLinks from './SocialLinks';
import HomeHeader from './HomeHeader';
import ContentBlocks from './ContentBlocks';

const LogoContainer = styled(Box)`
  position: absolute;
  top: 0;
  right: 0;
  img {
    width: ${150 / 16}rem;
  }
`;

const HomePage = () => {
  // // Temporary until we develop the menu API
  const { collectionTypes, singleTypes, isLoading: isLoadingForModels } = useModels();

  const { push } = useHistory();
  const handleClick = e => {
    e.preventDefault();

    push(
      '/plugins/content-type-builder/content-types/plugins::users-permissions.user?modalType=contentType&kind=collectionType&actionType=create&settingType=base&forTarget=contentType&headerId=content-type-builder.modalForm.contentType.header-create&header_icon_isCustom_1=false&header_icon_name_1=contentType&header_label_1=null'
    );
  };

  const hasAlreadyCreatedContentTypes = useMemo(() => {
    const filterContentTypes = contentTypes => contentTypes.filter(c => c.isDisplayed);

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
        {title => <Helmet title={title[0]} />}
      </FormattedMessage>
      <Main>
        <LogoContainer>
          <img alt="" aria-hidden src={Logo} />
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
              <ContentBlocks />
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

export default memo(HomePage);

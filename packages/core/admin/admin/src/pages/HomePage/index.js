/*
 *
 * HomePage
 *
 */
/* eslint-disable */
import React, { memo, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useModels } from '../../hooks';

import SocialLinks from './SocialLinks';
import HomeHeader from './HomeHeader';
import ContentBlocks from './ContentBlocks';
import PageTitle from '../../components/PageTitle';
import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Layout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import { Box } from '@strapi/parts/Box';
import { Grid, GridItem } from '@strapi/parts/Grid';

const HomePage = ({ history: { push } }) => {
  // const { formatMessage } = useIntl();
  // const { error, isLoading, posts } = useFetch();
  // // Temporary until we develop the menu API
  const { collectionTypes, singleTypes, isLoading: isLoadingForModels } = useModels();

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
      <FormattedMessage id="HomePage.helmet.title">
        {title => <PageTitle title={title[0]} />}
      </FormattedMessage>
      <Main labelledBy="homepage">
        <Box padding={10}>
          <Grid>
            <GridItem col={8} s={12}>
              <HomeHeader
                onCreateCT={handleClick}
                id="homepage"
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

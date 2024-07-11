import * as React from 'react';

import { Layouts, Page } from '@strapi/admin/strapi-admin';
import { Flex, LinkButton, Main } from '@strapi/design-system';
import { CodeSquare, PlaySquare, GlassesSquare } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { ContentBox } from '../components/ContentBox';
import { getTranslation } from '../utils/getTranslation';

const Home = () => {
  const { formatMessage } = useIntl();

  // TODO: hook to api calls
  const isLoading = false;
  const isError = false;
  const dashboardUrl = 'https://cloud.strapi.io';

  if (isLoading) {
    return <Page.Loading />;
  }

  if (isError) {
    return <Page.Error />;
  }

  return (
    <Main aria-busy={isLoading}>
      <Layouts.Header
        title={formatMessage({
          id: getTranslation('pages.home.title'),
          defaultMessage: 'Strapi Cloud',
        })}
        subtitle={formatMessage({
          id: getTranslation('pages.home.subtitle'),
          defaultMessage: 'Manage your app deployments',
        })}
        primaryAction={
          <LinkButton tag={NavLink} to={dashboardUrl}>
            {formatMessage({ id: getTranslation('pages.home.open-dashboard') })}
          </LinkButton>
        }
      />
      <Layouts.Content>
        <>
          <Flex
            width="70%"
            // marginLeft="auto"
            marginRight="auto"
            gap={6}
            direction="column"
            alignItems="stretch"
          >
            <ContentBox
              title={formatMessage({
                id: getTranslation('pages.home.features.tools-title'),
                defaultMessage: 'Get Everything You Need to Run Strapi in Production',
              })}
              subtitle={formatMessage({
                id: getTranslation('pages.home.features.tools-description'),
                defaultMessage:
                  'Get a database, email provider, and CDN without having to manage it all yourself.',
              })}
              icon={<CodeSquare />}
              iconBackground="warning100"
            />
            <ContentBox
              title={formatMessage({
                id: getTranslation('pages.home.features.deploy-title'),
                defaultMessage: 'Deploy Strapi to Production in Just a Few Clicks',
              })}
              subtitle={formatMessage({
                id: getTranslation('pages.home.features.deploy-description'),
                defaultMessage:
                  'Connect your repository, choose your region, and get started with generous usage limits.',
              })}
              icon={<PlaySquare />}
              iconBackground="secondary100"
            />
            <ContentBox
              title={formatMessage({
                id: getTranslation('pages.home.features.control-title'),
                defaultMessage: 'Remain in Complete Control',
              })}
              subtitle={formatMessage({
                id: getTranslation('pages.home.features.control-description'),
                defaultMessage:
                  'No lock-in. You remain in control of your stack and the tools you use',
              })}
              icon={<GlassesSquare />}
              iconBackground="alternative100"
            />
          </Flex>
        </>
      </Layouts.Content>
    </Main>
  );
};

export { Home };

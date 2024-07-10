import * as React from 'react';

import { Layouts, Page } from '@strapi/admin/strapi-admin';
import { LinkButton, Main, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

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
          <Typography>Content</Typography>
        </>
      </Layouts.Content>
    </Main>
  );
};

export { Home };

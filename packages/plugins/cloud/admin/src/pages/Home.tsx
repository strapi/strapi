import * as React from 'react';

import { Layouts, Page } from '@strapi/admin/strapi-admin';
import { Button, Flex, Main } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { MarketingPresentation } from '../components/MarketingPresentation';
import { ProjectPreview } from '../components/ProjectPreview';
import { useGetCloudUserQuery, useGetCloudProjectsQuery } from '../services/cloud';
import { getTranslation } from '../utils/getTranslation';

const Home = () => {
  const { formatMessage } = useIntl();

  const { isLoading: isLoadingUser, isError: isErrorUser, data: user } = useGetCloudUserQuery(null);
  const {
    isLoading: isLoadingProjects,
    isError: isErrorProjects,
    data: projects,
  } = useGetCloudProjectsQuery(null);

  const isLoading = isLoadingUser || isLoadingProjects;
  const isError = isErrorUser || isErrorProjects;

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
        primaryAction={<Button variant="secondary">{user == null ? 'Log in' : 'Log out'}</Button>}
      />
      <Layouts.Content>
        {user == null ? (
          <MarketingPresentation />
        ) : (
          <Flex direction="column" gap={2} alignItems="stretch">
            {projects?.data.map((project) => (
              <ProjectPreview key={project.name} project={project} />
            ))}
          </Flex>
        )}
      </Layouts.Content>
    </Main>
  );
};

export { Home };

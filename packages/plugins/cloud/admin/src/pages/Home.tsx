import * as React from 'react';

import { Layouts, Page } from '@strapi/admin/strapi-admin';
import { Button, Main } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { MarketingPresentation } from '../components/MarketingPresentation';
import { ProjectDetails } from '../components/ProjectDetails';
import {
  useGetCloudUserQuery,
  useGetCloudProjectsQuery,
  useGetCloudProjectQuery,
} from '../services/cloud';
import { getTranslation } from '../utils/getTranslation';

const Home = () => {
  const { formatMessage } = useIntl();
  const { isLoading: isLoadingUser, isError: isErrorUser, data: user } = useGetCloudUserQuery(null);
  const {
    isLoading: isLoadingProjects,
    isError: isErrorProjects,
    data: projects,
  } = useGetCloudProjectsQuery(null);

  const projectName = projects?.data.at(0)?.name;
  const {
    data: project,
    isLoading: isLoadingProject,
    isError: isErrorProject,
  } = useGetCloudProjectQuery(projectName!, { skip: projectName == null });

  const isLoading = isLoadingUser || isLoadingProjects || isLoadingProject;
  const isError = isErrorUser || isErrorProjects || isErrorProject;

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
        {project == null ? (
          <MarketingPresentation
            onStartTrial={() => {
              document.location.reload();
            }}
          />
        ) : (
          <ProjectDetails project={project.data} />
        )}
      </Layouts.Content>
    </Main>
  );
};

export { Home };

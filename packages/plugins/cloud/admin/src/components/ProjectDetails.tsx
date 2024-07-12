import * as React from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import { Button, Flex, LinkButton, Typography } from '@strapi/design-system';
import { Link } from 'react-router-dom';

import { useDeployProjectMutation, type ProjectDetails } from '../services/cloud';

const ProjectDetails = ({ project }: { project: ProjectDetails }) => {
  const [deploy, { isLoading, isSuccess, isError }] = useDeployProjectMutation();
  const { toggleNotification } = useNotification();

  React.useEffect(() => {
    // trigger ui notification
    if (isSuccess) {
      toggleNotification({ type: 'success', message: 'Triggered a new deployment' });
    }
    if (isError) {
      toggleNotification({ type: 'danger', message: 'Failed to trigger a new deployment' });
    }
  }, [isSuccess, isError, toggleNotification]);

  return (
    <Flex
      shadow="tableShadow"
      direction="column"
      alignItems="flex-start"
      padding={4}
      hasRadius
      background="neutral0"
      gap={4}
    >
      <header>
        <Typography variant="beta" tag="h2">
          {project.displayName}
        </Typography>
        <Typography variant="omega" textColor="success600" tag="p" marginTop={1}>
          <b>{project.stats.daysLeftInTrial} days</b> left in trial
        </Typography>
      </header>
      <Flex direction="row" gap={3}>
        <Button onClick={() => deploy(project.environments.production.internalName)}>
          {isLoading ? 'Deploying...' : 'Deploy'}
        </Button>
        <LinkButton
          variant="secondary"
          tag={Link}
          to={`https://cloud.strapi.io/projects/${project.name}`}
        >
          Open dashboard
        </LinkButton>
        <LinkButton variant="secondary" tag={Link} to={project.environments.production.url}>
          Open live app
        </LinkButton>
      </Flex>
    </Flex>
  );
};

export { ProjectDetails };

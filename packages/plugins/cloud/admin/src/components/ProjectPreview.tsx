import * as React from 'react';

import { Flex, LinkButton, Typography } from '@strapi/design-system';
import { Link } from 'react-router-dom';

import { Project } from '../services/cloud';

const ProjectPreview = ({ project }: { project: Project }) => {
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
        <LinkButton tag={Link} to={`https://cloud.strapi.io/projects/${project.name}`}>
          Open dashboard
        </LinkButton>
        <LinkButton variant="secondary" tag={Link} to={project.environments.production.url}>
          Open live app
        </LinkButton>
      </Flex>
    </Flex>
  );
};

export { ProjectPreview };

import { AppProject, PluginProject } from './project';

export const isPluginProject = (project: unknown): project is PluginProject => {
  return (
    project instanceof PluginProject &&
    'type' in project &&
    project.type === 'plugin' &&
    !('strapiVersion' in project)
  );
};

export const assertPluginProject: (project: unknown) => asserts project is PluginProject = (
  project
) => {
  if (!isPluginProject(project)) {
    throw new Error('Project must be an app');
  }
};

export const isAppProject = (project: unknown): project is AppProject => {
  return project instanceof AppProject && 'type' in project && project.type === 'app';
};

export const assertAppProject: (project: unknown) => asserts project is AppProject = (project) => {
  if (!isAppProject(project)) {
    throw new Error('Project must be an app');
  }
};

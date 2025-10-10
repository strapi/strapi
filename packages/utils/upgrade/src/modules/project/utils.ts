import { AppProject, PluginProject } from './project';

export const isPluginProject = (project: unknown): project is PluginProject => {
  return project instanceof PluginProject;
};

export function assertPluginProject(project: unknown): asserts project is PluginProject {
  if (!isPluginProject(project)) {
    throw new Error('Project is not a plugin');
  }
}

export const isApplicationProject = (project: unknown): project is AppProject => {
  return project instanceof AppProject;
};

export function assertAppProject(project: unknown): asserts project is AppProject {
  if (!isApplicationProject(project)) {
    throw new Error('Project is not an application');
  }
}

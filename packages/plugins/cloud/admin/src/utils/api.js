import pluginId from '../pluginId';
import { request } from '@strapi/helper-plugin';

const verifyIfProjectIsVersionOnGit = async () => {
  try {
    const data = await request(
      `/${pluginId}/verify-project-is-versioned-on-git`,
      { method: 'GET' }
    );
    return data;
  } catch (error) {
    return null;
  }
};

export { verifyIfProjectIsVersionOnGit };

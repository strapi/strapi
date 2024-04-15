import * as deployProject from './deploy-project';
import * as login from './login';
import * as logout from './logout';
import * as createProject from './create-project';

export const cli = {
  deployProject,
  login,
  logout,
  createProject,
};

export * as services from './services';

export * from './types';

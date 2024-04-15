import action from './action';
import command from './command';

export { action, command };

export default {
  name: 'deploy-project',
  description: 'Deploy a Strapi Cloud project',
  action,
  command,
};

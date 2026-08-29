import me from './me';
import meRole from './me-role';
import registerInput from './register-input';
import loginInput from './login-input';
import passwordPayload from './password-payload';
import loginPayload from './login-payload';
import createRolePayload from './create-role-payload';
import updateRolePayload from './update-role-payload';
import deleteRolePayload from './delete-role-payload';
import userInput from './user-input';

const typesFactories = [
  me,
  meRole,
  registerInput,
  loginInput,
  passwordPayload,
  loginPayload,
  createRolePayload,
  updateRolePayload,
  deleteRolePayload,
  userInput,
];

/**
 * @param {object} context
 * @param {object} context.nexus
 * @param {object} context.strapi
 * @return {any[]}
 */
export default (context) => typesFactories.map((factory) => factory(context));

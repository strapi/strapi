import crypto from 'node:crypto';
import type { Core } from '@strapi/types';
import type services from '../services';
import type controllers from '../controllers';
import sanitize from './sanitize';

type Services = { [Name in keyof typeof services]: ReturnType<(typeof services)[Name]> };
type Controllers = { [Name in keyof typeof controllers]: ReturnType<(typeof controllers)[Name]> };

/** Retrieve a users-permissions controller from the supplied Strapi instance. */
const getController = <Name extends keyof Controllers>(
  strapi: Core.Strapi,
  name: Name
): Controllers[Name] => strapi.plugin('users-permissions').controller(name) as Controllers[Name];

const MAX_USERNAME_ATTEMPTS = 10;

/** Retrieve a users-permissions service from the supplied Strapi instance. */
const getService = <Name extends keyof Services>(strapi: Core.Strapi, name: Name): Services[Name] =>
  strapi.plugin('users-permissions').service<Services[Name]>(name);

/** Check whether an account already uses this username. */
const isUsernameTaken = async (strapi: Core.Strapi, username: string) => {
  const user = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { username } });
  return Boolean(user);
};

/** Select an available username, retrying collisions before falling back to a UUID. */
const findValidUsername = async (strapi: Core.Strapi, basename: string) => {
  const attribute = strapi.getModel('plugin::users-permissions.user')?.attributes?.username;
  const minLength = attribute && 'minLength' in attribute ? (attribute.minLength ?? 3) : 3;
  const tryBasenameFirst = basename.length >= minLength;
  let attempt = 0;
  let candidate: string;
  let taken: boolean;
  do {
    candidate =
      attempt === 0 && tryBasenameFirst ? basename : `${basename}${crypto.randomInt(1000, 9999)}`;
    taken = await isUsernameTaken(strapi, candidate);
    attempt += 1;
  } while (taken && attempt <= MAX_USERNAME_ATTEMPTS);
  return taken ? crypto.randomUUID() : candidate;
};

export { getController, getService, isUsernameTaken, findValidUsername, sanitize };

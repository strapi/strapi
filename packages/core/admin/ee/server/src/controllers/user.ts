import _, { pick } from 'lodash';
import type { Context } from 'koa';
import type { Data } from '@strapi/types';

import { errors } from '@strapi/utils';
import { validateUserCreationInput } from '../validation/user';
import { validateUserUpdateInput } from '../../../../server/src/validation/user';
import { normalizeEmail } from '../../../../server/src/utils/normalize-email';
import { parseRouteId } from '../../../../server/src/utils/route-id';
import { getService } from '../utils';
import { isSsoLocked } from '../utils/sso-lock';

const { ApplicationError, ForbiddenError } = errors;

const pickUserCreationAttributes = <T extends object>(user: T) =>
  pick(user, ['firstname', 'lastname', 'email', 'roles']);

const hasAdminSeatsAvaialble = async () => {
  if (!strapi.EE) {
    return true;
  }

  const permittedSeats = strapi.ee.seats as any;
  if (permittedSeats == null) {
    return true;
  }

  const userCount = await strapi.service('admin::user').getCurrentActiveUserCount();

  if (userCount < permittedSeats) {
    return true;
  }
};

export default {
  async create(ctx: Context) {
    if (!(await hasAdminSeatsAvaialble())) {
      throw new ForbiddenError('Your license user limit is reached. You cannot create a new user.');
    }

    const { data: body, save } = await getService('form-extensions').internal_prepare('user', {
      body: ctx.request.body,
      user: ctx.state.user,
    });
    const cleanData = { ...body, email: _.get(body, `email`, ``).toLowerCase() };

    await validateUserCreationInput(cleanData);

    const attributes = pickUserCreationAttributes(cleanData);
    const { useSSORegistration } = cleanData;

    const userAlreadyExists = await getService('user').exists({ email: attributes.email });

    if (userAlreadyExists) {
      throw new ApplicationError('Email already taken');
    }

    if (useSSORegistration) {
      Object.assign(attributes, { registrationToken: null, isActive: true });
    }

    // Checked again after the plugin steps: another user may have taken the last seat meanwhile
    if (!(await hasAdminSeatsAvaialble())) {
      throw new ForbiddenError('License seat limit reached. You cannot create a new user');
    }

    const createdUser = await save(
      () => getService('user').create(attributes),
      (created: { id: Data.ID }) => getService('user').deleteById(created.id)
    );
    const userInfo = getService('user').sanitizeUser(createdUser);

    // Note: We need to assign manually the registrationToken to the
    // final user payload so that it's not removed in the sanitation process.
    Object.assign(userInfo, { registrationToken: createdUser.registrationToken });

    ctx.created({ data: userInfo });
  },

  async update(ctx: Context) {
    const id = parseRouteId(ctx.params.id);

    if (id === null || !(await getService('user').exists({ id }))) {
      return ctx.notFound('User does not exist');
    }

    const { data: body, save } = await getService('form-extensions').internal_prepare('user', {
      body: ctx.request.body,
      user: ctx.state.user,
      entityId: id,
    });
    const data = normalizeEmail(body);

    await validateUserUpdateInput(data);

    if (_.has(data, 'email')) {
      const uniqueEmailCheck = await getService('user').exists({
        id: { $ne: id },
        email: data.email,
      });

      if (uniqueEmailCheck) {
        throw new ApplicationError('A user with this email address already exists');
      }
    }

    // Read after the plugin steps: the user may have been deactivated meanwhile
    const user = await getService('user').findOne(id, null);

    if (user === null) {
      return ctx.notFound('User does not exist');
    }

    if (!(await hasAdminSeatsAvaialble()) && !user.isActive && data.isActive) {
      throw new ForbiddenError(
        'Your license user limit is reached. You cannot activate this user.'
      );
    }

    const updatedUser = await save(() => getService('user').updateById(id, data));

    if (!updatedUser) {
      return ctx.notFound('User does not exist');
    }

    ctx.body = {
      data: getService('user').sanitizeUser(updatedUser),
    };
  },

  async isSSOLocked(ctx: Context) {
    const { user } = ctx.state;
    const isSSOLocked = await isSsoLocked(user);

    ctx.body = {
      data: {
        isSSOLocked,
      },
    };
  },
};

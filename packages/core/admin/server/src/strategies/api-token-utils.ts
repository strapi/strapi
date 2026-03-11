import type { Context } from 'koa';
import { isNil } from 'lodash/fp';
import { differenceInHours, parseISO } from 'date-fns';
import { errors } from '@strapi/utils';

const { UnauthorizedError } = errors;

export const extractToken = (ctx: Context): string | null => {
  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    const parts = ctx.request.header.authorization.split(/\s+/);

    if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) {
      return null;
    }

    return parts[1];
  }

  return null;
};

export const checkExpiry = (apiToken: {
  expiresAt?: string | number | null;
}): InstanceType<typeof UnauthorizedError> | null => {
  if (!isNil(apiToken.expiresAt)) {
    const expirationDate = new Date(apiToken.expiresAt);
    if (expirationDate < new Date()) {
      return new UnauthorizedError('Token expired');
    }
  }

  return null;
};

export const updateLastUsedAt = async (apiToken: {
  id: number | string;
  lastUsedAt?: string | null;
}): Promise<void> => {
  const currentDate = new Date();

  if (!isNil(apiToken.lastUsedAt)) {
    const hoursSinceLastUsed = differenceInHours(currentDate, parseISO(apiToken.lastUsedAt));
    if (hoursSinceLastUsed >= 1) {
      await strapi.db.query('admin::api-token').update({
        where: { id: apiToken.id },
        data: { lastUsedAt: currentDate },
      });
    }
  } else {
    await strapi.db.query('admin::api-token').update({
      where: { id: apiToken.id },
      data: { lastUsedAt: currentDate },
    });
  }
};

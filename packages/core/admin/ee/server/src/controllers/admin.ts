import type { Context } from 'koa';
import { isNil } from 'lodash/fp';
import { env } from '@strapi/utils';
import { getService } from '../utils';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export default {
  // NOTE: Overrides CE admin controller
  async getProjectType() {
    const flags = strapi.config.get('admin.flags', {});
    const isAILicense = strapi.ee.features.isEnabled('cms-ai');
    const isAIConfigured = strapi.config.get('admin.ai', { enabled: isAILicense });

    try {
      return {
        data: {
          isEE: strapi.EE,
          isTrial: strapi.ee.isTrial,
          features: strapi.ee.features.list(),
          flags,
          type: strapi.ee.type,
          ai: {
            enabled: isAILicense && isAIConfigured.enabled,
          },
        },
      };
    } catch (err) {
      return { data: { isEE: false, features: [], flags, ai: { enabled: false } } };
    }
  },

  async licenseLimitInformation() {
    const permittedSeats = strapi.ee.seats;

    let shouldNotify = false;
    let licenseLimitStatus = null;
    let enforcementUserCount;

    const currentActiveUserCount = await getService('user').getCurrentActiveUserCount();

    const eeDisabledUsers = await getService('seat-enforcement').getDisabledUserList();

    if (eeDisabledUsers) {
      enforcementUserCount = currentActiveUserCount + eeDisabledUsers.length;
    } else {
      enforcementUserCount = currentActiveUserCount;
    }

    if (!isNil(permittedSeats) && enforcementUserCount > permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'OVER_LIMIT';
    }

    if (!isNil(permittedSeats) && enforcementUserCount === permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'AT_LIMIT';
    }

    const data = {
      enforcementUserCount,
      currentActiveUserCount,
      permittedSeats,
      shouldNotify,
      shouldStopCreate: isNil(permittedSeats) ? false : currentActiveUserCount >= permittedSeats,
      licenseLimitStatus,
      isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
      type: strapi.ee.type,
      isTrial: strapi.ee.isTrial,
      features: strapi.ee.features.list() ?? [],
    };

    return { data };
  },
};

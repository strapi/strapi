import { isNil } from 'lodash/fp';
import { env } from '@strapi/utils';
import { getService } from '../utils';

export default {
  // NOTE: Overrides CE admin controller
  async getProjectType() {
    const flags = strapi.config.get('admin.flags', {});
    try {
      return { data: { isEE: strapi.EE, features: strapi.ee.features.list(), flags } };
    } catch (err) {
      return { data: { isEE: false, features: [], flags } };
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
      features: strapi.ee.features.list() ?? [],
    };

    return { data };
  },
};

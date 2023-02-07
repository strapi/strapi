'use strict';

const { env } = require('@strapi/utils');

module.exports = {
  async licenseLimitInformation() {
    let shouldNotify = false;
    let licenseLimitStatus = null;
    let currentUserCount;
    const permittedSeats = strapi.ee.licenseInfo.seats;

    if (!permittedSeats) return;

    const currentActiveUserCount = await strapi.db
      .query('admin::user')
      .count({ where: { isActive: true } });

    const data = await strapi.db.query('strapi::ee-store').findOne({
      where: { key: 'ee_disabled_users' },
    });

    if (data.value) {
      const eeDisabledUsers = JSON.parse(data.value);
      currentUserCount = currentActiveUserCount + eeDisabledUsers.length;
    } else {
      currentUserCount = currentActiveUserCount;
    }

    if (currentUserCount > permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'OVER_LIMIT';
    }

    if (currentUserCount === permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'AT_LIMIT';
    }

    return {
      data: {
        currentUserCount,
        permittedSeats,
        shouldNotify,
        licenseLimitStatus,
        isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
        licenseType: strapi.ee.licenseInfo.type,
      },
    };
  },
};

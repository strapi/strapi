'use strict';

const { env } = require('@strapi/utils');

module.exports = {
  async licenseLimitInformation() {
    const permittedSeats = strapi.ee.licenseInfo.seats;
    if (!permittedSeats) return;

    let shouldNotify = false;
    let licenseLimitStatus = null;
    let enforcementUserCount;

    const currentActiveUserCount = await strapi.db
      .query('admin::user')
      .count({ where: { isActive: true } });

    const data = await strapi.db.query('strapi::ee-store').findOne({
      where: { key: 'ee_disabled_users' },
    });

    if (data.value) {
      const eeDisabledUsers = JSON.parse(data.value);
      enforcementUserCount = currentActiveUserCount + eeDisabledUsers.length;
    } else {
      enforcementUserCount = currentActiveUserCount;
    }

    if (enforcementUserCount > permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'OVER_LIMIT';
    }

    if (enforcementUserCount === permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'AT_LIMIT';
    }

    return {
      data: {
        enforcementUserCount,
        currentActiveUserCount,
        permittedSeats,
        shouldNotify,
        shouldStopCreate: currentActiveUserCount >= permittedSeats,
        licenseLimitStatus,
        isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
        licenseType: strapi.ee.licenseInfo.type,
      },
    };
  },
};

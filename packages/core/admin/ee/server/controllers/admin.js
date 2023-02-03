'use strict';

module.exports = {
  async licenseLimitInformation() {
    const currentUserCount = await strapi.db
      .query('admin::user')
      .count({ where: { isActive: true } });

    const permittedSeats = 5;

    let shouldNotify = false;
    let licenseLimitStatus = null;

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
      },
    };
  },
};

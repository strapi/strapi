'use strict';

/**
 * job-post service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::job-post.job-post');

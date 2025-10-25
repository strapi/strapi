import { Strapi } from '@strapi/strapi';

export default async ({ strapi }: { strapi: Strapi }) => {
  // connect the Kafka producer
  await strapi.plugin('audit-log').service('kafka').connect();
// start the Kafka consumer
  await strapi.plugin('audit-log').service('kafkaConsumer').start();
};

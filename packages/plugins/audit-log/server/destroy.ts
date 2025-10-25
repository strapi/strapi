import { Strapi } from '@strapi/strapi';

export default async ({ strapi }: { strapi: Strapi }) => {
  // disconnect the Kafka producer
  await strapi.plugin('audit-log').service('kafka').disconnect();
// stop the Kafka consumer
  await strapi.plugin('audit-log').service('kafkaConsumer').stop();
};

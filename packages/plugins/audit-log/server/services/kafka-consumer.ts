import { Strapi } from '@strapi/strapi';
import { Kafka, Consumer } from 'kafkajs';
import { AuditLogPluginConfig } from '@strapi/plugin-audit-log/types'; // Use new alias

let consumer: Consumer | null = null;
let kafkaInstance: Kafka | null = null;

export default ({ strapi }: { strapi: Strapi }) => ({
  async start() {
    const config = strapi.config.get('plugin.audit-log') as AuditLogPluginConfig; // Cast config
    const { brokers, topic } = config.kafka; // Access kafka property

    if (!brokers || brokers.length === 0) {
      strapi.log.error('Kafka brokers not configured for audit-log plugin.');
      return;
    }

    kafkaInstance = new Kafka({
      clientId: 'strapi-audit-log-consumer',
      brokers,
    });

    consumer = kafkaInstance.consumer({ groupId: 'strapi-audit-log-group' });

    try {
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const auditLogEntry = JSON.parse(message.value!.toString());
            // Persist to database
            await strapi.entityService.create('plugin::audit-log.audit-log', {
              data: auditLogEntry,
            });
            strapi.log.debug(
              `Audit log message processed from Kafka: ${topic}[${partition}] ${message.offset}`
            );
          } catch (error) {
            strapi.log.error('Error processing Kafka message:', error, message.value?.toString());
            // TODO: Implement robust error handling, e.g., send to dead-letter queue
          }
        },
      });
      strapi.log.info('Kafka consumer started successfully.');
    } catch (error) {
      strapi.log.error('Failed to start Kafka consumer:', error);
      consumer = null; // Ensure consumer is null on failure
    }
  },

  async stop() {
    if (consumer) {
      await consumer.disconnect();
      strapi.log.info('Kafka consumer disconnected.');
      consumer = null;
      kafkaInstance = null;
    }
  },
});

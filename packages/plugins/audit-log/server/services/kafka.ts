import { Strapi } from '@strapi/strapi';
import { Kafka, Producer } from 'kafkajs';
import { AuditLogPluginConfig } from '@strapi/plugin-audit-log/types'; // Use new alias

let producer: Producer | null = null;
let kafka: Kafka | null = null;

export default ({ strapi }: { strapi: Strapi }) => ({
  async connect() {
    const config = strapi.config.get('plugin.audit-log') as AuditLogPluginConfig; // Cast config
    const { brokers, topic } = config.kafka; // Access kafka property

    if (!brokers || brokers.length === 0) {
      strapi.log.error('Kafka brokers not configured for audit-log plugin.');
      return;
    }

    kafka = new Kafka({
      clientId: 'strapi-audit-log-producer',
      brokers,
    });

    producer = kafka.producer();

    try {
      await producer.connect();
      strapi.log.info('Kafka producer connected successfully.');
    } catch (error) {
      strapi.log.error('Failed to connect Kafka producer:', error);
      producer = null; // Ensure producer is null on connection failure
    }
  },

  async disconnect() {
    if (producer) {
      await producer.disconnect();
      strapi.log.info('Kafka producer disconnected.');
      producer = null;
      kafka = null;
    }
  },

  async sendMessage(message: any) {
    if (!producer) {
      strapi.log.warn('Kafka producer not connected. Message not sent.');
      return;
    }

    const config = strapi.config.get('plugin.audit-log') as AuditLogPluginConfig; // Cast config
    const { topic } = config.kafka; // Access kafka property

    try {
      await producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      });
      strapi.log.debug('Audit log message sent to Kafka:', message);
    } catch (error) {
      strapi.log.error('Failed to send audit log message to Kafka:', error);
    }
  },
});

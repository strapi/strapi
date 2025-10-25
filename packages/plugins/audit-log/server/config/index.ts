export default {
  default: {
    enabled: true,
    excludeContentTypes: ['admin::user', 'admin::role'], // Example content types to exclude
  kafka: {
      brokers: ['localhost:9092'], // Default Kafka broker(s)
      topic: 'strapi-audit-logs', // Default Kafka topic
    },
  },
  validator() {},
};

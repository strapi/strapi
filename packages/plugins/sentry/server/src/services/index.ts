import sentry from './sentry';

type SentryServices = Record<string, unknown>;

const services: SentryServices = {
  sentry,
};

export default services;

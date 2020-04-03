module.exports = {
  timeout: 100,
  load: {
    before: ['responseTime', 'logger', 'cors', 'responses', 'gzip'],
    order: ['session', 'xframe', 'public'],
    after: ['parser', 'router'],
  },
  settings: {
    favicon: {
      path: 'favicon.ico',
      maxAge: 86400000,
    },
    public: {
      path: './public',
      maxAge: 60000,
    },
    language: {
      enabled: true,
      defaultLocale: 'en_us',
      modes: ['query', 'subdomain', 'cookie', 'header', 'url', 'tld'],
      cookieName: 'locale',
    },
    csp: {
      enabled: true,
      policy: ['block-all-mixed-content'],
    },
    p3p: {
      enabled: false,
      value: '',
    },
    hsts: {
      enabled: true,
      maxAge: 31536000,
      includeSubDomains: true,
    },
    xframe: {
      enabled: true,
      value: 'SAMEORIGIN',
    },
    xss: {
      enabled: true,
      mode: 'block',
    },
    cors: {
      enabled: true,
    },
    ip: {
      enabled: false,
      whiteList: [],
      blackList: [],
    },
    session: {
      enabled: true,
      client: 'cookie',
      key: 'strapi.sid',
      prefix: 'strapi:sess:',
      secretKeys: ['mySecretKey1', 'mySecretKey2'],
      httpOnly: true,
      maxAge: 86400000,
      overwrite: true,
      signed: false,
      rolling: false,
    },
    logger: {
      level: 'debug',
      exposeInContext: true,
      requests: true,
    },
    parser: {
      enabled: true,
      multipart: true,
    },
    gzip: {
      enabled: false,
    },
    responses: {
      enabled: true,
    },
    responseTime: {
      enabled: false,
    },
    poweredBy: {
      enabled: true,
      value: 'Strapi <strapi.io>',
    },
  },
};

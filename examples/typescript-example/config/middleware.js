module.exports = ({ env }) => {
  const NODE_ENV = env('NODE_ENV', 'development');
  const isProduction = NODE_ENV === 'production';

  return {
    timeout: 100,
    load: {
      before: ['responseTime', 'logger', 'cors', 'responses', 'gzip'],
      order: [
        'Define the middleware load order by putting their name in this array is the right order',
      ],
      after: ['parser', 'router'],
    },
    settings: {
      public: {
        path: './public',
        maxAge: 60000,
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

      gzip: {
        enabled: false,
      },
      responseTime: {
        enabled: false,
      },
      poweredBy: {
        enabled: !isProduction,
        value: 'Strapi <strapi.io>',
      },

      session: {
        enabled: false,
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
        level: isProduction ? 'info' : 'debug',
        exposeInContext: true,
        requests: !isProduction,
      },
      parser: {
        enabled: true,
        multipart: true,
      },
    },
  };
};

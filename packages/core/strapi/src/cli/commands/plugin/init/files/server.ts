import { TemplateFile } from '@strapi/pack-up';
import { outdent } from 'outdent';

const TYPESCRIPT = (pluginName: string): TemplateFile[] => [
  {
    name: 'server/src/index.ts',
    contents: outdent`
    /**
     * Application methods
     */
    import bootstrap from './bootstrap';
    import destroy from './destroy';
    import register from './register';

    /**
     * Plugin server methods
     */
    import config from './config';
    import contentTypes from './content-types';
    import controllers from './controllers';
    import middlewares from './middlewares';
    import policies from './policies';
    import routes from './routes';
    import services from './services';
    
    export default {
      bootstrap,
      destroy,
      register,
      
      config,
      controllers,
      contentTypes,
      middlewares,
      policies,
      routes,
      services,
    };
    `,
  },
  {
    name: 'server/src/bootstrap.ts',
    contents: outdent`
    import type { Strapi } from '@strapi/strapi';

    const bootstrap = ({ strapi }: { strapi: Strapi }) => {
      // bootstrap phase
    };

    export default bootstrap;
    `,
  },
  {
    name: 'server/src/destroy.ts',
    contents: outdent`
    import type { Strapi } from '@strapi/strapi';

    const destroy = ({ strapi }: { strapi: Strapi }) => {
      // destroy phase
    };

    export default destroy;
    `,
  },
  {
    name: 'server/src/register.ts',
    contents: outdent`
    import type { Strapi } from '@strapi/strapi';

    const register = ({ strapi }: { strapi: Strapi }) => {
      // register phase
    };

    export default register;
    `,
  },
  {
    name: 'server/src/config/index.ts',
    contents: outdent`
      export default {
        default: {},
        validator() {},
      };
    `,
  },
  {
    name: 'server/src/content-types/index.ts',
    contents: outdent`
    export default {};
    `,
  },
  {
    name: 'server/src/controllers/index.ts',
    contents: outdent`
    import controller from './controller';

    export default {
        controller,
    };
    `,
  },
  {
    name: 'server/src/controllers/controller.ts',
    contents: outdent`
    import type { Strapi } from '@strapi/strapi';

    const controller = ({ strapi }: { strapi: Strapi }) => ({
      index(ctx) {
        ctx.body = strapi
          .plugin('${pluginName}')
          // the name of the service file & the method.
          .service('service')
          .getWelcomeMessage();
      },
    });

    export default controller
    `,
  },
  {
    name: 'server/src/middlewares/index.ts',
    contents: outdent`
    export default {};
    `,
  },
  {
    name: 'server/src/policies/index.ts',
    contents: outdent`
    export default {};
    `,
  },
  {
    name: 'server/src/routes/index.ts',
    contents: outdent`
    export default [
        {
          method: 'GET',
          path: '/',
          // name of the controller file & the method.
          handler: 'controller.index',
          config: {
            policies: [],
          },
        },
      ];
    `,
  },
  {
    name: 'server/src/services/index.ts',
    contents: outdent`
    import service from './service';

    export default {
        service,
    };
    `,
  },
  {
    name: 'server/src/services/service.ts',
    contents: outdent`
    import type { Strapi } from '@strapi/strapi';

    const service = ({ strapi }: { strapi: Strapi }) => ({
        getWelcomeMessage() {
            return 'Welcome to Strapi 🚀';
        },
    });

    export default service
    `,
  },
];

const JAVASCRIPT = (pluginName: string): TemplateFile[] => [
  {
    name: 'server/src/index.ts',
    contents: outdent`
        'use strict';

        /**
         * Application methods
         */
        const bootstrap = require('./bootstrap');
        const destroy = require('./destroy');
        const register = require('./register');

        /**
         * Plugin server methods
         */
        const config = require('./config');
        const contentTypes = require('./content-types');
        const controllers = require('./controllers');
        const middlewares = require('./middlewares');
        const policies = require('./policies');
        const routes = require('./routes');
        const services = require('./services');

        module.exports = {
            bootstrap,
            destroy,
            register,
            
            config,
            controllers,
            contentTypes,
            middlewares,
            policies,
            routes,
            services,
        };
        `,
  },
  {
    name: 'server/src/bootstrap.ts',
    contents: outdent`
        'use strict';

        const bootstrap = ({ strapi }) => {
          // bootstrap phase
        };

        module.exports = bootstrap;
        `,
  },
  {
    name: 'server/src/destroy.ts',
    contents: outdent`
        'use strict';

        const destroy = ({ strapi }) => {
          // destroy phase
        };
    
        module.exports = destroy;
        `,
  },
  {
    name: 'server/src/register.ts',
    contents: outdent`
        'use strict';

        const register = ({ strapi }) => {
          // register phase
        };
    
        module.exports = register;
        `,
  },
  {
    name: 'server/src/config/index.ts',
    contents: outdent`
      'use strict';

      module.exports = {
        default: {},
        validator() {},
      };
    `,
  },
  {
    name: 'server/src/content-types/index.ts',
    contents: outdent`
    'use strict';

    module.exports = {};
    `,
  },
  {
    name: 'server/src/controllers/index.ts',
    contents: outdent`
    'use strict';

    const controller = require('./controller');

    module.exports = {
        controller,
    };
    `,
  },
  {
    name: 'server/src/controllers/controller.ts',
    contents: outdent`
    'use strict';

    const controller = ({ strapi }) => ({
      index(ctx) {
        ctx.body = strapi
          .plugin('${pluginName}')
          // the name of the service file & the method.
          .service('service')
          .getWelcomeMessage();
      },
    });

    module.exports = controller
    `,
  },
  {
    name: 'server/src/middlewares/index.ts',
    contents: outdent`
    'use strict';

    module.exports = {};
    `,
  },
  {
    name: 'server/src/policies/index.ts',
    contents: outdent`
    'use strict';

    module.exports = {};
    `,
  },
  {
    name: 'server/src/routes/index.ts',
    contents: outdent`
    'use strict';

    module.exports = [
        {
          method: 'GET',
          path: '/',
          // name of the controller file & the method.
          handler: 'controller.index',
          config: {
            policies: [],
          },
        },
      ];
    `,
  },
  {
    name: 'server/src/services/index.ts',
    contents: outdent`
    'use strict';

    const service = require('./service');

    module.exports = {
        service,
    };
    `,
  },
  {
    name: 'server/src/services/service.ts',
    contents: outdent`
    'use strict';

    const service = ({ strapi }) => ({
        getWelcomeMessage() {
            return 'Welcome to Strapi 🚀';
        },
    });

    module.exports = service
    `,
  },
];

export { TYPESCRIPT as serverTypescriptFiles, JAVASCRIPT as serverJavascriptFiles };

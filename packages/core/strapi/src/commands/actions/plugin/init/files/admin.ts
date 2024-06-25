import { TemplateFile } from '@strapi/pack-up';
import { outdent } from 'outdent';

const PLUGIN_ICON_CODE = outdent`
import { Puzzle } from '@strapi/icons';

const PluginIcon = () => <Puzzle />;

export { PluginIcon };
`;

const APP_CODE = outdent`
import { AnErrorOccurred } from '@strapi/helper-plugin';
import { Switch, Route } from 'react-router-dom';

import { PLUGIN_ID } from '../pluginId';

import { HomePage } from './HomePage';

const App = () => {
  return (
    <Switch>
        <Route path={\`/plugins/\${PLUGIN_ID}\`} component={HomePage} exact />
        <Route component={AnErrorOccurred} />
    </Switch>
  );
};

export { App };
`;

const HOMEPAGE_CODE = outdent`
    import { Main } from '@strapi/design-system';
    import { useIntl } from 'react-intl';

    import { getTranslation } from '../utils/getTranslation';

    const HomePage = () => {
        const { formatMessage } = useIntl();

        return (
            <Main>
                <h1>Welcome to {formatMessage({ id: getTranslation("plugin.name") })}</h1>
            </Main>
        )
    }

    export { HomePage };
`;

const TYPESCRIPT: TemplateFile[] = [
  {
    name: 'admin/src/index.ts',
    contents: outdent`
        import { prefixPluginTranslations } from '@strapi/helper-plugin';
        import { PLUGIN_ID } from './pluginId';
        import { Initializer } from './components/Initializer';
        import { PluginIcon } from './components/PluginIcon';
        
        export default {
          register(app: any) {
            app.addMenuLink({
              to: \`/plugins/\${PLUGIN_ID}\`,
              icon: PluginIcon,
              intlLabel: {
                id: \`\${PLUGIN_ID}.plugin.name\`,
                defaultMessage: PLUGIN_ID,
              },
              Component: async () => {
                const { App } = await import('./pages/App');
        
                return App;
              },
            });
        
            app.registerPlugin({
                id: PLUGIN_ID,
                initializer: Initializer,
                isReady: false,
                name: PLUGIN_ID,
            });
          },
        
          async registerTrads(app: any) {
            const { locales } = app;
        
            const importedTranslations = await Promise.all(
              (locales as string[]).map((locale) => {
                return import(\`./translations/\${locale}.json\`)
                  .then(({ default: data }) => {
                    return {
                      data: prefixPluginTranslations(data, PLUGIN_ID),
                      locale,
                    };
                  })
                  .catch(() => {
                    return {
                      data: {},
                      locale,
                    };
                  });
              })
            );
        
            return importedTranslations;
          },
        };
        `,
  },
  {
    name: 'admin/src/components/PluginIcon.tsx',
    contents: PLUGIN_ICON_CODE,
  },
  {
    name: 'admin/src/components/Initializer.tsx',
    contents: outdent`
        import { useEffect, useRef } from 'react';

        import { PLUGIN_ID } from '../pluginId';
        
        type InitializerProps = {
          setPlugin: (id: string) => void;
        };
        
        const Initializer = ({ setPlugin }: InitializerProps) => {
          const ref = useRef(setPlugin);
        
          useEffect(() => {
            ref.current(PLUGIN_ID);
          }, []);
        
          return null;
        };
        
        export { Initializer };
        `,
  },
  {
    name: 'admin/src/pages/App.tsx',
    contents: APP_CODE,
  },
  {
    name: 'admin/src/pages/HomePage.tsx',
    contents: HOMEPAGE_CODE,
  },
  {
    name: 'admin/src/utils/getTranslation.ts',
    contents: outdent`
        import { PLUGIN_ID } from '../pluginId';

        const getTranslation = (id: string) => \`\${PLUGIN_ID}.\${id}\`;

        export { getTranslation };
    `,
  },
  {
    name: 'admin/src/translations/en.json',
    contents: outdent`
        {}
    `,
  },
  {
    /**
     * TODO: remove this when we release design-system V2
     */
    name: 'admin/custom.d.ts',
    contents: outdent`
        declare module '@strapi/design-system/*';
        declare module '@strapi/design-system';
    `,
  },
];

const JAVASCRIPT: TemplateFile[] = [
  {
    name: 'admin/src/index.js',
    contents: outdent`
            import { prefixPluginTranslations } from '@strapi/helper-plugin';
            import { PLUGIN_ID } from './pluginId';
            import { Initializer } from './components/Initializer';
            import { PluginIcon } from './components/PluginIcon';
            
            export default {
              register(app) {
                app.addMenuLink({
                  to: \`/plugins/\${PluginIcon}\`,
                  icon: PluginIcon,
                  intlLabel: {
                    id: \`\${PLUGIN_ID}.plugin.name\`,
                    defaultMessage: PLUGIN_ID,
                  },
                  Component: async () => {
                    const { App } = await import('./pages/App');
            
                    return App;
                  },
                });
            
                app.registerPlugin({
                    id: PLUGIN_ID,
                    initializer: Initializer,
                    isReady: false,
                    name: PLUGIN_ID,
                });
              },
            
              async registerTrads(app) {
                const { locales } = app;
            
                const importedTranslations = await Promise.all(
                  locales.map((locale) => {
                    return import(\`./translations/\${locale}.json\`)
                      .then(({ default: data }) => {
                        return {
                          data: prefixPluginTranslations(data, PLUGIN_ID),
                          locale,
                        };
                      })
                      .catch(() => {
                        return {
                          data: {},
                          locale,
                        };
                      });
                  })
                );
            
                return importedTranslations;
              },
            };
            `,
  },
  {
    name: 'admin/src/components/PluginIcon.jsx',
    contents: PLUGIN_ICON_CODE,
  },
  {
    name: 'admin/src/components/Initializer.jsx',
    contents: outdent`
            import { useEffect, useRef } from 'react';
    
            import { PLUGIN_ID } from '../pluginId';
        
            /**
             * @type {import('react').FC<{ setPlugin: (id: string) => void }>}
             */     
            const Initializer = ({ setPlugin }) => {
              const ref = useRef(setPlugin);
            
              useEffect(() => {
                ref.current(PLUGIN_ID);
              }, []);
            
              return null;
            };
            
            export { Initializer };
            `,
  },
  {
    name: 'admin/src/pages/App.jsx',
    contents: APP_CODE,
  },
  {
    name: 'admin/src/pages/HomePage.jsx',
    contents: HOMEPAGE_CODE,
  },
  {
    name: 'admin/src/utils/getTranslation.js',
    contents: outdent`
            import { PLUGIN_ID } from '../pluginId';
    
            const getTranslation = (id) => \`\${PLUGIN_ID}.\${id}\`;
    
            export { getTranslation };
        `,
  },
  {
    name: 'admin/src/translations/en.json',
    contents: outdent`
            {}
        `,
  },
];

export { TYPESCRIPT as adminTypescriptFiles, JAVASCRIPT as adminJavascriptFiles };

import { PuzzlePiece } from '@strapi/icons';

import { prefixPluginTranslations } from './utils/prefixPluginTranslations';
import pluginPkg from '../../package.json';
import pluginId from './pluginId';

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addMenuLink({
      to: `plugins/${pluginId}`,
      icon: PuzzlePiece,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'My plugin',
      },
      Component: () => import('./pages/App'),
      permissions: [],
    });

    app.registerPlugin({
      id: pluginId,
      name,
    });

    const allTypes = [
      'biginteger',
      'boolean',
      'date',
      'datetime',
      'decimal',
      'email',
      'enumeration',
      'float',
      'integer',
      'json',
      'password',
      'richtext',
      'string',
      'text',
      'time',
      'uid',
    ];

    allTypes.forEach((type) => {
      const upcasedType = type.charAt(0).toUpperCase() + type.slice(1);
      const customField = {
        type,
        pluginId: 'myplugin',
        name: `custom${upcasedType}`,
        intlLabel: {
          id: 'customfieldtest',
          defaultMessage: `custom${upcasedType}`,
        },
        intlDescription: {
          id: 'customfieldtest',
          defaultMessage: `custom${upcasedType}`,
        },
        components: {
          Input: PuzzlePiece,
        },
      };

      app.customFields.register(customField);
    });
  },
  bootstrap() {},
  async registerTrads({ locales, importLocaleJson }) {
    const importedTrads = await Promise.all(
      locales.map(async (locale) => {
        const data = await importLocaleJson(
          locale,
          (code) => import(`./translations/${code}.json`)
        );

        return {
          data: prefixPluginTranslations(data, pluginId),
          locale,
        };
      })
    );

    return Promise.resolve(importedTrads);
  },
};

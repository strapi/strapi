import type { Core } from '@strapi/types';
import { Model } from '@strapi/database';

import { warnLateRegistration } from '../utils/late-registration';
import { areDatabaseModelsBuilt, databaseModelsWindow } from './database-models';

export const registry = (strapi: Core.Strapi) => {
  const models: Model[] = [];

  return {
    add(model: Model) {
      models.push(model);

      if (areDatabaseModelsBuilt(strapi) === true) {
        warnLateRegistration(strapi, {
          ...databaseModelsWindow,
          surface: 'models',
          key: model.uid,
          subject: `Database model "${model.uid}"`,
          effect: `the database does not know it, so Strapi creates no table for it and strapi.db.query("${model.uid}") throws "Model ${model.uid} not found"`,
        });
      }

      return this;
    },

    get() {
      return models;
    },
  };
};

import type { Core, Schema, Data } from '@strapi/types';

import { traverseEntity } from '@strapi/utils';
import { curry } from 'lodash/fp';

import { getService } from '../../utils';

const LOCALIZATION_FIELDS = ['locale', 'localizations'];

const sanitize = ({ strapi }: { strapi: Core.Strapi }) => {
  const { isLocalizedContentType } = getService('content-types');

  /**
   * Sanitizes localization fields of a given entity based on its schema.
   *
   * Remove localization-related fields that are unnecessary, that is
   * for schemas that aren't localized.
   */
  const sanitizeLocalizationFields = curry((schema: Schema.Schema, entity: Data.Entity) =>
    traverseEntity(
      ({ key, schema }, { remove }) => {
        const isLocalized = isLocalizedContentType(schema);
        const isLocalizationField = LOCALIZATION_FIELDS.includes(key);

        if (!isLocalized && isLocalizationField) {
          remove(key);
        }
      },
      { schema, getModel: strapi.getModel.bind(strapi) },
      entity
    )
  );

  return {
    sanitizeLocalizationFields,
  };
};

type SanitizeService = typeof sanitize;

export default sanitize;
export type { SanitizeService };

import { pick, uniq, prop, getOr, flatten, pipe, map } from 'lodash/fp';
import { contentTypes as contentTypesUtils, errors } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';
import { getService } from '../utils';
import {
  validateGetNonLocalizedAttributesInput,
  validateFillFromLocaleInput,
} from '../validation/content-types';

const { ApplicationError } = errors;

const { PUBLISHED_AT_ATTRIBUTE } = contentTypesUtils.constants;

const getLocalesProperty = getOr<string[]>([], 'properties.locales');
const getFieldsProperty = prop('properties.fields');

const getFirstLevelPath = map((path: string) => path.split('.')[0]);

const controller = {
  async getNonLocalizedAttributes(ctx) {
    const { user } = ctx.state;
    const body = ctx.request.body as any;
    const { model, id, locale } = body;

    await validateGetNonLocalizedAttributesInput({ model, id, locale });

    const {
      copyNonLocalizedAttributes,
      isLocalizedContentType,
      getNestedPopulateOfNonLocalizedAttributes,
    } = getService('content-types');

    const {
      default: { READ_ACTION, CREATE_ACTION },
    } = strapi.service('admin::constants');

    const modelDef = strapi.contentType(model);
    const attributesToPopulate = getNestedPopulateOfNonLocalizedAttributes(model);

    if (!isLocalizedContentType(modelDef)) {
      throw new ApplicationError(`Model ${model} is not localized`);
    }

    const params = modelDef.kind === 'singleType' ? {} : { id };

    const entity = await strapi.db
      .query(model)
      .findOne({ where: params, populate: attributesToPopulate });

    if (!entity) {
      return ctx.notFound();
    }

    const permissions = await strapi.admin.services.permission.findMany({
      where: {
        action: [READ_ACTION, CREATE_ACTION],
        subject: model,
        role: {
          id: user.roles.map(prop('id')),
        },
      },
    });

    const localePermissions = permissions
      .filter((perm: any) => getLocalesProperty(perm).includes(locale))
      .map(getFieldsProperty);

    const permittedFields = pipe(flatten, getFirstLevelPath, uniq)(localePermissions);

    const nonLocalizedFields = copyNonLocalizedAttributes(modelDef, entity);
    const sanitizedNonLocalizedFields = pick(permittedFields, nonLocalizedFields);

    const availableLocalesResult = await strapi.plugins['content-manager']
      .service('document-metadata')
      .getMetadata(model, entity, {
        availableLocales: true,
      });

    const availableLocales = availableLocalesResult.availableLocales.map((localeResult: any) =>
      pick(['id', 'locale', PUBLISHED_AT_ATTRIBUTE], localeResult)
    );

    ctx.body = {
      nonLocalizedFields: sanitizedNonLocalizedFields,
      localizations: availableLocales.concat(
        pick(['id', 'locale', PUBLISHED_AT_ATTRIBUTE], entity)
      ),
    };
  },

  async getFillFromLocaleData(ctx) {
    await validateFillFromLocaleInput(ctx.request.body);

    const { model, documentId, sourceLocale, targetLocale } = ctx.request.body as {
      model: string;
      documentId?: string;
      sourceLocale: string;
      targetLocale: string;
    };

    const fillFromLocaleService = getService('fill-from-locale');
    const data = await fillFromLocaleService.getDataForLocale(
      model as UID.ContentType,
      sourceLocale,
      targetLocale,
      documentId
    );

    if (!data) {
      return ctx.notFound();
    }

    ctx.body = { data };
  },
} satisfies Core.Controller;

export default controller;

import { pick, uniq, prop, getOr, flatten, pipe, map } from 'lodash/fp';
import { contentTypes as contentTypesUtils, errors } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';
import type { FillFromLocale } from '../../../shared/contracts/content-manager';
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
    const { user, userAbility } = ctx.state;
    const body = ctx.request.body as any;
    const { model, id, locale } = body;

    await validateGetNonLocalizedAttributesInput({ model, id, locale });

    const permissionChecker = strapi
      .plugin('content-manager')
      .service('permission-checker')
      .create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

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
    const pickedFields = pick(permittedFields, nonLocalizedFields);

    // Guard relations: omit fields that point to content types the user cannot read
    const sanitizedNonLocalizedFields = Object.fromEntries(
      Object.entries(pickedFields).filter(([key]) => {
        const attribute = modelDef.attributes?.[key] as any;
        if (attribute?.type === 'relation' && attribute.target) {
          return userAbility.can(READ_ACTION, attribute.target);
        }
        return true;
      })
    );

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
    const { userAbility } = ctx.state;
    const { model } = ctx.params;

    await validateFillFromLocaleInput(ctx.query);

    const { documentId, sourceLocale, targetLocale } = ctx.query as unknown as Omit<
      FillFromLocale.Params,
      'model'
    >;

    const permissionChecker = strapi
      .plugin('content-manager')
      .service('permission-checker')
      .create({ userAbility, model });

    if (permissionChecker.cannot.read()) {
      return ctx.forbidden();
    }

    const fillFromLocaleService = getService('fill-from-locale');

    const rawDocument = await fillFromLocaleService.fetchRawDocument(
      model as UID.ContentType,
      sourceLocale,
      documentId
    );

    if (!rawDocument) {
      return ctx.notFound();
    }

    // Field-level filtering: strip fields the user cannot read on this content type
    const sanitizedDocument = await permissionChecker.sanitizeOutput(rawDocument);

    // Transform relations to target locale, skipping those the user cannot read
    const data = await fillFromLocaleService.transformDocument(
      sanitizedDocument as Record<string, unknown>,
      model as UID.ContentType,
      targetLocale,
      userAbility
    );

    ctx.body = { data };
  },
} satisfies Core.Controller;

export default controller;

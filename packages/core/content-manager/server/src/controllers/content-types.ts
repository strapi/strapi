import { objects } from '@strapi/utils';
import { has, get, mapValues, omit } from 'lodash';

import { getService } from '../utils';
import {
  getService as getCustomOrderService,
  isFeatureEnabled as isCustomOrderFeatureEnabled,
} from '../custom-order/utils';
import { createModelConfigurationSchema, validateKind } from './validation';

const assocMainField = (metadata: any) =>
  has(metadata, 'edit.mainField')
    ? objects.set(metadata, 'list.mainField', get(metadata, 'edit.mainField'))
    : metadata;

export default {
  async findContentTypes(ctx: any) {
    const { kind } = ctx.query;

    try {
      await validateKind(kind);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const contentTypes = getService('content-types').findContentTypesByKind(kind);
    const { toDto } = getService('data-mapper');

    ctx.body = { data: contentTypes.map(toDto) };
  },

  async findContentTypesSettings(ctx: any) {
    const { findAllContentTypes, findConfiguration } = getService('content-types');

    const contentTypes = await findAllContentTypes();
    const configurations = await Promise.all(
      contentTypes.map(async (contentType: any) => {
        const { uid, settings } = await findConfiguration(contentType);
        return { uid, settings };
      })
    );

    ctx.body = {
      data: configurations,
    };
  },

  async findContentTypeConfiguration(ctx: any) {
    const { uid } = ctx.params;

    const contentTypeService = getService('content-types');

    const contentType = await contentTypeService.findContentType(uid);

    if (!contentType) {
      return ctx.notFound('contentType.notFound');
    }

    const configuration = await contentTypeService.findConfiguration(contentType);

    const confWithUpdatedMetadata = {
      ...configuration,
      metadatas: {
        ...mapValues(configuration.metadatas, (value) => assocMainField(value)),
        documentId: {
          edit: {},
          list: {
            label: 'documentId',
            searchable: true,
            sortable: true,
          },
        },
      },
    };

    const components = await contentTypeService.findComponentsConfigurations(contentType);

    ctx.body = {
      data: {
        contentType: confWithUpdatedMetadata,
        components,
      },
    };
  },

  async updateContentTypeConfiguration(ctx: any) {
    const { userAbility } = ctx.state;
    const { uid } = ctx.params;
    const { body } = ctx.request;

    const contentTypeService = getService('content-types');
    const metricsService = getService('metrics');

    const contentType = await contentTypeService.findContentType(uid);

    if (!contentType) {
      return ctx.notFound('contentType.notFound');
    }

    if (!getService('permission').canConfigureContentType({ userAbility, contentType })) {
      return ctx.forbidden();
    }

    let input;
    try {
      input = await createModelConfigurationSchema(contentType).validate(body, {
        abortEarly: false,
        stripUnknown: true,
        strict: true,
      });
    } catch (error: any) {
      return ctx.badRequest(null, {
        name: 'validationError',
        errors: error.errors,
      });
    }

    const customOrder = isCustomOrderFeatureEnabled(strapi)
      ? getCustomOrderService(strapi, 'custom-order')
      : null;

    if (input.settings && 'customOrder' in input.settings) {
      if (!customOrder) {
        input.settings = omit(input.settings, 'customOrder');
      } else if (input.settings.customOrder === true && !customOrder.isOrderable(uid)) {
        return ctx.badRequest(null, {
          name: 'validationError',
          errors: ['settings.customOrder is only available on collection types'],
        });
      }
    }

    const newConfiguration = await contentTypeService.updateConfiguration(contentType, input);

    await customOrder?.applySettings(uid, newConfiguration.settings);

    await metricsService.sendDidConfigureListView(contentType, newConfiguration);

    const confWithUpdatedMetadata = {
      ...newConfiguration,
      metadatas: mapValues(newConfiguration.metadatas, (value) => assocMainField(value)),
    };

    const components = await contentTypeService.findComponentsConfigurations(contentType);

    ctx.body = {
      data: {
        contentType: confWithUpdatedMetadata,
        components,
      },
    };
  },
};

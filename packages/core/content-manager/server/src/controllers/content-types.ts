import { has, assoc, mapValues, prop } from 'lodash/fp';
import { getService } from '../utils';
import { createModelConfigurationSchema, validateKind } from './validation';

const hasEditMainField = has('edit.mainField');
const getEditMainField = prop('edit.mainField');
const assocListMainField = assoc('list.mainField');

const assocMainField = (metadata: any) =>
  hasEditMainField(metadata) ? assocListMainField(getEditMainField(metadata), metadata) : metadata;

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
        ...mapValues(assocMainField, configuration.metadatas),
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

    const newConfiguration = await contentTypeService.updateConfiguration(contentType, input);

    await metricsService.sendDidConfigureListView(contentType, newConfiguration);

    const confWithUpdatedMetadata = {
      ...newConfiguration,
      metadatas: mapValues(assocMainField, newConfiguration.metadatas),
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

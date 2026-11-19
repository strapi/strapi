import { mapValues } from 'lodash';

import { contentTypes as contentTypesUtils } from '@strapi/utils';

import type { UID, Struct, Core } from '@strapi/types';

import type { Configuration } from '../../../shared/contracts/content-types';
import type { ContentManagerModel, ContentTypesService } from '../types/services';
import type { ConfigurationUpdate } from './configuration';

import { getService } from '../utils';
import storeUtils from './utils/store';
import createConfigurationService from './configuration';

const configurationService = createConfigurationService({
  storeUtils,
  prefix: 'content_types',
  getModels() {
    const { toContentManagerModel } = getService('data-mapper');

    return mapValues(strapi.contentTypes, (value) => toContentManagerModel(value));
  },
});

const service = (({ strapi }: { strapi: Core.Strapi }) => ({
  findAllContentTypes() {
    const { toContentManagerModel } = getService('data-mapper');

    return Object.values(strapi.contentTypes).map(toContentManagerModel);
  },

  findContentType(uid: UID.ContentType) {
    const { toContentManagerModel } = getService('data-mapper');

    const contentType = strapi.contentTypes[uid];

    return contentType == null ? contentType : toContentManagerModel(contentType);
  },

  findDisplayedContentTypes(): Core.IsStrict extends true
    ? ReturnType<ContentTypesService['findDisplayedContentTypes']>
    : unknown[] {
    return this.findAllContentTypes().filter(
      (contentType: ContentManagerModel<Struct.ContentTypeSchema>) =>
        contentType.isDisplayed === true
    );
  },

  findContentTypesByKind(
    kind: Struct.ContentTypeKind | null | undefined
  ): Core.IsStrict extends true
    ? ReturnType<ContentTypesService['findContentTypesByKind']>
    : unknown[] {
    if (kind === undefined || kind === null) {
      return this.findAllContentTypes();
    }

    // The models are `unknown` without strict types, as on develop.
    return this.findAllContentTypes().filter(
      contentTypesUtils.isKind(kind) as (contentType: unknown) => boolean
    );
  },

  async findConfiguration(contentType: Struct.ContentTypeSchema) {
    // The stored configuration carries the content type's uid once it has been set
    const configuration: Core.IsStrict extends true
      ? Configuration & { uid?: UID.ContentType }
      : any = await configurationService.getConfiguration(contentType.uid);

    return {
      uid: contentType.uid,
      ...configuration,
    };
  },

  async updateConfiguration(
    contentType: Struct.ContentTypeSchema,
    newConfiguration: ConfigurationUpdate
  ): Core.IsStrict extends true
    ? ReturnType<ContentTypesService['updateConfiguration']>
    : Promise<any> {
    await configurationService.setConfiguration(contentType.uid, newConfiguration);

    return this.findConfiguration(contentType);
  },

  findComponentsConfigurations(contentType: Struct.ContentTypeSchema) {
    // delegate to componentService
    return getService('components').findComponentsConfigurations(contentType);
  },

  syncConfigurations() {
    return configurationService.syncConfigurations();
  },
})) satisfies Core.ServiceImplementation<'plugin::content-manager.content-types'>;

export default service;

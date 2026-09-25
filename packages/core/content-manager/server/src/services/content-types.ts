import { isNil, mapValues } from 'lodash/fp';
import { contentTypes as contentTypesUtils } from '@strapi/utils';

import type { UID, Struct, Core } from '@strapi/types';

import type { ConfigurationUpdate } from './configuration';

import { getService } from '../utils';
import storeUtils from './utils/store';
import createConfigurationService from './configuration';

const configurationService = createConfigurationService({
  storeUtils,
  prefix: 'content_types',
  getModels() {
    const { toContentManagerModel } = getService('data-mapper');

    return mapValues(toContentManagerModel, strapi.contentTypes);
  },
});

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  findAllContentTypes() {
    const { toContentManagerModel } = getService('data-mapper');

    return Object.values(strapi.contentTypes).map(toContentManagerModel);
  },

  findContentType(uid: UID.ContentType) {
    const { toContentManagerModel } = getService('data-mapper');

    const contentType = strapi.contentTypes[uid];

    return isNil(contentType) ? contentType : toContentManagerModel(contentType);
  },

  findDisplayedContentTypes() {
    return this.findAllContentTypes().filter(
      ({ isDisplayed }: { isDisplayed: boolean }) => isDisplayed === true
    );
  },

  findContentTypesByKind(kind: { kind: Struct.ContentTypeKind | undefined }) {
    if (!kind) {
      return this.findAllContentTypes();
    }

    // @ts-expect-error TODO when adding types
    return this.findAllContentTypes().filter(contentTypesUtils.isKind(kind));
  },

  // Only the UID is read: callers outside the Content Manager pass `{ uid }`.
  async findConfiguration(contentType: Pick<Struct.ContentTypeSchema, 'uid'>) {
    const configuration = await configurationService.getConfiguration(contentType.uid);

    return {
      uid: contentType.uid,
      ...configuration,
    };
  },

  async updateConfiguration(
    contentType: Pick<Struct.ContentTypeSchema, 'uid'>,
    newConfiguration: Partial<ConfigurationUpdate>
  ) {
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
});

export default service;

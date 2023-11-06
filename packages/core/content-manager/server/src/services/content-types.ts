import { isNil, mapValues } from 'lodash/fp';
import { contentTypes as contentTypesUtils } from '@strapi/utils';

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

const service = ({ strapi }: any) => ({
  findAllContentTypes() {
    const { toContentManagerModel } = getService('data-mapper');

    return Object.values(strapi.contentTypes).map(toContentManagerModel);
  },

  findContentType(uid: any) {
    const { toContentManagerModel } = getService('data-mapper');

    const contentType = strapi.contentTypes[uid];

    return isNil(contentType) ? contentType : toContentManagerModel(contentType);
  },

  findDisplayedContentTypes() {
    return this.findAllContentTypes().filter(({ isDisplayed }: any) => isDisplayed === true);
  },

  findContentTypesByKind(kind: any) {
    if (!kind) {
      return this.findAllContentTypes();
    }

    // @ts-expect-error TODO when adding types
    return this.findAllContentTypes().filter(contentTypesUtils.isKind(kind));
  },

  // configuration

  async findConfiguration(contentType: any) {
    const configuration = await configurationService.getConfiguration(contentType.uid);

    return {
      uid: contentType.uid,
      ...configuration,
    };
  },

  async updateConfiguration(contentType: any, newConfiguration: any) {
    await configurationService.setConfiguration(contentType.uid, newConfiguration);
    return this.findConfiguration(contentType);
  },

  findComponentsConfigurations(contentType: any) {
    // delegate to componentService
    return getService('components').findComponentsConfigurations(contentType);
  },

  syncConfigurations() {
    return configurationService.syncConfigurations();
  },
});

export default service;

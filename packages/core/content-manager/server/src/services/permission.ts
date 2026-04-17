import { prop } from 'lodash/fp';
import { contentTypes as contentTypesUtils } from '@strapi/utils';

import type { Core, Struct } from '@strapi/types';
import { getService } from '../utils';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  canConfigureContentType({
    userAbility,
    contentType,
  }: {
    userAbility: any;
    contentType: Struct.ContentTypeSchema;
  }) {
    const action = contentTypesUtils.isSingleType(contentType)
      ? 'plugin::content-manager.single-types.configure-view'
      : 'plugin::content-manager.collection-types.configure-view';

    return userAbility.can(action);
  },

  async registerPermissions() {
    const allContentTypes = getService('content-types').findAllContentTypes();
    const allContentTypesUids = allContentTypes.map(prop('uid'));
    const contentTypesUids = allContentTypes
      .filter(({ isDisplayed }: { isDisplayed: boolean }) => isDisplayed)
      .map(prop('uid'));

    const actions = [
      {
        section: 'contentTypes',
        displayName: 'Create',
        uid: 'explorer.create',
        pluginName: 'content-manager',
        subjects: contentTypesUids,
        options: {
          applyToProperties: ['fields'],
        },
      },
      {
        section: 'contentTypes',
        displayName: 'Read',
        uid: 'explorer.read',
        pluginName: 'content-manager',
        subjects: allContentTypesUids,
        options: {
          applyToProperties: ['fields'],
        },
      },
      {
        section: 'contentTypes',
        displayName: 'Update',
        uid: 'explorer.update',
        pluginName: 'content-manager',
        subjects: contentTypesUids,
        options: {
          applyToProperties: ['fields'],
        },
      },
      {
        section: 'contentTypes',
        displayName: 'Delete',
        uid: 'explorer.delete',
        pluginName: 'content-manager',
        subjects: contentTypesUids,
      },
      {
        section: 'contentTypes',
        displayName: 'Publish',
        uid: 'explorer.publish',
        pluginName: 'content-manager',
        subjects: contentTypesUids,
      },
      {
        section: 'plugins',
        displayName: 'Configure view',
        uid: 'single-types.configure-view',
        subCategory: 'single types',
        pluginName: 'content-manager',
      },
      {
        section: 'plugins',
        displayName: 'Configure view',
        uid: 'collection-types.configure-view',
        subCategory: 'collection types',
        pluginName: 'content-manager',
      },
      {
        section: 'plugins',
        displayName: 'Configure Layout',
        uid: 'components.configure-layout',
        subCategory: 'components',
        pluginName: 'content-manager',
      },
    ];

    await strapi.service('admin::permission').actionProvider.registerMany(actions);
  },
});

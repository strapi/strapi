import type { UID } from '@strapi/types';

import * as components from './components';

import { transformParamsDocumentId } from './transform/id-transform';
import { transformParamsToQuery } from './transform/query';
import { pickSelectionParams } from './params';
import { applyTransforms } from './attributes';
import entityValidator from '../entity-validator';

const createEntriesService = (uid: UID.ContentType) => {
  const contentType = strapi.contentType(uid);

  async function createEntry(params = {} as any) {
    const { data, ...restParams } = await transformParamsDocumentId(uid, params);

    const query = transformParamsToQuery(uid, pickSelectionParams(restParams) as any); // select / populate

    // Validation
    if (!data) {
      throw new Error('Create requires data attribute');
    }

    const validData = await entityValidator.validateEntityCreation(contentType, data, {
      // Note: publishedAt value will always be set when DP is disabled
      isDraft: !params?.data?.publishedAt,
      locale: params?.locale,
    });

    // Component handling
    const componentData = await components.createComponents(uid, validData);
    const contentTypeWithoutComponentData = components.omitComponentData(contentType, validData);
    const entryData = applyTransforms(
      Object.assign(contentTypeWithoutComponentData, componentData) as any,
      { contentType }
    );

    const doc = await strapi.db.query(uid).create({ ...query, data: entryData });

    return doc;
  }

  async function deleteEntry(id: number) {
    const componentsToDelete = await components.getComponents(uid, { id });

    await strapi.db.query(uid).delete({ where: { id } });

    await components.deleteComponents(uid, componentsToDelete as any, { loadComponents: false });
  }

  return {
    create: createEntry,
    delete: deleteEntry,
  };
};

export { createEntriesService };

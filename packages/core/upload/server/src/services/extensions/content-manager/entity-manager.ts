import { async, traverseEntity } from '@strapi/utils';

import type { Schema, UID } from '@strapi/types';

import { getService } from '../../../utils';

import type { File } from '../../../types';

type SignEntityMediaVisitor = (
  args: {
    key: string;
    value: unknown;
    attribute: Schema.Attribute.AnyAttribute;
  },
  utils: {
    set: (key: string, value: unknown) => void;
  }
) => Promise<void>;

function isFile(value: unknown, attribute: Schema.Attribute.AnyAttribute): value is File {
  if (!value || attribute.type !== 'media') {
    return false;
  }

  return true;
}

const signEntityMediaVisitor: SignEntityMediaVisitor = async (
  { key, value, attribute },
  { set }
) => {
  const { signFileUrls } = getService('file');

  if (attribute.type !== 'media') {
    return;
  }

  if (!isFile(value, attribute)) {
    return;
  }

  // If the attribute is repeatable sign each file
  if (attribute.multiple) {
    const signedFiles = await async.map(value, signFileUrls);
    set(key, signedFiles);
    return;
  }

  // If the attribute is not repeatable only sign a single file
  const signedFile = await signFileUrls(value);
  set(key, signedFile);
};

/**
 *
 * Iterate through an entity manager result
 * Check which modelAttributes are media and pre sign the image URLs
 * if they are from the current upload provider
 *
 * @param {Object} entity
 * @param {Object} modelAttributes
 * @returns
 */
const signEntityMedia = async (entity: any, uid: UID.Schema) => {
  const model = strapi.getModel(uid);
  return traverseEntity(
    // @ts-expect-error - FIXME: fix traverseEntity types
    signEntityMediaVisitor,
    { schema: model, getModel: strapi.getModel.bind(strapi) },
    entity
  );
};

const addSignedFileUrlsToAdmin = async () => {
  // FIXME: This is not working. Replace with doc service middlewares or wrap the CM somewhow
  // const { provider } = strapi.plugins.upload;
  // const isPrivate = await provider.isPrivate();
  // // We only need to sign the file urls if the provider is private
  // if (!isPrivate) {
  //   return;
  // }
  // strapi.get('services').extend('plugin::content-manager.entity-manager', (entityManager: any) => {
  //   /**
  //    * Map entity manager responses to sign private media URLs
  //    * @param {Object} entity
  //    * @param {string} uid
  //    * @returns
  //    */
  //   const mapEntity = async (entity, uid) => {
  //     const mappedEntity = await entityManager.mapEntity(entity, uid);
  //     return signEntityMedia(mappedEntity, uid);
  //   };
  //   return { ...entityManager, mapEntity };
  // });
};

export { addSignedFileUrlsToAdmin, signEntityMedia };

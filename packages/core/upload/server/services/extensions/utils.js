'use strict';

const { mapAsync, traverseEntity } = require('@strapi/utils');
const { getService } = require('../../utils');

/**
 * Visitor function to sign media URLs
 * @param {Object} schema
 * @param {string} schema.key - The key of the attribute
 * @param {string} schema.value - The value of the attribute
 * @param {Object} schema.attribute - The attribute definition
 * @param {Object} entry
 * @param {Function} entry.set - The set function to update the value
 */
const signEntityMediaVisitor = async ({ key, value, attribute }, { set }) => {
  const { signFileUrls } = getService('file');

  if (!value || attribute.type !== 'media') {
    return;
  }

  // If the attribute is repeatable sign each file
  if (attribute.multiple) {
    const signedFiles = await mapAsync(value, signFileUrls);
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
const signEntityMedia = async (entity, uid) => {
  const model = strapi.getModel(uid);
  return traverseEntity(signEntityMediaVisitor, { schema: model }, entity);
};

module.exports = {
  signEntityMedia,
};

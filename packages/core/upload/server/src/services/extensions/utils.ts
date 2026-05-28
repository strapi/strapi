import { async, traverseEntity } from '@strapi/utils';

import type { Schema, UID } from '@strapi/types';

import { getService } from '../../utils';
import { FILE_MODEL_UID } from '../../constants';

import type { File } from '../../types';

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

// Richtext can embed upload URLs as markdown images, markdown links, or HTML
// img/anchor tags. Capturing all four is provider-agnostic — works for local
// /uploads/, S3 buckets, MinIO, or any custom endpoint. The DB lookup below
// filters out URLs that don't correspond to a tracked file.
const MARKDOWN_IMG_REGEX = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
const MARKDOWN_LINK_REGEX = /(?<!!)\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
const HTML_IMG_SRC_REGEX = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
const HTML_ANCHOR_HREF_REGEX = /<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi;

/**
 * Re-signs upload provider URLs found within text/richtext/blocks content.
 * This handles the case where signed S3 URLs are embedded in richtext fields
 * and expire after the signing period.
 */
const signUrlsInText = async (text: string): Promise<string> => {
  const { provider } = strapi.plugins.upload;
  const isPrivate = await provider.isPrivate();

  if (!isPrivate || !text) {
    return text;
  }

  // Extract candidate URLs from markdown and HTML embeds; the DB lookup below
  // filters out anything that isn't actually an uploaded file.
  const urls = [
    ...Array.from(text.matchAll(MARKDOWN_IMG_REGEX), (m) => m[1]),
    ...Array.from(text.matchAll(MARKDOWN_LINK_REGEX), (m) => m[1]),
    ...Array.from(text.matchAll(HTML_IMG_SRC_REGEX), (m) => m[1]),
    ...Array.from(text.matchAll(HTML_ANCHOR_HREF_REGEX), (m) => m[1]),
  ];
  if (urls.length === 0) {
    return text;
  }

  // Deduplicate URLs to avoid signing the same URL multiple times
  const uniqueUrls = [...new Set(urls)];

  // Look up files by URL and generate signed URLs
  let result = text;
  for (const url of uniqueUrls) {
    // Strip any existing query params (signed URL params) to find the base URL
    const baseUrl = url.split('?')[0];

    // Find the file in the database by matching the URL or hash
    const files = await strapi.db.query(FILE_MODEL_UID).findMany({
      where: {
        $or: [
          { url: baseUrl },
          { url: { $contains: baseUrl.split('/').pop() } },
        ],
      },
      limit: 1,
    });

    if (files.length === 0) {
      continue;
    }

    const file = files[0] as File;
    try {
      const signedUrl = await provider.getSignedUrl(file);
      if (signedUrl?.url) {
        // Replace all occurrences of this URL (including any old signed params)
        // Match the base path portion and replace including any query string
        const escapedBase = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const urlPattern = new RegExp(`${escapedBase}(\\?[^\\s"'<>)]*)?`, 'g');
        result = result.replace(urlPattern, signedUrl.url);
      }
    } catch {
      // If signing fails, leave the URL as-is
    }
  }

  return result;
};

/**
 * Recursively re-signs URLs in blocks-type content (Strapi's structured blocks editor).
 * Blocks content is a JSON structure with nested children that may contain image URLs.
 */
const signUrlsInBlocks = async (blocks: any[]): Promise<any[]> => {
  const { provider } = strapi.plugins.upload;
  const isPrivate = await provider.isPrivate();

  if (!isPrivate || !Array.isArray(blocks)) {
    return blocks;
  }

  const processNode = async (node: any): Promise<any> => {
    if (!node || typeof node !== 'object') {
      return node;
    }

    // Handle image nodes in blocks
    if (node.type === 'image' && node.image?.url) {
      const file = node.image as File;
      try {
        const { signFileUrls } = getService('file');
        const signedFile = await signFileUrls(file);
        return { ...node, image: signedFile };
      } catch {
        return node;
      }
    }

    // Recursively process children
    if (Array.isArray(node.children)) {
      return {
        ...node,
        children: await async.map(node.children, processNode),
      };
    }

    return node;
  };

  return async.map(blocks, processNode);
};

/**
 * Visitor function to sign media URLs in entity attributes.
 * Handles media fields, richtext fields with embedded image URLs,
 * and blocks fields with image nodes.
 */
const signEntityMediaVisitor: SignEntityMediaVisitor = async (
  { key, value, attribute },
  { set }
) => {
  const { signFileUrls } = getService('file');

  if (!attribute) {
    return;
  }

  // Handle media-type attributes (existing behavior)
  if (attribute.type === 'media') {
    if (isFile(value, attribute)) {
      if (attribute.multiple) {
        const signedFiles = await async.map(value, signFileUrls);
        set(key, signedFiles);
        return;
      }

      const signedFile = await signFileUrls(value);
      set(key, signedFile);
    }
    return;
  }

  // Handle richtext attributes — re-sign embedded upload URLs in markdown/HTML
  if (attribute.type === 'richtext' && typeof value === 'string' && value.length > 0) {
    const signedText = await signUrlsInText(value);
    if (signedText !== value) {
      set(key, signedText);
    }
    return;
  }

  // Handle blocks attributes — re-sign image nodes
  if (attribute.type === 'blocks' && Array.isArray(value)) {
    const signedBlocks = await signUrlsInBlocks(value);
    set(key, signedBlocks);
  }
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
  if (!entity) {
    return entity;
  }

  // If the entity itself is a file, sign it directly
  if (uid === FILE_MODEL_UID) {
    const { signFileUrls } = getService('file');
    return signFileUrls(entity);
  }

  // If the entity is a regular content type, look for media attributes
  const model = strapi.getModel(uid);
  return traverseEntity(
    // @ts-expect-error - FIXME: fix traverseEntity using wrong types
    signEntityMediaVisitor,
    { schema: model, getModel: strapi.getModel.bind(strapi) },
    entity
  );
};

export { signEntityMedia, signUrlsInText, signUrlsInBlocks };

import path from 'path';

import { async, traverseEntity } from '@strapi/utils';

import type { Schema, UID } from '@strapi/types';

import { getService } from '../../utils';
import { FILE_MODEL_UID } from '../../constants';

import type { Config, File } from '../../types';

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

/**
 * URL bearing syntaxes found in a richtext (markdown) value. Each pattern
 * captures a prefix (group 1) and the URL (group 2) so the rebuild loop in
 * `mapRichtextUrls` can splice a new URL in place without touching anything
 * else.
 *
 * - markdown image / link: `![alt](url)` or `[text](url)`. The URL is captured
 *   up to the first whitespace or closing parenthesis, which also covers the
 *   optional title form `[text](url "title")`.
 * - raw HTML `src` / `href` attributes, double or single quoted, on the
 *   elements the editor lets users write by hand (`<img src="..." width="200">`
 *   is the usual way to size an image).
 */
const RICHTEXT_URL_REGEXES = [
  /(!?\[[^\]]*\]\()([^)\s]+)/g,
  /(<(?:img|a|source|video|audio)\b[^>]*?\b(?:src|href)=")([^"]+)/gi,
  /(<(?:img|a|source|video|audio)\b[^>]*?\b(?:src|href)=')([^']+)/gi,
];

/** Cheap short circuit for richtext values that cannot contain a URL we would rewrite. */
const RICHTEXT_URL_HINTS = ['](', 'src=', 'href='];

type BlocksNode = {
  type?: string;
  image?: File;
  children?: unknown;
  [key: string]: unknown;
};

function isFile(value: unknown, attribute: Schema.Attribute.AnyAttribute): value is File {
  if (!value || attribute.type !== 'media') {
    return false;
  }

  return true;
}

const stripQueryString = (url: string) => url.split('?')[0];

/**
 * Build the minimal file shape `signFileUrls` needs out of a bare URL, as found
 * in a richtext value. `hash` and `ext` come from the last path segment, which
 * is how the providers rebuild the object key.
 *
 * This reproduces the S3 key for the default layout and for the `rootPath`
 * provider option (the provider prefixes it itself). It does not reproduce the
 * key of a file uploaded with a per-file `path` segment (`file.path`, set from
 * the upload payload): the provider is then asked for a key that does not
 * exist and, as for any URL it does not own, returns the URL unchanged, so the
 * richtext keeps whatever was stored.
 */
const getFileFromUrl = (url: string): File => {
  const unsignedUrl = stripQueryString(url);
  const { provider } = strapi.config.get<Config>('plugin::upload');
  const { name, ext } = path.parse(unsignedUrl.split('/').pop() ?? '');

  return { url: unsignedUrl, hash: name, ext, provider } as File;
};

/**
 * Signs a richtext URL if the configured provider owns it, otherwise `null`.
 *
 * Ownership is decided by whether the provider changed the URL: `signFileUrls`
 * flags every file of the configured provider as signed, but the provider
 * itself returns URLs it does not own untouched (an S3 URL from another
 * bucket, an external site, a local `/uploads` path), so a changed URL is the
 * only reliable signal. The comparison is made against the unsigned form since
 * `getFileFromUrl` strips the query string before asking the provider. A single
 * predicate means the read path (sign) and the write path (unsign) can never
 * disagree about what they own.
 */
const signIfOwned = async (url: string): Promise<string | null> => {
  const { signFileUrls } = getService('file');
  const unsignedUrl = stripQueryString(url);
  const signedFile = await signFileUrls(getFileFromUrl(url));

  return signedFile.url && signedFile.url !== unsignedUrl ? signedFile.url : null;
};

/** Returns a richtext URL with its signature query string removed, if we own it. */
const stripSignedUrl = async (url: string) =>
  (await signIfOwned(url)) === null ? url : stripQueryString(url);

/** Returns a freshly signed richtext URL, if we own it. */
const signUrl = async (url: string) => (await signIfOwned(url)) ?? url;

/**
 * Apply `mapUrl` to every markdown image / link URL and every raw HTML
 * `src` / `href` URL of a richtext value.
 */
const mapRichtextUrls = async (value: unknown, mapUrl: (url: string) => Promise<string>) => {
  if (typeof value !== 'string' || !RICHTEXT_URL_HINTS.some((hint) => value.includes(hint))) {
    return value;
  }

  // The rebuild loop splices by match index, so matches must be in ascending order
  const matches = RICHTEXT_URL_REGEXES.flatMap((regex) => Array.from(value.matchAll(regex))).sort(
    (a, b) => (a.index as number) - (b.index as number)
  );

  if (matches.length === 0) {
    return value;
  }

  const urls: string[] = await async.map(matches, (match: RegExpMatchArray) => mapUrl(match[2]));

  let result = '';
  let cursor = 0;

  matches.forEach((match, index) => {
    const urlStart = (match.index as number) + match[1].length;

    // Two patterns matched overlapping text: keep the first, never splice twice
    if (urlStart < cursor) {
      return;
    }

    result += value.slice(cursor, urlStart) + urls[index];
    cursor = urlStart + match[2].length;
  });

  return result + value.slice(cursor);
};

/**
 * Apply `mapImage` to every `image` node of a blocks value, recursively.
 * A new array is always returned, the original value is never mutated.
 */
const mapBlocksImages = async (
  value: unknown,
  mapImage: (image: File) => Promise<File>
): Promise<unknown> => {
  if (!Array.isArray(value)) {
    return value;
  }

  return async.map(value, async (node: BlocksNode) => {
    if (!node || typeof node !== 'object') {
      return node;
    }

    let result = node;

    if (node.type === 'image' && node.image) {
      result = { ...result, image: await mapImage(node.image) };
    }

    if (Array.isArray(node.children)) {
      result = { ...result, children: await mapBlocksImages(node.children, mapImage) };
    }

    return result;
  });
};

/**
 * Remove the signature from a blocks `image` node, on the file itself and on
 * every format. The node carries a full file object, so the ownership check is
 * made with it rather than with a URL derived stand in (see `signIfOwned`).
 */
const unsignImage = async (image: File) => {
  const { signFileUrls } = getService('file');

  const unsignedImage: File = { ...image, url: stripQueryString(image.url ?? '') };
  const signedFile = await signFileUrls(unsignedImage);

  // Not one of ours (different provider, external URL, public provider): the
  // provider hands the URL back unchanged, leave the node as is
  if (!signedFile.url || signedFile.url === unsignedImage.url) {
    return image;
  }

  const result: File = { ...unsignedImage };

  if (image.formats) {
    result.formats = Object.fromEntries(
      Object.entries(image.formats).map(([key, format]: [string, any]) => [
        key,
        format?.url ? { ...format, url: stripQueryString(format.url) } : format,
      ])
    );
  }

  delete result.isUrlSigned;

  return result;
};

/**
 * Visitor function to sign media URLs
 */
const signEntityMediaVisitor: SignEntityMediaVisitor = async (
  { key, value, attribute },
  { set }
) => {
  const { signFileUrls } = getService('file');

  if (!attribute) {
    return;
  }

  switch (attribute.type) {
    case 'blocks':
      set(key, await mapBlocksImages(value, signFileUrls));
      return;

    case 'richtext':
      set(key, await mapRichtextUrls(value, signUrl));
      return;

    case 'media': {
      if (isFile(value, attribute)) {
        // If the attribute is repeatable sign each file
        if (attribute.multiple) {
          const signedFiles = await async.map(value, signFileUrls);
          set(key, signedFiles);
          return;
        }

        // If the attribute is not repeatable only sign a single file
        const signedFile = await signFileUrls(value);
        set(key, signedFile);
      }
      break;
    }

    default:
      break;
  }
};

/**
 * Visitor function to remove the signature from richtext / blocks URLs before
 * they are persisted. Media attributes are left alone: the files table already
 * holds the unsigned URL.
 */
const unsignEntityMediaVisitor: SignEntityMediaVisitor = async (
  { key, value, attribute },
  { set }
) => {
  if (!attribute) {
    return;
  }

  if (attribute.type === 'blocks') {
    set(key, await mapBlocksImages(value, unsignImage));
    return;
  }

  if (attribute.type === 'richtext') {
    set(key, await mapRichtextUrls(value, stripSignedUrl));
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

/**
 * Iterate through the input data of a create / update and replace every signed
 * provider URL found in a richtext or blocks attribute with its unsigned form,
 * so that a short lived signature is never persisted.
 */
const unsignEntityMedia = async (data: any, uid: UID.Schema) => {
  if (!data || uid === FILE_MODEL_UID) {
    return data;
  }

  const model = strapi.getModel(uid);

  return traverseEntity(
    // @ts-expect-error - FIXME: fix traverseEntity using wrong types
    unsignEntityMediaVisitor,
    { schema: model, getModel: strapi.getModel.bind(strapi) },
    data
  );
};

export {
  signEntityMedia,
  unsignEntityMedia,
  mapRichtextUrls,
  mapBlocksImages,
  stripSignedUrl,
  unsignImage,
};

import path from 'path';

import { omit } from 'lodash/fp';
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
 * One presign per distinct URL, keyed by the bare (unsigned) URL. The promise
 * is stored rather than its result so concurrent occurrences of the same URL
 * (the `async.map` in `mapRichtextUrls`, or several entries of a `findMany`)
 * share a single provider call.
 *
 * A cache must never outlive the document service call or migration run that
 * created it: a signed URL is only as fresh as the request that produced it.
 */
type SignCache = Map<string, Promise<string | null>>;

const createSignCache = (): SignCache => new Map();

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

type ImageFormat = { url?: string; isUrlSigned?: boolean; [key: string]: unknown };

function isFile(value: unknown, attribute: Schema.Attribute.AnyAttribute): value is File {
  if (!value || attribute.type !== 'media') {
    return false;
  }

  return true;
}

const stripQueryString = (url: string) => url.split('?')[0];

const decodeQueryParamName = (pair: string) => {
  const name = pair.split('=')[0];

  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
};

/**
 * Split a URL into what precedes the `?`, the raw `key=value` pairs of its
 * query string and the `#fragment`, if any. Plain string work on purpose:
 * `new URL` throws on the relative `/uploads/...` paths a local provider
 * writes, and would re-encode the pairs we want to hand back untouched.
 */
const splitUrl = (url: string) => {
  const hashIndex = url.indexOf('#');
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex);
  const withoutFragment = hashIndex === -1 ? url : url.slice(0, hashIndex);

  const queryIndex = withoutFragment.indexOf('?');

  if (queryIndex === -1) {
    return { base: withoutFragment, pairs: [] as string[], fragment };
  }

  return {
    base: withoutFragment.slice(0, queryIndex),
    pairs: withoutFragment
      .slice(queryIndex + 1)
      .split('&')
      .filter(Boolean),
    fragment,
  };
};

/** Names of the query parameters of `url`, decoded, in order. */
const getQueryParamNames = (url: string): string[] => splitUrl(url).pairs.map(decodeQueryParamName);

/**
 * `url` with every query parameter whose name is in `names` removed. The
 * surviving pairs keep their order and encoding; the `?` is dropped when
 * nothing is left.
 */
const removeQueryParams = (url: string, names: string[]): string => {
  const { base, pairs, fragment } = splitUrl(url);

  if (pairs.length === 0 || names.length === 0) {
    return url;
  }

  const kept = pairs.filter((pair) => !names.includes(decodeQueryParamName(pair)));

  return kept.length === 0 ? `${base}${fragment}` : `${base}?${kept.join('&')}${fragment}`;
};

/**
 * Build the minimal file shape `signFileUrls` needs out of a bare URL, as found
 * in a richtext value.
 *
 * `hash` and `ext` are taken from the last path segment and `path` is left
 * unset, which rebuilds the S3 key for the default layout and for the
 * `rootPath` provider option (the provider prefixes it itself). A URL whose key
 * has extra segments (a file uploaded with the per-file `path` option, or an
 * older key layout) is still recognised as ours by the provider, but it is
 * signed with a key that does not exist and the link returns 403. Media
 * signing has the same limit because `path` is not persisted on the file
 * (`content-types/file.ts`). Not addressed here.
 */
const getFileFromUrl = (url: string): File => {
  const unsignedUrl = stripQueryString(url);
  const { provider } = strapi.config.get<Config>('plugin::upload');
  const { name, ext } = path.parse(unsignedUrl.split('/').pop() ?? '');

  return { url: unsignedUrl, hash: name, ext, provider } as File;
};

/**
 * Ask the provider to sign `file` and return the signed URL if the provider
 * owns it, otherwise `null`. Memoised in `cache` by the bare URL.
 *
 * Ownership is decided by whether the provider changed the URL: `signFileUrls`
 * flags every file of the configured provider as signed, but the provider
 * itself returns URLs it does not own untouched (an S3 URL from another
 * bucket, an external site, a local `/uploads` path), so a changed URL is the
 * only reliable signal. `file.url` must already be the bare URL so the
 * comparison is meaningful.
 */
const signFileIfOwned = (file: File, cache: SignCache): Promise<string | null> => {
  const bareUrl = file.url ?? '';
  const cached = cache.get(bareUrl);

  if (cached) {
    return cached;
  }

  const pending = (async () => {
    const { signFileUrls } = getService('file');
    const signedFile = await signFileUrls(file);

    return signedFile.url && signedFile.url !== bareUrl ? signedFile.url : null;
  })();

  cache.set(bareUrl, pending);

  return pending;
};

/**
 * Signs a richtext URL if the configured provider owns it, otherwise `null`.
 * See `signFileIfOwned` for how ownership is decided. A single predicate means
 * the read path (sign) and the write path (unsign) can never disagree about
 * what they own.
 */
const signIfOwned = (url: string, cache: SignCache): Promise<string | null> =>
  signFileIfOwned(getFileFromUrl(url), cache);

/**
 * Returns a richtext URL with its signature removed, if we own it.
 *
 * Only the query parameters the provider's own fresh signature introduces are
 * removed (for S3, the `X-Amz-*` family), every other parameter is kept. That
 * way a provider that signs whatever it is handed cannot make us drop `?v=x`
 * from a link to an external site. A parameter of an old signature that the
 * fresh one no longer carries (an `X-Amz-Security-Token` from credentials no
 * longer in use, say) survives in the row; it is not a signature, and the read
 * path replaces the whole URL with the provider output anyway.
 */
const stripSignedUrl = async (url: string, cache: SignCache) => {
  // Nothing to strip, and no reason to ask the provider
  if (!url.includes('?')) {
    return url;
  }

  const signedUrl = await signIfOwned(url, cache);

  if (signedUrl === null) {
    return url;
  }

  return removeQueryParams(url, getQueryParamNames(signedUrl));
};

/** Returns a freshly signed richtext URL, if we own it. */
const signUrl = async (url: string, cache: SignCache) => (await signIfOwned(url, cache)) ?? url;

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

const getImageFormats = (image: File): [string, ImageFormat][] =>
  Object.entries(image.formats ?? {}) as [string, ImageFormat][];

/** True when the node still carries anything `unsignImage` would remove. */
const hasSignatureTraces = (image: File) => {
  if (image.isUrlSigned !== undefined || (image.url ?? '').includes('?')) {
    return true;
  }

  return getImageFormats(image).some(
    ([, format]) => format?.isUrlSigned !== undefined || (format?.url ?? '').includes('?')
  );
};

/**
 * Remove the signature from a blocks `image` node: the signature parameters on
 * the file URL and on every format URL (the same presigner signs them all, so
 * the same parameter names apply), and the `isUrlSigned` flag `signFileUrls`
 * sets on the file and on each format. The node carries a full file object, so
 * the ownership check is made with it rather than with a URL derived stand in.
 */
const unsignImage = async (image: File, cache: SignCache = createSignCache()) => {
  // Already bare: nothing to do, and no reason to ask the provider
  if (!hasSignatureTraces(image)) {
    return image;
  }

  const bareUrl = stripQueryString(image.url ?? '');
  const signedUrl = await signFileIfOwned({ ...image, url: bareUrl }, cache);

  // Not one of ours (different provider, external URL, public provider): the
  // provider hands the URL back unchanged, leave the node as is
  if (signedUrl === null) {
    return image;
  }

  const names = getQueryParamNames(signedUrl);
  const result: File = omit(['isUrlSigned'], {
    ...image,
    url: removeQueryParams(image.url ?? '', names),
  });

  if (image.formats) {
    result.formats = Object.fromEntries(
      getImageFormats(image).map(([key, format]) => [
        key,
        format && typeof format === 'object'
          ? omit(['isUrlSigned'], {
              ...format,
              ...(format.url ? { url: removeQueryParams(format.url, names) } : {}),
            })
          : format,
      ])
    );
  }

  return result;
};

/**
 * Visitor function to sign media URLs
 */
const createSignEntityMediaVisitor =
  (cache: SignCache): SignEntityMediaVisitor =>
  async ({ key, value, attribute }, { set }) => {
    const { signFileUrls } = getService('file');

    if (!attribute) {
      return;
    }

    switch (attribute.type) {
      case 'blocks':
        set(key, await mapBlocksImages(value, signFileUrls));
        return;

      case 'richtext':
        set(key, await mapRichtextUrls(value, (url) => signUrl(url, cache)));
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
const createUnsignEntityMediaVisitor =
  (cache: SignCache): SignEntityMediaVisitor =>
  async ({ key, value, attribute }, { set }) => {
    if (!attribute) {
      return;
    }

    if (attribute.type === 'blocks') {
      set(key, await mapBlocksImages(value, (image) => unsignImage(image, cache)));
      return;
    }

    if (attribute.type === 'richtext') {
      set(key, await mapRichtextUrls(value, (url) => stripSignedUrl(url, cache)));
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
 * @param {Map} cache one per document service call, see `SignCache`
 * @returns
 */
const signEntityMedia = async (
  entity: any,
  uid: UID.Schema,
  cache: SignCache = createSignCache()
) => {
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
    createSignEntityMediaVisitor(cache),
    { schema: model, getModel: strapi.getModel.bind(strapi) },
    entity
  );
};

/**
 * Iterate through the input data of a create / update / clone and replace
 * every signed provider URL found in a richtext or blocks attribute with its
 * unsigned form, so that a short lived signature is never persisted.
 */
const unsignEntityMedia = async (
  data: any,
  uid: UID.Schema,
  cache: SignCache = createSignCache()
) => {
  if (!data || uid === FILE_MODEL_UID) {
    return data;
  }

  const model = strapi.getModel(uid);

  return traverseEntity(
    // @ts-expect-error - FIXME: fix traverseEntity using wrong types
    createUnsignEntityMediaVisitor(cache),
    { schema: model, getModel: strapi.getModel.bind(strapi) },
    data
  );
};

export type { SignCache };

export {
  createSignCache,
  signEntityMedia,
  unsignEntityMedia,
  mapRichtextUrls,
  mapBlocksImages,
  stripSignedUrl,
  unsignImage,
};

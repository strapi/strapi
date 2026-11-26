import type { Core } from '@strapi/types';

import type { ILink } from '../../../../../types';

/**
 * joinColumn relations (e.g. i18n `localizations`) store `document_id` on the
 * inverse side. Export emits that value as a string ref; restore must not run it
 * through the numeric id mapper.
 */
export const isDocumentIdJoinColumnTarget = (
  strapi: Core.Strapi,
  link: ILink,
  side: 'left' | 'right'
): boolean => {
  if (side !== 'right') {
    return false;
  }

  const metadata = strapi.db?.metadata?.get(link.left.type);
  const attribute = metadata?.attributes?.[link.left.field];

  if (!attribute || attribute.type !== 'relation') {
    return false;
  }

  if (!('joinColumn' in attribute) || !attribute.joinColumn) {
    return false;
  }

  return attribute.joinColumn.referencedColumn === 'document_id';
};

export const resolveLinkRef = (
  strapi: Core.Strapi,
  link: ILink,
  side: 'left' | 'right',
  mapID: (uid: string, id: number) => number | undefined
): number | string | undefined => {
  const { type, ref } = side === 'left' ? link.left : link.right;

  if (isDocumentIdJoinColumnTarget(strapi, link, side)) {
    return ref;
  }

  const numericRef = typeof ref === 'number' ? ref : Number(ref);

  if (!Number.isFinite(numericRef)) {
    return undefined;
  }

  return mapID(type, numericRef);
};

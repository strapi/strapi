import { PUBLICATION_STATES } from '../RelationInputDataManager';

import { getRelationLink } from './getRelationLink';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import type { Attribute } from '@strapi/types';

export interface NormalizeRelationArgs {
  shouldAddLink: boolean;
  mainFieldName: string;
  targetModel: string;
}

export type NormalizedRelation = Contracts.Relations.RelationResult & {
  href?: string;
  mainField: string;
  publicationState?: false | 'published' | 'draft';
};

export const normalizeRelation = (
  relation: Contracts.Relations.RelationResult,
  { shouldAddLink, mainFieldName, targetModel }: NormalizeRelationArgs
) => {
  const nextRelation: NormalizedRelation = {
    ...relation,
    // @ts-expect-error – TODO: fix why this want's it to be an attribute as opposed to a string.
    mainField: relation[mainFieldName],
  };

  if (shouldAddLink) {
    nextRelation.href = getRelationLink(targetModel, nextRelation.id);
  }

  nextRelation.publicationState = false;

  if (nextRelation?.publishedAt !== undefined) {
    nextRelation.publicationState = nextRelation.publishedAt
      ? PUBLICATION_STATES.PUBLISHED
      : PUBLICATION_STATES.DRAFT;
  }

  return nextRelation;
};

/*
 * Applies some transformations to existing and new relations in order to display them correctly
 * relations: raw relations data coming from useRelations
 * shouldAddLink: comes from generateRelationQueryInfos, if true we display a link to the relation (TO FIX: explanation)
 * mainFieldName: name of the main field inside the relation (e.g. text field), if no displayable main field exists (e.g. date field) we use the id of the entry
 * targetModel: the model on which the relation is based on, used to create an URL link
 */

export const normalizeRelations = (
  relations: Contracts.Relations.RelationResult[],
  args: NormalizeRelationArgs
) => {
  return [...relations].map((relation) => normalizeRelation(relation, args));
};

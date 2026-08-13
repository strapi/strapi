import type { PublicationFilterMode } from '@strapi/utils';

export type Kind = 'draft' | 'published';

export type { PublicationFilterMode };

export type Param = {
  status?: Kind | undefined;
  /** @deprecated Use `publicationFilter` instead (`never-published`, `has-published-version`, …). */
  hasPublishedVersion?: boolean | undefined;
};

export type PublicationFilterParam = { publicationFilter?: PublicationFilterMode | undefined };

export type Kind = 'draft' | 'published';

export type PublicationFilterMode =
  | 'never-published'
  | 'has-published-version'
  | 'modified'
  | 'unmodified'
  | 'never-published-document'
  | 'has-published-version-document'
  | 'published-without-draft'
  | 'published-with-draft';

export type Param = {
  status?: Kind;
  /** @deprecated Use `publicationFilter` instead (`never-published`, `has-published-version`, …). */
  hasPublishedVersion?: boolean;
};

export type PublicationFilterParam = { publicationFilter?: PublicationFilterMode };

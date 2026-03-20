export type Kind = 'draft' | 'published';

export type PublicationFilterMode =
  | 'never-published'
  | 'has-published-version'
  | 'modified'
  | 'unmodified';

export type Param = { status?: Kind };

export type PublicationFilterParam = { publicationFilter?: PublicationFilterMode };

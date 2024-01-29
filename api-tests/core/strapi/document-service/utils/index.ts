import { Attribute, Entity } from '@strapi/strapi';

export const AUTHOR_UID = 'api::author.author';
export type Author = Attribute.GetAll<typeof AUTHOR_UID> & { documentId: string; id: number };

export const ARTICLE_UID = 'api::article.article';
export type Article = Attribute.GetAll<typeof ARTICLE_UID> & { documentId: string; id: number };

export const CATEGORY_UID = 'api::category.category';
export type Category = Attribute.GetValues<
  typeof CATEGORY_UID,
  Attribute.GetNonPopulatableKeys<typeof CATEGORY_UID>
> & {
  documentId?: string;
  id?: Entity.ID;
};

export const findArticleDb = async (where: any) => {
  const article = (await strapi.query(ARTICLE_UID).findOne({ where })) as Article | undefined;
  return switchIdForDocumentId(article);
};

export const findArticlesDb = async (where: any) => {
  const articles = (await strapi.query(ARTICLE_UID).findMany({ where })) as Article[];
  return articles.map(switchIdForDocumentId);
};

export const findPublishedArticlesDb = async (documentId) => {
  return findArticlesDb({ documentId, publishedAt: { $notNull: true } });
};

export const findAuthorDb = async (where: any) => {
  const author = (await strapi.query(AUTHOR_UID).findOne({ where })) as Author | undefined;
  return switchIdForDocumentId(author);
};

export const findAuthorsDb = async (where: any) => {
  const authors = (await strapi.query(AUTHOR_UID).findMany({ where })) as Author[];
  return authors.map(switchIdForDocumentId);
};

export const findPublishedAuthorsDb = async (documentId) => {
  return findAuthorsDb({ documentId, publishedAt: { $notNull: true } });
};

export const switchIdForDocumentId = <T extends Record<string, any>>(
  output: T
): Omit<T, 'documentId' | 'id'> & { id: string } => {
  if (!output) return output as any;
  const { id, documentId, ...rest } = output;
  return { ...rest, id: documentId };
};

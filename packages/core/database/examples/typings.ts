type ID = number | string;

interface Category {
  id: ID;
  title: string;
}

interface Article {
  id: ID;
  title: string;
  category: Category | ID;
}

declare module '@strapi/strapi' {
  interface StrapiModels {
    article: Article;
    category: Category;
  }
}


import type { Schema, Struct } from '@strapi/strapi';

// Application schemas as type generation writes them with strict types, whatever the license it
// boots with: without licensed attributes. Review workflows extends the article only: the other two
// are hidden from the content manager or opt out of stages.
interface ApiArticleArticle extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: { displayName: 'Article'; pluralName: 'articles'; singularName: 'article' };
  options: { draftAndPublish: true };
  attributes: { title: Schema.Attribute.String & Schema.Attribute.Required };
}

interface ApiHiddenHidden extends Struct.CollectionTypeSchema {
  collectionName: 'hiddens';
  info: { displayName: 'Hidden'; pluralName: 'hiddens'; singularName: 'hidden' };
  options: { draftAndPublish: false };
  pluginOptions: { 'content-manager': { visible: false } };
  attributes: { label: Schema.Attribute.String };
}

interface ApiNoteNote extends Struct.CollectionTypeSchema {
  collectionName: 'notes';
  info: { displayName: 'Note'; pluralName: 'notes'; singularName: 'note' };
  options: { draftAndPublish: false; noStageAttribute: true };
  attributes: { body: Schema.Attribute.Text };
}

declare global {
  namespace Strapi {
    namespace Registries {
      interface AppContentTypeSchemas {
        'api::article.article': ApiArticleArticle;
        'api::hidden.hidden': ApiHiddenHidden;
        'api::note.note': ApiNoteNote;
      }
    }
  }
}

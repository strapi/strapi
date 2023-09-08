import type { Schema, Attribute } from '@strapi/strapi';

export interface ApiBarBar extends Schema.CollectionType {
  collectionName: 'bars';
  info: {
    singularName: 'bar';
    pluralName: 'bars';
    displayName: 'Bar';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    baz: Attribute.String;
    foo: Attribute.Relation<'api::bar.bar', 'manyToOne', 'api::foo.foo'>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::bar.bar', 'oneToOne', 'admin::user'> & Attribute.Private;
    updatedBy: Attribute.Relation<'api::bar.bar', 'oneToOne', 'admin::user'> & Attribute.Private;
  };
}

export interface ApiFooFoo extends Schema.CollectionType {
  collectionName: 'foos';
  info: {
    singularName: 'foo';
    pluralName: 'foos';
    displayName: 'foo';
    description: '';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    bar: Attribute.String;
    bars: Attribute.Relation<'api::foo.foo', 'oneToMany', 'api::bar.bar'>;
    repeatable: Attribute.Component<'test.component', true>;
    createdAt: Attribute.DateTime;
    updatedAt: Attribute.DateTime;
    publishedAt: Attribute.DateTime;
    createdBy: Attribute.Relation<'api::foo.foo', 'oneToOne', 'admin::user'> & Attribute.Private;
    updatedBy: Attribute.Relation<'api::foo.foo', 'oneToOne', 'admin::user'> & Attribute.Private;
  };
}

export interface TestComponent extends Schema.Component {
  collectionName: 'components_test_components';
  info: {
    displayName: 'component';
  };
  attributes: {};
}

declare module '@strapi/strapi' {
  export module Shared {
    export interface ContentTypes {
      'api::bar.bar': ApiBarBar;
      'api::foo.foo': ApiFooFoo;
    }
    export interface Components {
      'test.component': TestComponent;
    }
  }
}

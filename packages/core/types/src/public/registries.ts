import type { Service, Controller, Policy, Middleware } from '../core';
import type { UID, Struct } from '../internal';
import type { Attribute } from '../schema';

export interface ContentTypesSchemas {
  [TKey: UID.ContentType]: Struct.ContentTypeSchema;
}

export interface ComponentsSchemas {
  [TKey: UID.Component]: Struct.ComponentSchema;
}

/**
 * Shared service registry
 */
export interface Services {
  [uid: UID.Service]: Service;
}

/**
 * Shared controller registry
 */
export interface Controllers {
  [uid: UID.Controller]: Controller;
}

/**
 * Shared policy registry
 */
export interface Policies {
  [uid: UID.Policy]: Policy;
}

/**
 * Shared middleware registry
 */
export interface Middlewares {
  [uid: UID.Middleware]: Middleware;
}

export interface ContentTypesSchemas {
  'api::car.car': {
    globalId: 'car';
    uid: 'api::car.car';
    kind: 'collectionType';
    modelName: 'car';
    collectionName: 'car';
    options: {};
    modelType: 'contentType';
    info: { displayName: 'Car'; singularName: 'car'; pluralName: 'car' };
    attributes: {
      name: { type: 'string' };
      brand: Attribute.OneToMany<'api::post.post'>;
      cp: Attribute.Component<'default.comp'>;
    };
  };

  'api::post.post': {
    globalId: 'post';
    uid: 'api::post.post';
    kind: 'collectionType';
    modelName: 'post';
    collectionName: 'post';
    options: {};
    modelType: 'contentType';
    info: { displayName: 'Post'; singularName: 'post'; pluralName: 'post' };
    attributes: {
      title: { type: 'string' };
      description: { type: 'string' };
      views: { type: 'float' };
      dz: Attribute.DynamicZone<['default.comp', 'default.other']>;
    };
  };
}

export interface ComponentsSchemas {
  'default.comp': {
    uid: 'default.comp';
    modelName: 'comp';
    category: 'default';
    modelType: 'component';
    globalId: 'default.comp';
    options: {};
    info: { displayName: 'Comp' };
    attributes: {
      field: { type: 'string' };
    };
  };

  'default.other': {
    uid: 'default.other';
    modelName: 'other';
    category: 'default';
    modelType: 'component';
    globalId: 'default.other';
    options: {};
    info: { displayName: 'Other' };
    attributes: {
      another: Attribute.BigInteger & Attribute.DefaultTo<'2'>;
    };
  };
}

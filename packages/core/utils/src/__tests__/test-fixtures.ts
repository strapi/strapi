import type { Model } from '../types';

/**
 * Shared test fixtures for visitor tests (validate and sanitize)
 * These models are used across multiple visitor test files to avoid duplication.
 * `satisfies Model` ensures fixtures stay in sync with the Model type (regression guard).
 */
export const adminUserModel = {
  uid: 'admin::user',
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'user', pluralName: 'users', displayName: 'User' },
  options: {},
  attributes: {
    id: { type: 'integer' },
    firstname: { type: 'string' },
    lastname: { type: 'string' },
    email: { type: 'email', private: true },
    password: { type: 'password', private: true },
    resetPasswordToken: { type: 'string', private: true },
    registrationToken: { type: 'string', private: true },
    isActive: { type: 'boolean', private: true },
    blocked: { type: 'boolean', private: true },
  },
} satisfies Model;

export const articleModel = {
  uid: 'api::article.article',
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
  options: {},
  attributes: {
    id: { type: 'integer' },
    title: { type: 'string' },
    createdBy: { type: 'relation', relation: 'oneToOne', target: 'admin::user' },
    updatedBy: { type: 'relation', relation: 'oneToOne', target: 'admin::user' },
  },
} satisfies Model;

export const models: Record<string, any> = {
  'admin::user': adminUserModel,
  'api::article.article': articleModel,
};

export const getModel = (uid: string) => models[uid];

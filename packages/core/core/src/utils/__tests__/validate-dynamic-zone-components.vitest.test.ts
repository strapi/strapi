import { describe, it, expect } from 'vitest';
import type { Struct } from '@strapi/types';
import { validateDynamicZoneComponents } from '../validate-dynamic-zone-components';

const component = (uid: string, attributes: Record<string, unknown> = {}) =>
  ({ uid, modelType: 'component', attributes }) as unknown as Struct.ComponentSchema;

const contentType = (uid: string, attributes: Record<string, unknown>) =>
  ({ uid, modelType: 'contentType', attributes }) as unknown as Struct.ContentTypeSchema;

const components = {
  'shared.inner': component('shared.inner'),
  'shared.dzonly': component('shared.dzonly'),
};

describe('validateDynamicZoneComponents', () => {
  it('does not throw when every dynamic zone component exists', () => {
    const schemas = [
      contentType('api::article.article', {
        title: { type: 'string' },
        blocks: { type: 'dynamiczone', components: ['shared.inner', 'shared.dzonly'] },
      }),
      ...Object.values(components),
    ];

    expect(() => validateDynamicZoneComponents(schemas, components)).not.toThrow();
  });

  it('throws when a content type dynamic zone references an unknown component', () => {
    const schemas = [
      contentType('api::article.article', {
        blocks: { type: 'dynamiczone', components: ['shared.inner', 'shared.missing'] },
      }),
    ];

    expect(() => validateDynamicZoneComponents(schemas, components)).toThrow(
      'Dynamic zone attribute "blocks" of "api::article.article" references an unknown component: "shared.missing"'
    );
  });

  it('throws when a component dynamic zone references an unknown component', () => {
    const schemas = [
      component('shared.outer', {
        blocks: { type: 'dynamiczone', components: ['shared.missing'] },
      }),
    ];

    expect(() => validateDynamicZoneComponents(schemas, components)).toThrow(
      'Dynamic zone attribute "blocks" of "shared.outer" references an unknown component: "shared.missing"'
    );
  });
});

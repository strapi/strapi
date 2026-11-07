import { describe, expect, it } from 'vitest';

import {
  getPermissionPaths,
  getReadParams,
  getTrackedFields,
  getTrackedValues,
  isTrackedContentType,
} from '../fields';
import { hashValue } from '../hash';

describe('hashValue', () => {
  it('does not depend on object key order', () => {
    expect(hashValue({ a: 1, b: [{ c: 2, d: 3 }] })).toBe(hashValue({ b: [{ d: 3, c: 2 }], a: 1 }));
  });

  it('treats undefined as null', () => {
    expect(hashValue(undefined)).toBe(hashValue(null));
  });

  it('hashes dates by their ISO form', () => {
    expect(hashValue(new Date('2026-10-26T00:00:00.000Z'))).toBe(
      hashValue('2026-10-26T00:00:00.000Z')
    );
  });

  it('tells different values apart', () => {
    expect(hashValue('a')).not.toBe(hashValue('b'));
    expect(hashValue(1)).not.toBe(hashValue('1'));
  });
});

describe('getTrackedFields', () => {
  it('keeps top-level content attributes, components and dynamic zones included', () => {
    expect(
      getTrackedFields({
        attributes: {
          title: { type: 'string' },
          body: { type: 'blocks' },
          price: { type: 'decimal' },
          secret: { type: 'password' },
          author: { type: 'relation' },
          cover: { type: 'media' },
          seo: { type: 'component' },
          sections: { type: 'dynamiczone' },
          createdAt: { type: 'datetime' },
          locale: { type: 'string' },
          strapi_stage: { type: 'relation' },
        },
      })
    ).toEqual(['title', 'body', 'price', 'seo', 'sections']);
  });
});

const components: Record<string, { attributes: Record<string, any> }> = {
  'shared.seo': {
    attributes: {
      metaTitle: { type: 'string' },
      image: { type: 'media' },
      social: { type: 'component', component: 'shared.social', repeatable: true },
    },
  },
  'shared.social': { attributes: { network: { type: 'string' } } },
  'blocks.quote': { attributes: { text: { type: 'text' } } },
};

const article = {
  attributes: {
    title: { type: 'string' },
    seo: { type: 'component', component: 'shared.seo' },
    sections: { type: 'dynamiczone', components: ['shared.seo', 'blocks.quote'] },
  },
};

const getComponent = (uid: string) => components[uid];

describe('getReadParams', () => {
  it('populates components and their nested components, without media', () => {
    expect(getReadParams(article, ['title', 'seo', 'sections'], getComponent)).toEqual({
      fields: ['title'],
      populate: {
        seo: { populate: { social: true } },
        sections: { on: { 'shared.seo': { populate: { social: true } }, 'blocks.quote': true } },
      },
    });
  });

  it('does not select every column when only components are read', () => {
    expect(getReadParams(article, ['seo'], getComponent).fields).toEqual(['documentId']);
  });
});

describe('getTrackedValues', () => {
  it('hashes components the same in the draft and the published version', () => {
    const draft = getTrackedValues(
      article,
      {
        seo: { id: 1, metaTitle: 'Bulbs', social: [{ id: 3, network: 'x' }] },
        sections: [{ id: 4, __component: 'blocks.quote', text: 'Plant now' }],
      },
      ['seo', 'sections'],
      getComponent
    );
    const published = getTrackedValues(
      article,
      {
        seo: { id: 7, metaTitle: 'Bulbs', social: [{ id: 9, network: 'x' }] },
        sections: [{ id: 12, __component: 'blocks.quote', text: 'Plant now' }],
      },
      ['seo', 'sections'],
      getComponent
    );

    expect(hashValue(draft.seo)).toBe(hashValue(published.seo));
    expect(hashValue(draft.sections)).toBe(hashValue(published.sections));
    expect(draft.sections).toEqual([{ __component: 'blocks.quote', text: 'Plant now' }]);
  });

  it('keeps an empty component empty', () => {
    expect(getTrackedValues(article, { seo: null }, ['seo'], getComponent)).toEqual({ seo: null });
  });
});

describe('isTrackedContentType', () => {
  it('follows API content types only', () => {
    expect(isTrackedContentType('api::article.article')).toBe(true);
    expect(isTrackedContentType('plugin::users-permissions.user')).toBe(false);
    expect(isTrackedContentType('admin::user')).toBe(false);
  });
});

describe('getPermissionPaths', () => {
  it('lists the fields inside a component, nested ones included', () => {
    expect(getPermissionPaths(article, 'seo', getComponent)).toEqual([
      'seo.metaTitle',
      'seo.image',
      'seo.social.network',
    ]);
  });

  it('names other fields, dynamic zones included, as is', () => {
    expect(getPermissionPaths(article, 'title', getComponent)).toEqual(['title']);
    expect(getPermissionPaths(article, 'sections', getComponent)).toEqual(['sections']);
  });
});

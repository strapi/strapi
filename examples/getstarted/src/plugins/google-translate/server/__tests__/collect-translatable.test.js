'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { collectFromData, toPayload } = require('../utils/collect-translatable');

const localized = (attribute) => ({
  ...attribute,
  pluginOptions: { i18n: { localized: true } },
});

describe('collectFromData', () => {
  it('collects text fields and marks richtext and the HTML editor as html', () => {
    const data = {
      title: 'Hello',
      body: '<p>Hi</p>',
      html: '<p style="color:red">Color</p>',
      slug: '   ',
    };
    const attributes = {
      title: localized({ type: 'string' }),
      body: localized({ type: 'richtext' }),
      html: localized({ type: 'customField', customField: 'plugin::html-editor.html' }),
      slug: localized({ type: 'uid' }),
    };
    const items = [];

    collectFromData(data, attributes, {}, items);

    assert.deepEqual(
      items.map((item) => ({ value: item.value, format: item.format })),
      [
        { value: 'Hello', format: 'text' },
        { value: '<p>Hi</p>', format: 'html' },
        { value: '<p style="color:red">Color</p>', format: 'html' },
      ]
    );

    items[0].apply('Bonjour');
    assert.equal(data.title, 'Bonjour');
  });

  it('skips fields that are not localized', () => {
    const data = { title: 'Hello', internal: 'Secret' };
    const attributes = {
      title: localized({ type: 'string' }),
      internal: { type: 'string', pluginOptions: { i18n: { localized: false } } },
    };
    const items = [];

    collectFromData(data, attributes, {}, items);

    assert.deepEqual(
      items.map((item) => item.value),
      ['Hello']
    );
  });

  it('walks blocks, components, and dynamic zones', () => {
    const data = {
      blocks: [{ type: 'paragraph', children: [{ type: 'text', text: 'Block copy' }] }],
      section: { label: 'Section' },
      slides: [{ caption: 'One' }, { caption: 'Two' }],
      zone: [{ __component: 'shared.note', text: 'Note' }],
    };
    const components = {
      'shared.section': { attributes: { label: localized({ type: 'string' }) } },
      'shared.slide': { attributes: { caption: localized({ type: 'text' }) } },
      'shared.note': { attributes: { text: localized({ type: 'string' }) } },
    };
    const attributes = {
      blocks: localized({ type: 'blocks' }),
      section: localized({ type: 'component', component: 'shared.section' }),
      slides: localized({ type: 'component', repeatable: true, component: 'shared.slide' }),
      zone: localized({ type: 'dynamiczone' }),
    };
    const items = [];

    collectFromData(data, attributes, components, items);

    assert.deepEqual(
      items.map((item) => item.value),
      ['Block copy', 'Section', 'One', 'Two', 'Note']
    );
  });
});

describe('toPayload', () => {
  it('drops system fields, relations, media, and non-localized attributes', () => {
    const attributes = {
      title: localized({ type: 'string' }),
      cover: localized({ type: 'media' }),
      author: localized({ type: 'relation' }),
      secret: { type: 'string', pluginOptions: { i18n: { localized: false } } },
      documentId: { type: 'string' },
    };
    const data = {
      title: 'Hello',
      cover: 1,
      author: 2,
      secret: 'nope',
      documentId: 'doc',
    };

    assert.deepEqual(toPayload(data, attributes), { title: 'Hello' });
  });
});

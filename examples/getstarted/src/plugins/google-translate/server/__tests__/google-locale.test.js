'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { toGoogleLocale } = require('../utils/google-locale');

describe('toGoogleLocale', () => {
  it('maps Strapi locale aliases to Google language codes', () => {
    assert.equal(toGoogleLocale('zh-Hans'), 'zh-CN');
    assert.equal(toGoogleLocale('zh-Hant'), 'zh-TW');
    assert.equal(toGoogleLocale('zh'), 'zh-CN');
    assert.equal(toGoogleLocale('en-GB'), 'en');
    assert.equal(toGoogleLocale('en-US'), 'en');
  });

  it('keeps regional codes Google treats as distinct languages', () => {
    assert.equal(toGoogleLocale('pt-BR'), 'pt-BR');
    assert.equal(toGoogleLocale('pt-PT'), 'pt-PT');
  });

  it('drops the region when Google uses the base language', () => {
    assert.equal(toGoogleLocale('fr-CA'), 'fr');
    assert.equal(toGoogleLocale('de-DE'), 'de');
  });

  it('returns empty values unchanged', () => {
    assert.equal(toGoogleLocale(''), '');
    assert.equal(toGoogleLocale(null), null);
    assert.equal(toGoogleLocale(undefined), undefined);
  });
});

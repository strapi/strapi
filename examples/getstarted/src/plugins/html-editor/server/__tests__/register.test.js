'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const register = require('../register');

describe('html editor register', () => {
  it('registers a richtext custom field named html', () => {
    const registered = [];
    register({
      strapi: {
        customFields: {
          register(field) {
            registered.push(field);
          },
        },
      },
    });

    assert.equal(registered.length, 1);
    assert.equal(registered[0].name, 'html');
    assert.equal(registered[0].plugin, 'html-editor');
    assert.equal(registered[0].type, 'richtext');
  });
});

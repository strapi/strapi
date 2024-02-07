'use strict';

/* eslint-disable no-template-curly-in-string */

global.strapi = {
  getModel: jest.fn().mockReturnValue({
    attributes: {
      email: { type: 'string' },
      username: { type: 'string' },
      firstName: { type: 'string' },
    },
  }),
};

const { isValidEmailTemplate } = require('../email-template');

describe('isValidEmailTemplate', () => {
  test('Accepts one valid pattern', () => {
    expect(isValidEmailTemplate('<%= CODE %>')).toBe(true);
    expect(isValidEmailTemplate('<%=CODE%>')).toBe(true);
  });

  test('Accepts user attributes', () => {
    expect(isValidEmailTemplate('<%= USER.email %>')).toBe(true);
    expect(isValidEmailTemplate('<%= USER.username %>')).toBe(true);
    expect(isValidEmailTemplate('<%= USER.firstName %>')).toBe(true);
    expect(isValidEmailTemplate('<%= USER.lastName %>')).toBe(false);
  });

  test('Refuses invalid patterns', () => {
    expect(isValidEmailTemplate('<%- CODE %>')).toBe(false);
    expect(isValidEmailTemplate('<% CODE %>')).toBe(false);
    expect(isValidEmailTemplate('<%= <% CODE %> %>')).toBe(false);
    expect(isValidEmailTemplate('<%- <% CODE %> %>')).toBe(false);
    expect(isValidEmailTemplate('${ <% CODE %> }')).toBe(false);
    expect(isValidEmailTemplate('<%CODE%>')).toBe(false);
    expect(isValidEmailTemplate('${CODE}')).toBe(false);
    expect(isValidEmailTemplate('${ CODE }')).toBe(false);
    expect(
      isValidEmailTemplate(
        '<%=`${ console.log({ "remote-execution": { "foo": "bar" }/*<>%=*/ }) }`%>'
      )
    ).toBe(false);
  });

  test('Fails on non authorized keys', () => {
    expect(isValidEmailTemplate('<% random expression %>')).toBe(false);
    expect(isValidEmailTemplate('<% random expression }%>')).toBe(false);
    expect(isValidEmailTemplate('<% some.var.azdazd %>')).toBe(false);
    expect(isValidEmailTemplate('<% function() %>')).toBe(false);
  });
});

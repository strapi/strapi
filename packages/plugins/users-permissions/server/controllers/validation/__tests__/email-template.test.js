'use strict';

const { isValidEmailTemplate } = require('../email-template');

describe('isValidEmailTemplate', () => {
  test('Accepts one valid pattern', () => {
    expect(isValidEmailTemplate('<%= CODE %>')).toBe(true);
    expect(isValidEmailTemplate('<%=CODE%>')).toBe(true);
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

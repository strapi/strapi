'use strict';

const { emailRegExp } = require('../regex');

describe('Regex definition validation', () => {
  describe('Email Regex validation against common test emails', () => {
    const validEmails = [
      'email@example.com',
      'firstname.lastname@example.com',
      'email@subdomain.example.com',
      'firstname+lastname@example.com',
      'email@[123.123.123.123]',
      '"email"@example.com',
      '1234567890@example.com',
      'email@example-one.com',
      '_______@example.com',
      'email@example.name',
      'email@example.museum',
      'email@example.co.jp',
      'firstname-lastname@example.com',
    ];

    test.each(validEmails)('<<%s>> should be a valid email against email regex', email =>
      expect(emailRegExp.test(email)).toBeTruthy()
    );

    const invalidEmails = [
      'plainaddress',
      '#@%^%#$@#$@#.com',
      '@example.com',
      'Joe Smith <email@example.com>',
      'email.example.com',
      'email@example@example.com',
      '.email@example.com',
      'email.@example.com',
      'email..email@example.com',
      'email@example.com (Joe Smith)',
      'email@example',
      'email@111.222.333.44444',
      'email@example..com',
      'Abc..123@example.com',
    ];

    test.each(invalidEmails)('<<%s>> should be an invalid email against email regex', email =>
      expect(emailRegExp.test(email)).toBeFalsy()
    );
  });
});

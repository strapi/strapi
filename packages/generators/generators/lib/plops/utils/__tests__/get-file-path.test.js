'use strict';

const getFilePath = require('../get-file-path');

describe('Get-File-Path util', () => {
  test('with destination set as api', () => {
    const filePath = getFilePath('api');
    expect(filePath).toBe(`api/{{ api }}`);
  });

  test('with destination set as plugin', () => {
    const filePath = getFilePath('plugin');
    expect(filePath).toBe(`plugins/{{ plugin }}/server`);
  });

  test('with destination set as root', () => {
    const filePath = getFilePath('root');
    expect(filePath).toBe(`./`);
  });

  test('with empty destination string', () => {
    const filePath = getFilePath('');
    expect(filePath).toBe(`api/{{ id }}`);
  });
});

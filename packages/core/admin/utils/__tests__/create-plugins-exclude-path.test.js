'use strict';

const createPluginsExcludePath = require('../create-plugins-exclude-path');

describe('createPluginsExcludePath', () => {
  test('given there are no plugins it should just return the node_modules regexp', () => {
    const result = createPluginsExcludePath([]);
    expect(result).toEqual(/node_modules/);
  });

  test('given there are only local plugins, it should just return the node_module regex', () => {
    const result = createPluginsExcludePath(['strapi/packages/core/upload']);
    expect(result).toEqual(/node_modules/);
  });

  test('given there are node_module plugins, it should return a regex with these included', () => {
    const result = createPluginsExcludePath([
      '/node_modules/strapi-plugin-custom-upload',
      '/node_modules/strapi-plugin-custom-plugin',
    ]);
    expect(result).toEqual(
      /node_modules\/(?!(strapi-plugin-custom-upload|strapi-plugin-custom-plugin))/
    );
  });

  test('given there are scoped node_module plugins, it should return a regex with these included', () => {
    const result = createPluginsExcludePath([
      '/node_modules/@scope/strapi-plugin-custom-upload',
      '/node_modules/@scope/strapi-plugin-custom-plugin',
    ]);
    expect(result).toEqual(
      /node_modules\/(?!(@scope\/strapi-plugin-custom-upload|@scope\/strapi-plugin-custom-plugin))/
    );
  });
});

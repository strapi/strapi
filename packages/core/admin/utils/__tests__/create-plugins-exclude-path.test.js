'use strict';

const { createPluginsExcludePath } = require('../create-plugins-exclude-path');

describe('createPluginsExcludePath', () => {
  test('given there are no plugins it should just return the node_modules regexp', () => {
    const result = createPluginsExcludePath([]);
    expect(result).toEqual(/node_modules/);
  });

  test('given there are plugins, it should return a regex with these included', () => {
    const result = createPluginsExcludePath([
      'strapi-plugin-custom-upload',
      'strapi-plugin-custom-plugin',
    ]);
    expect(result).toEqual(
      /node_modules\/(?!(strapi-plugin-custom-upload|strapi-plugin-custom-plugin))/
    );
  });

  test('given there are scoped plugins, it should return a regex with these included', () => {
    const result = createPluginsExcludePath([
      '@scope/strapi-plugin-custom-upload',
      '@scope/strapi-plugin-custom-plugin',
    ]);
    expect(result).toEqual(
      /node_modules\/(?!(@scope\/strapi-plugin-custom-upload|@scope\/strapi-plugin-custom-plugin))/
    );
  });
});

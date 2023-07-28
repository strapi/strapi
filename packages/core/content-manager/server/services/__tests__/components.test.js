'use strict';

const componentsService = require('../components');

const configuration = {
  test: 'value',
  some: 'config',
};

jest.mock('../configuration', () =>
  jest.fn(() => ({
    getConfiguration: jest.fn(() => configuration),
  }))
);

describe('componentService', () => {
  test('findComponent', async () => {
    const { findConfiguration } = componentsService({});

    const component = {
      uid: 'blog.test-compo',
      category: 'blog',
    };
    const result = await findConfiguration(component);

    expect(result).toEqual({ ...component, ...configuration });
  });
});

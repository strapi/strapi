import componentsService from '../components';

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
    const { findConfiguration } = componentsService({} as any);

    const component = {
      uid: 'blog.test-compo',
      category: 'blog',
    } as any;

    const result = await findConfiguration(component);

    expect(result).toEqual({ ...component, ...configuration });
  });
});

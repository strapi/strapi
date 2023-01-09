import { getStrapiFactory } from '../../__tests__/test-utils';

import bootstrap from '../bootstrap';

afterEach(() => {
  jest.clearAllMocks();
});

const strapiMockFactory = getStrapiFactory();

describe('Bootstrap', () => {
  test('registers the transfer action', async () => {
    const registerMany = jest.fn();
    const strapi = strapiMockFactory({
      service(service) {
        if (service === 'admin::permission') {
          return {
            actionProvider: {
              registerMany,
            },
          };
        }
      },
    });

    expect(registerMany).not.toHaveBeenCalled();

    await bootstrap(strapi);

    expect(registerMany).toHaveBeenCalledWith([
      {
        uid: 'transfer.push',
        displayName: 'Transfer data to the current project',
        pluginName: 'admin',
        section: 'settings',
        category: 'data management',
        subCategory: 'Data transfer',
      },
      {
        uid: 'transfer.pull',
        displayName: 'Transfer data from the current project',
        pluginName: 'admin',
        section: 'settings',
        category: 'data management',
        subCategory: 'Data transfer',
      },
    ]);
  });
});

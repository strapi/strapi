'use strict';

const workflowController = require('..');

describe('Workflows controller', () => {
  describe('checkWorkflowContentTypesPermissions', () => {
    const disallowedContentTypes = 'test';
    global.strapi = {
      plugins: {
        'content-manager': {
          services: {
            'permission-checker': {
              create: jest.fn(({ model }) => ({
                cannot: {
                  read: jest.fn(() => model === disallowedContentTypes),
                },
              })),
            },
          },
        },
      },
    };

    test('returns true if the user has permissions to read a content type', async () => {
      const res = workflowController.checkWorkflowContentTypesPermissions({}, [
        { contentTypes: ['UID'] },
        { contentTypes: ['UID1'] },
      ]);

      expect(res).toBeTruthy();
    });

    test('returns false if the user does not have permissions to read a content type', async () => {
      const res = workflowController.checkWorkflowContentTypesPermissions({}, [
        { contentTypes: [disallowedContentTypes] },
        { contentTypes: ['UID'] },
        { contentTypes: ['UID1'] },
      ]);

      expect(res).toBeFalsy();
    });
  });
});

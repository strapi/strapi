const contentTypesService = require('../ContentTypes');

describe('Test ContentTypes service', () => {
  describe('formatContentType:isManaged', () => {
    global.strapi = {
      contentTypes: {
        'managed-model': {
          uid: 'managedModel',
          modelName: 'managedModel',
          attributes: {
            sample: {
              type: 'string',
            },
          },
        },
        'non-managed-model': {
          uid: 'nonManagedModel',
          modelName: 'nonManagedModel',
          options: {
            isManaged: false,
          },
          attributes: {
            sample: {
              type: 'string',
            },
          },
        },
        'restricted-model': {
          uid: 'plugins::users-permissions.role',
          modelName: 'restrictedModel',
          attributes: {
            sample: {
              type: 'string',
            },
          },
        },
      },
    };
    test('Model should be managed by default', () => {
      const contentType = contentTypesService.formatContentType(
        global.strapi.contentTypes['managed-model']
      );

      expect(contentType.isDisplayed).toBe(true);
      expect(contentType.isManaged).toBe(true);
    });

    test("Model shouldn't be managed by definition", () => {
      const contentType = contentTypesService.formatContentType(
        global.strapi.contentTypes['non-managed-model']
      );

      expect(contentType.isDisplayed).toBe(true);
      expect(contentType.isManaged).toBe(false);
    });

    test("Model shouldn't be displayed because of being one of internal HIDDEN_CONTENT_TYPES", () => {
      const contentType = contentTypesService.formatContentType(
        global.strapi.contentTypes['restricted-model']
      );

      expect(contentType.isDisplayed).toBe(false);
      expect(contentType.isManaged).toBe(true);
    });
  });
});

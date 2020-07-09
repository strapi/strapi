const contentTypesService = require('../ContentTypes');

describe('Test ContentTypes service', () => {
  describe('formatContentType:isDisplayed', () => {
    global.strapi = {
      contentTypes: {
        'visible-model': {
          uid: 'visibleModel',
          modelName: 'visibleModel',
          attributes: {
            sample: {
              type: 'string',
            },
          },
        },
        'hidden-model': {
          uid: 'hiddenModel',
          modelName: 'hiddenModel',
          options: {
            isDisplayed: false,
          },
          attributes: {
            sample: {
              type: 'string',
            },
          },
        },
        'restricted-hidden-model': {
          uid: 'plugins::users-permissions.role',
          modelName: 'restrictedHiddenModel',
          attributes: {
            sample: {
              type: 'string',
            },
          },
        },
      },
    };
    test('Model shouldn be displayed by default', () => {
      const contentType = contentTypesService.formatContentType(
        global.strapi.contentTypes['visible-model']
      );

      expect(contentType.isDisplayed).toBe(true);
    });

    test("Model shouldn't be displayed by definition", () => {
      const contentType = contentTypesService.formatContentType(
        global.strapi.contentTypes['hidden-model']
      );

      expect(contentType.isDisplayed).toBe(false);
    });

    test("Model shouldn't be displayed because of being one of HIDDEN_CONTENT_TYPES", () => {
      const contentType = contentTypesService.formatContentType(
        global.strapi.contentTypes['restricted-hidden-model']
      );

      expect(contentType.isDisplayed).toBe(false);
    });
  });
});

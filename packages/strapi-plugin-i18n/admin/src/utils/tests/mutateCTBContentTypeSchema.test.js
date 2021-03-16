import mutateSchema, {
  addLocalisationToFields,
  disableAttributesLocalisation,
} from '../mutateCTBContentTypeSchema';

describe('i18n | utils ', () => {
  describe('mutateCTBContentTypeSchema', () => {
    it('should forward the data the pluginOptions.i18n.localized key does not exist in the content type', () => {
      const data = { pluginOptions: { test: true } };

      expect(mutateSchema(data)).toEqual(data);
    });

    it('should remove the pluginOptions.i18n key from the content type schema', () => {
      const ctSchema = {
        pluginOptions: {
          pluginA: { foo: 'bar' },
          i18n: { localized: false },
          pluginB: { foo: 'bar' },
        },
        kind: 'test',
        attributes: {
          one: {
            type: 'string',
            pluginOptions: {
              i18n: { localized: true },
            },
            required: true,
          },
          two: {
            type: 'number',
            pluginOptions: {
              pluginA: { test: true },
              i18n: { localized: true },
            },
          },
        },
      };

      const expected = {
        pluginOptions: {
          pluginA: { foo: 'bar' },
          pluginB: { foo: 'bar' },
        },
        kind: 'test',
        attributes: {
          one: {
            type: 'string',
            pluginOptions: {},
            required: true,
          },
          two: {
            type: 'number',
            pluginOptions: {
              pluginA: { test: true },
            },
          },
        },
      };

      expect(mutateSchema(ctSchema, {})).toEqual(expected);
    });

    it('should return the data if the initial schema already has i18n enabled', () => {
      const ctSchema = {
        pluginOptions: {
          pluginA: { foo: 'bar' },
          i18n: { localized: true },
          pluginB: { foo: 'bar' },
        },
        kind: 'test',
        attributes: {
          one: {
            type: 'string',
            pluginOptions: {
              i18n: { localized: true },
            },
            required: true,
          },
          two: {
            type: 'number',
            pluginOptions: {
              pluginA: { test: true },
              i18n: { localized: true },
            },
          },
        },
      };

      expect(
        mutateSchema(ctSchema, {
          schema: {
            pluginOptions: {
              pluginA: { foo: 'bar' },
              i18n: { localized: true },
              pluginB: { foo: 'bar' },
            },
          },
        })
      ).toEqual(ctSchema);
    });

    it('should set the pluginOptions.i18n.localized to true an all attributes', () => {
      const nextSchema = {
        pluginOptions: { pluginA: { ok: true }, i18n: { localized: true } },
        attributes: {
          cover: { type: 'media', pluginOptions: { pluginA: { ok: true } } },
          name: {
            type: 'text',
            pluginOptions: { pluginA: { ok: true }, i18n: { localized: false } },
          },
          price: {
            type: 'text',
          },
        },
      };
      const expected = {
        pluginOptions: { pluginA: { ok: true }, i18n: { localized: true } },
        attributes: {
          cover: {
            type: 'media',
            pluginOptions: { pluginA: { ok: true }, i18n: { localized: true } },
          },
          name: {
            type: 'text',
            pluginOptions: { pluginA: { ok: true }, i18n: { localized: true } },
          },
          price: {
            type: 'text',
            pluginOptions: { i18n: { localized: true } },
          },
        },
      };

      expect(mutateSchema(nextSchema, {})).toEqual(expected);
    });
  });

  describe('i18n addLocalisationToFields', () => {
    it('should forward the data if the attribute type is not correct', () => {
      const attributes = {
        foo: { type: 'relation' },
        bar: { type: 'custom' },
      };

      expect(addLocalisationToFields(attributes)).toEqual(attributes);
    });

    it('should keep the pluginOptions for each attribute and enable the i18n.localized value', () => {
      const attributes = {
        foo: { type: 'text', pluginOptions: { pluginA: { ok: true } }, required: true },
        bar: { type: 'text', pluginOptions: { i18n: { localized: false } } },
      };

      const expected = {
        foo: {
          type: 'text',
          pluginOptions: { pluginA: { ok: true }, i18n: { localized: true } },
          required: true,
        },
        bar: { type: 'text', pluginOptions: { i18n: { localized: true } } },
      };

      expect(addLocalisationToFields(attributes)).toEqual(expected);
    });

    it('should enable the pluginOptions.i18n.localized value for each attribute', () => {
      const attributes = {
        foo: { type: 'text', required: true },
        bar: { type: 'text' },
      };

      const expected = {
        foo: {
          type: 'text',
          pluginOptions: { i18n: { localized: true } },
          required: true,
        },
        bar: { type: 'text', pluginOptions: { i18n: { localized: true } } },
      };

      expect(addLocalisationToFields(attributes)).toEqual(expected);
    });
  });

  describe('disableAttributesLocalisation', () => {
    it('should remove the pluginOptions.i18n for all attributes', () => {
      const attributes = {
        foo: {
          type: 'text',
          pluginOptions: { pluginA: { ok: true }, i18n: { localized: true } },
          required: true,
        },
        bar: { type: 'text', pluginOptions: { i18n: { localized: true } } },
      };

      const expected = {
        foo: { type: 'text', required: true, pluginOptions: { pluginA: { ok: true } } },
        bar: { type: 'text', pluginOptions: {} },
      };

      expect(disableAttributesLocalisation(attributes)).toEqual(expected);
    });
  });
});

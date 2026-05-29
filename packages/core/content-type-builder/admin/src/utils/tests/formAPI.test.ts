import * as yup from 'yup';

import { forms } from '../../components/FormModal/forms/forms';
import { formsAPI } from '../formAPI';

describe('formsAPI', () => {
  describe('makeValidator', () => {
    it('verifies the validity of a schema', () => {
      // Arrange
      const initShape = yup.object();
      const types = {
        types: {
          contentType: {
            validators: [() => ({ i18n: yup.string().required(), other: yup.number().required() })],
          },
        },
      };
      const target = ['contentType'];

      // Act
      const schema = formsAPI.makeValidator.bind(types)(target, initShape, [
        'api::country.country',
      ]);

      // Assert
      expect(() =>
        schema.validateSync({
          pluginOptions: {},
        })
      ).toThrow('pluginOptions.other is a required field');

      expect(() =>
        schema.validateSync({
          pluginOptions: {
            other: 'string, not number',
          },
        })
      ).toThrow(
        'pluginOptions.other must be a `number` type, but the final value was: `NaN` (cast from the value `"string, not number"`).'
      );

      expect(() =>
        schema.validateSync({
          pluginOptions: {
            other: 1,
            i18n: 'valid',
          },
        })
      ).not.toThrow();
    });
  });

  describe('mutateContentTypeSchema', () => {
    it('should call the mutation with the correct arguments', () => {
      const mutation = jest.fn((data) => data);
      formsAPI.addContentTypeSchemaMutation(mutation);

      expect(formsAPI.contentTypeSchemaMutations).toHaveLength(1);

      const returnedData = formsAPI.mutateContentTypeSchema({ ok: true }, { ok: false });

      expect(mutation).toHaveBeenCalledWith({ ok: true }, { ok: false });
      expect(returnedData).toEqual({ ok: true });
    });
  });

  /**
   * extendFields advanced callbacks receive `customField` in args (built-in: falsy; custom field modal: metadata).
   * @see https://github.com/strapi/strapi/pull/22521
   */
  describe('extendFields and customField in getAdvancedForm args', () => {
    it('passes falsy customField for built-in attribute forms', () => {
      const advanced = jest.fn((_args: Record<string, unknown>) => []);

      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolateModules needs a fresh CommonJS load of the singleton
        const { formsAPI: api } = require('../formAPI');
        api.extendFields(['text'], {
          form: { advanced },
        });

        forms.attribute.form.advanced({
          data: {},
          type: 'text',
          step: '0',
          extensions: api,
          forTarget: 'contentType',
          attributes: [],
        });
      });

      expect(advanced).toHaveBeenCalled();
      const args = advanced.mock.calls[0]?.[0];
      expect(args).toBeDefined();
      expect(args).toMatchObject({
        data: {},
        type: 'text',
        step: '0',
        forTarget: 'contentType',
      });
      expect(args!.customField == null).toBe(true);
    });

    it('passes customField metadata for custom field modals', () => {
      const advanced = jest.fn((_args: Record<string, unknown>) => []);

      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires -- isolateModules needs a fresh CommonJS load of the singleton
        const { formsAPI: api } = require('../formAPI');
        const mockCustomField = {
          type: 'json',
          intlLabel: { id: 'test.cf', defaultMessage: 'Test' },
          options: { base: [], advanced: [] },
        };

        api.extendFields(['json'], {
          form: { advanced },
        });

        forms.customField.form.advanced({
          data: {},
          step: '0',
          customField: mockCustomField,
          extensions: api,
        });
      });

      expect(advanced).toHaveBeenCalled();
      const args = advanced.mock.calls[0]?.[0];
      expect(args).toBeDefined();
      expect(args!.customField).toMatchObject({
        type: 'json',
        intlLabel: { id: 'test.cf', defaultMessage: 'Test' },
      });
    });
  });
});

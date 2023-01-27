import * as yup from 'yup';
import formsAPI from '../formAPI';

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
});

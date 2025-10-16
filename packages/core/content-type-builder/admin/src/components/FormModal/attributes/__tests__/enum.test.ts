import { formsAPI } from '../../../utils/formAPI';
import { attributeTypes } from '../types';

describe('Enum validation', () => {
  describe('Reserved keywords', () => {
    const testCases = [
      {
        name: 'true',
        expectedError: true,
      },
      {
        name: 'false',
        expectedError: true,
      },
      {
        name: 'null',
        expectedError: true,
      },
      {
        name: 'undefined',
        expectedError: true,
      },
      {
        name: 'valid_enum',
        expectedError: false,
      },
    ];

    test.each(testCases)('Should $expectedError ? "reject" : "accept" enum value "$name"', async ({ name, expectedError }) => {
      const schema = attributeTypes.enumeration([], []);
      
      if (expectedError) {
        await expect(schema.validate({
          name: 'testEnum',
          type: 'enumeration',
          enum: [name],
        })).rejects.toMatchObject({
          name: 'ValidationError',
          message: expect.stringContaining('reserved GraphQL keywords'),
        });
      } else {
        await expect(schema.validate({
          name: 'testEnum',
          type: 'enumeration',
          enum: [name],
        })).resolves.toBeDefined();
      }
    });
  });
}); 
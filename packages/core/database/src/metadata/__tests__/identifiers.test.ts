import { createMetadata } from '..';
import { attributes, auxComponent, buildModelWith } from './resources/models';
import { expectedMetadataResults } from './resources/expected-metadata';
import { expectedMetadataHashedResults } from './resources/expected-hashed-metadata';
import { Identifiers } from '../../utils/identifiers';

type TestOptions = {
  auxiliarModels?: any[];
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Matchers<R> {
      toEqualMap(expected: unknown): CustomMatcherResult;
    }
  }
}

expect.extend({
  toEqualMap(received, expected) {
    // Iterate through expected map
    for (const [key, expectedValue] of expected) {
      const receivedValue = received.get(key);

      // Check if the received map contains the key
      if (!received.has(key)) {
        return {
          message: () => `expected map to contain key '${key}', but it was not found`,
          pass: false,
        };
      }

      // Use Jest's equality check to compare values for the current key
      if (!this.equals(receivedValue, expectedValue)) {
        // Generate a diff string for the first mismatch
        const diffString = this.utils.diff(expectedValue, receivedValue, {
          expand: this.expand,
        });

        return {
          message: () =>
            `expected maps to be equal, but they differ for key '${key}':\n\n${diffString}`,
          pass: false,
        };
      }
    }

    // Ensure the received map does not contain extra keys not present in the expected map
    for (const key of received.keys()) {
      if (!expected.has(key)) {
        return {
          message: () => `received map contains an unexpected key '${key}'`,
          pass: false,
        };
      }
    }

    return {
      message: () => `expected maps to be equal`,
      pass: true,
    };
  },
});

describe('metadata', () => {
  describe('createMetadata', () => {
    describe('full length identifiers', () => {
      test.each([
        ['string', attributes.simple.string, expectedMetadataResults.simple.string, {}],
        [
          'relation - One to One',
          attributes.relations.oneToOne,
          expectedMetadataResults.relations.oneToOne,
          {},
        ],
        [
          'relation - One to Many',
          attributes.relations.oneToMany,
          expectedMetadataResults.relations.oneToMany,
          {},
        ],
        [
          'relation - Many to One',
          attributes.relations.manyToOne,
          expectedMetadataResults.relations.manyToOne,
          {},
        ],
        [
          'relation - Inversed One to One',
          attributes.relations.inversedOneToOne,
          expectedMetadataResults.relations.inversedOneToOne,
          {},
        ],
        [
          'relation - Many to Many',
          attributes.relations.manyToMany,
          expectedMetadataResults.relations.manyToMany,
          {},
        ],
        [
          'component - repeatable',
          attributes.components.repeatable,
          expectedMetadataResults.components.repeatable,
          {
            auxiliarModels: [auxComponent],
          },
        ],
        [
          'component - single',
          attributes.components.single,
          expectedMetadataResults.components.single,
          {
            auxiliarModels: [auxComponent],
          },
        ],
        [
          'dynamic zone',
          attributes.components.dynamicZone,
          expectedMetadataResults.dynamicZone,
          {
            auxiliarModels: [auxComponent],
          },
        ],
        [
          'relation - Morph to Many',
          attributes.relations.morphToMany,
          expectedMetadataResults.relations.morphToMany,
          {
            auxiliarModels: [auxComponent],
          },
        ],
      ])(
        'matches expected result for %s',
        (_attributeType, modelAttributes, expectedMetadata, opts: TestOptions) => {
          const models = opts.auxiliarModels
            ? [auxComponent, buildModelWith(modelAttributes)]
            : [buildModelWith(modelAttributes)];
          // mock the options so that the 'global' identifiers created for use by createMetadata uses 0 for maxLength
          jest.spyOn(Identifiers.prototype, 'options', 'get').mockReturnValue({ maxLength: 0 });
          const results = createMetadata(models as any);

          expect(results).toBeInstanceOf(Map);
          expect(results).toEqualMap(new Map(expectedMetadata as any));
        }
      );
    });
    describe('shortened identifiers', () => {
      test.each([
        ['string', attributes.simple.string, expectedMetadataHashedResults.simple.string, {}],
        [
          'relation - One to One',
          attributes.relations.oneToOne,
          expectedMetadataHashedResults.relations.oneToOne,
          {},
        ],
        [
          'relation - One to Many',
          attributes.relations.oneToMany,
          expectedMetadataHashedResults.relations.oneToMany,
          {},
        ],
        [
          'relation - Many to One',
          attributes.relations.manyToOne,
          expectedMetadataHashedResults.relations.manyToOne,
          {},
        ],
        [
          'relation - Inversed One to One',
          attributes.relations.inversedOneToOne,
          expectedMetadataHashedResults.relations.inversedOneToOne,
          {},
        ],
        [
          'relation - Many to Many',
          attributes.relations.manyToMany,
          expectedMetadataHashedResults.relations.manyToMany,
          {},
        ],
        [
          'component - repeatable',
          attributes.components.repeatable,
          expectedMetadataHashedResults.components.repeatable,
          {
            auxiliarModels: [auxComponent],
          },
        ],
        [
          'component - single',
          attributes.components.single,
          expectedMetadataHashedResults.components.single,
          {
            auxiliarModels: [auxComponent],
          },
        ],
        [
          'dynamic zone',
          attributes.components.dynamicZone,
          expectedMetadataHashedResults.dynamicZone,
          {
            auxiliarModels: [auxComponent],
          },
        ],
      ])(
        'matches expected result for %s',
        (_attributeType, modelAttributes, expectedMetadata, opts: TestOptions) => {
          const models = opts.auxiliarModels
            ? [auxComponent, buildModelWith(modelAttributes)]
            : [buildModelWith(modelAttributes)];
          // mock the options so that the 'global' identifiers created for use by createMetadata uses 25 for maxLength
          jest.spyOn(Identifiers.prototype, 'options', 'get').mockReturnValue({ maxLength: 25 });

          const results = createMetadata(models as any);

          expect(results).toBeInstanceOf(Map);
          expect(results).toEqualMap(new Map(expectedMetadata as any));
        }
      );
    });
  });
});

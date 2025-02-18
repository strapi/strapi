import {
  formatComponent,
  formatMainDataType,
  getComponentsToPost,
  getCreatedAndModifiedComponents,
  sortContentType,
} from '../cleanData';

import { expectedData } from './expectedFormattedData';
import { data as rawData } from './rawData';

describe('CleanData utils', () => {
  describe('FormatComponent', () => {
    describe('FormatComponent when creating a type (POST)', () => {
      describe('Formatting created component', () => {
        it('should remove the uid key if the component is new', () => {
          const component = rawData.rawData.components['components.main-compo'];

          expect(
            formatComponent(component, 'api::test-content-type.test-content-type')
          ).not.toHaveProperty('uid');
        });

        it('should add a tempUID key if the component is new', () => {
          const component = rawData.rawData.components['components.main-compo'];

          expect(
            formatComponent(component, 'api::test-content-type.test-content-type')
          ).toHaveProperty('tmpUID');
        });

        it('should format the component correctly', () => {
          const component = rawData.rawData.components['components.main-compo'];
          const expectedComponent = expectedData.formattedComponents['components.main-compo'];

          expect(formatComponent(component, 'api::test-content-type.test-content-type')).toEqual(
            expectedComponent
          );
        });
      });

      describe('Formatting existing component', () => {
        it('should format the component correctly', () => {
          const component = rawData.rawData.components['blog.quote'];
          const expectedComponent = expectedData.formattedComponents['blog.quote'];

          expect(formatComponent(component, 'api::test-content-type.test-content-type')).toEqual(
            expectedComponent
          );
        });
      });
    });

    describe('FormatComponent when editing a type content type or component (PUT)', () => {
      describe('Formatting created component', () => {
        it('should remove the uid key if the component is new', () => {
          const component = rawData.rawData.components['components.main-compo'];

          expect(
            formatComponent(component, 'api::test-content-type.test-content-type')
          ).not.toHaveProperty('uid');
        });

        it('should add a tempUID key if the component is new', () => {
          const component = rawData.rawData.components['components.main-compo'];

          expect(
            formatComponent(component, 'api::test-content-type.test-content-type')
          ).toHaveProperty('tmpUID');
        });

        it('should format the component correctly', () => {
          const component = rawData.rawData.components['components.main-compo'];
          const expectedComponent =
            expectedData.formattedComponentsForEdit['components.main-compo'];

          expect(formatComponent(component, 'api::test-content-type.test-content-type')).toEqual(
            expectedComponent
          );
        });
      });

      describe('Formatting existing component', () => {
        it('should format the component correctly', () => {
          const component = rawData.rawData.components['blog.quote'];
          const expectedComponent = expectedData.formattedComponents['blog.quote'];

          expect(formatComponent(component, 'api::test-content-type.test-content-type')).toEqual(
            expectedComponent
          );
        });
      });
    });
  });

  describe('FormatMainDataType', () => {
    describe('Case Content Type', () => {
      describe('POSTING a content type', () => {
        it('should format the content type correctly', () => {
          const {
            rawData: { contentTypeToCreate },
          } = rawData;
          const expected = expectedData.contentTypeToCreate;

          expect(formatMainDataType(contentTypeToCreate)).toEqual(expected);
        });
      });

      describe('PUTING a content type', () => {
        it('should format the content type correctly', () => {
          const {
            rawData: { contentTypeToEdit },
          } = rawData;
          const expected = expectedData.contentTypeToEdit;

          expect(formatMainDataType(contentTypeToEdit)).toEqual(expected);
        });
      });
    });
  });

  describe('GetComponentsToPost', () => {
    describe('Creating a type (POST)', () => {
      it('should return an array containing all the formattedComponents', () => {
        const {
          initialComponents,
          rawData: { components },
        } = rawData;
        const expectedFormattedComponents = expectedData.components;

        expect(
          getComponentsToPost(
            components,
            initialComponents,
            'api::test-content-type.test-content-type'
          )
        ).toEqual(expectedFormattedComponents);
      });
    });

    describe('Editing a type (PUT)', () => {
      it('should return an array containing all the formattedComponents', () => {
        const {
          initialComponents,
          rawData: { components },
        } = rawData;
        const expectedFormattedComponents = expectedData.componentsForEdit;

        expect(
          getComponentsToPost(
            components,
            initialComponents,
            'api::test-content-type.test-content-type'
          )
        ).toEqual(expectedFormattedComponents);
      });
    });
  });

  describe('GetCreatedAndModifiedComponents', () => {
    it('should return an empty array if there is no component', () => {
      expect(getCreatedAndModifiedComponents({}, {})).toEqual([]);
    });

    it('should return an array containing the uid of the modified and created components', () => {
      const { componentsToFormat } = expectedData;
      const {
        initialComponents,
        rawData: { components },
      } = rawData;

      expect(getCreatedAndModifiedComponents(components, initialComponents).sort()).toEqual(
        componentsToFormat.sort()
      );
    });
  });

  describe('sortContentType', () => {
    it('should return sorted collection types array', () => {
      const { sortedContentTypes } = expectedData;
      const {
        rawData: { contentTypesToSort },
      } = rawData;

      expect(sortContentType(contentTypesToSort)).toEqual(sortedContentTypes);
    });

    it('should return an empty array if no content types', () => {
      expect(sortContentType({})).toEqual([]);
    });
  });
});

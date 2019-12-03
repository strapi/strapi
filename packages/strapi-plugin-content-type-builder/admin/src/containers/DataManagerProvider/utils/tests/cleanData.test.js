import {
  formatComponent,
  formatContentType,
  getComponentsToPost,
  getCreatedAndModifiedComponents,
} from '../cleanData';
import contentTypeData from './contentTypeData';
import expectedData from './expectedFormattedContentTypeData';

describe('CleanData utils', () => {
  describe('FormatComponent', () => {
    describe('Formatting created component', () => {
      it('should remove the uid key if the component is new', () => {
        const component =
          contentTypeData.rawData.components['components.main-compo'];

        expect(
          formatComponent(
            component,
            'application::test-content-type.test-content-type',
            true
          )
        ).not.toHaveProperty('uid');
      });

      it('should add a tempUID key if the component is new', () => {
        const component =
          contentTypeData.rawData.components['components.main-compo'];

        expect(
          formatComponent(
            component,
            'application::test-content-type.test-content-type',
            true
          )
        ).toHaveProperty('tmpUID');
      });

      it('should format the component correctly', () => {
        const component =
          contentTypeData.rawData.components['components.main-compo'];
        const expectedComponent =
          expectedData.formattedComponents['components.main-compo'];

        expect(
          formatComponent(
            component,
            'application::test-content-type.test-content-type',
            true
          )
        ).toEqual(expectedComponent);
      });
    });

    describe('Formatting existing component', () => {
      it('should format the component correctly', () => {
        const component = contentTypeData.rawData.components['blog.quote'];
        const expectedComponent =
          expectedData.formattedComponents['blog.quote'];

        expect(
          formatComponent(
            component,
            'application::test-content-type.test-content-type',
            true
          )
        ).toEqual(expectedComponent);
      });
    });
  });

  describe('FormatContentType', () => {
    it('should format the content type correctly', () => {
      const {
        rawData: { contentType },
      } = contentTypeData;
      const expected = expectedData.contentType;

      expect(formatContentType(contentType)).toEqual(expected);
    });
  });

  describe('GetComponentsToPost', () => {
    it('should return an array containing all the formattedComponents', () => {
      const {
        initialComponents,
        rawData: { components },
      } = contentTypeData;
      const expectedFormattedComponents = expectedData.components;

      expect(
        getComponentsToPost(
          components,
          initialComponents,
          'application::test-content-type.test-content-type',
          true
        )
      ).toEqual(expectedFormattedComponents);
    });

    // TODO add test for existing content type
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
      } = contentTypeData;
      expect(
        getCreatedAndModifiedComponents(components, initialComponents).sort()
      ).toEqual(componentsToFormat.sort());
    });
  });
});

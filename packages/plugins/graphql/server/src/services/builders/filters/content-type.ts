import { inputObjectType } from 'nexus';
import type * as Nexus from 'nexus';
import type { Struct, Schema } from '@strapi/types';
import type { Context } from '../../types';

export default ({ strapi }: Context) => {
  const rootLevelOperators = () => {
    const { operators } = strapi.plugin('graphql').service('builders').filters;

    return [operators.and, operators.or, operators.not];
  };

  const addScalarAttribute = (
    builder: Nexus.blocks.InputDefinitionBlock<any>,
    attributeName: string,
    attribute: Schema.Attribute.AnyAttribute
  ) => {
    const { naming, mappers } = strapi.plugin('graphql').service('utils');

    const gqlType = mappers.strapiScalarToGraphQLScalar(attribute.type);

    builder.field(attributeName, { type: naming.getScalarFilterInputTypeName(gqlType) });
  };

  const addRelationalAttribute = (
    builder: Nexus.blocks.InputDefinitionBlock<any>,
    attributeName: string,
    attribute: Schema.Attribute.Relation
  ) => {
    const utils = strapi.plugin('graphql').service('utils');
    const extension = strapi.plugin('graphql').service('extension');
    const { getFiltersInputTypeName } = utils.naming;
    const { isMorphRelation } = utils.attributes;

    const model = 'target' in attribute && strapi.getModel(attribute.target);

    // If there is no model corresponding to the attribute configuration
    // or if the attribute is a polymorphic relation, then ignore it
    if (!model || isMorphRelation(attribute)) return;

    // If the target model is disabled, then ignore it too
    if (extension.shadowCRUD(model.uid).isDisabled()) return;

    builder.field(attributeName, { type: getFiltersInputTypeName(model) });
  };

  const addComponentAttribute = (
    builder: Nexus.blocks.InputDefinitionBlock<any>,
    attributeName: string,
    attribute: Schema.Attribute.Component
  ) => {
    const utils = strapi.plugin('graphql').service('utils');
    const extension = strapi.plugin('graphql').service('extension');
    const { getFiltersInputTypeName } = utils.naming;

    const component = strapi.getModel(attribute.component);

    // If there is no component corresponding to the attribute configuration, then ignore it
    if (!component) return;

    // If the component is disabled, then ignore it too
    if (extension.shadowCRUD(component.uid).isDisabled()) return;

    builder.field(attributeName, { type: getFiltersInputTypeName(component) });
  };

  const buildContentTypeFilters = (contentType: Struct.ContentTypeSchema) => {
    const utils = strapi.plugin('graphql').service('utils');
    const extension = strapi.plugin('graphql').service('extension');

    const { getFiltersInputTypeName, getScalarFilterInputTypeName } = utils.naming;
    const { isStrapiScalar, isRelation, isComponent } = utils.attributes;

    const { attributes } = contentType;

    const filtersTypeName = getFiltersInputTypeName(contentType);

    return inputObjectType({
      name: filtersTypeName,

      definition(t) {
        const validAttributes = Object.entries(attributes).filter(([attributeName]) =>
          extension.shadowCRUD(contentType.uid).field(attributeName).hasFiltersEnabeld()
        );

        const isIDFilterEnabled = extension
          .shadowCRUD(contentType.uid)
          .field('documentId')
          .hasFiltersEnabeld();
        // Add an ID filter to the collection types
        if (contentType.kind === 'collectionType' && isIDFilterEnabled) {
          t.field('documentId', { type: getScalarFilterInputTypeName('ID') });
        }

        // Add every defined attribute
        for (const [attributeName, attribute] of validAttributes) {
          // Handle scalars
          if (isStrapiScalar(attribute)) {
            addScalarAttribute(t, attributeName, attribute);
          }

          // Handle relations
          else if (isRelation(attribute)) {
            addRelationalAttribute(t, attributeName, attribute as Schema.Attribute.Relation);
          }

          // Handle components
          else if (isComponent(attribute)) {
            addComponentAttribute(t, attributeName, attribute as Schema.Attribute.Component);
          }
        }

        // Conditional clauses
        for (const operator of rootLevelOperators()) {
          operator.add(t, filtersTypeName);
        }
      },
    });
  };

  return {
    buildContentTypeFilters,
  };
};

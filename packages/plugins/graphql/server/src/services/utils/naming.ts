import { camelCase, upperFirst, lowerFirst, pipe, get } from 'lodash/fp';
import { singular } from 'pluralize';
import { errors } from '@strapi/utils';
import type { Struct, Schema } from '@strapi/types';
import type { Context } from '../types';

const { ApplicationError } = errors;

export default ({ strapi }: Context) => {
  /**
   * Build a type name for a enum based on a content type & an attribute name
   */
  const getEnumName = (contentType: Struct.Schema, attributeName: string) => {
    const { attributes } = contentType;
    const { enumName } = attributes[attributeName] as Schema.Attribute.Enumeration;
    const { modelType } = contentType;

    const typeName =
      modelType === 'component' ? getComponentName(contentType) : getTypeName(contentType);

    const defaultEnumName = `ENUM_${typeName.toUpperCase()}_${attributeName.toUpperCase()}`;

    return enumName || defaultEnumName;
  };

  /**
   * Build the base type name for a given content type
   */
  const getTypeName = (
    contentType: Struct.Schema,
    {
      plurality = 'singular',
    }: {
      plurality?: 'singular' | 'plural';
    } = {}
  ) => {
    const plugin = get('plugin', contentType);
    const modelName = get('modelName', contentType);
    const name =
      plurality === 'singular'
        ? get('info.singularName', contentType)
        : get('info.pluralName', contentType);

    const transformedPlugin = upperFirst(camelCase(plugin));
    const transformedModelName = upperFirst(camelCase(name || singular(modelName)));

    return `${transformedPlugin}${transformedModelName}`;
  };

  /**
   * Build the entity's type name for a given content type
   */
  const getEntityName = (contentType: Struct.Schema) => {
    return `${getTypeName(contentType)}Entity`;
  };

  /**
   * Build the entity meta type name for a given content type
   */
  const getEntityMetaName = (contentType: Struct.Schema) => {
    return `${getEntityName(contentType)}Meta`;
  };

  /**
   * Build the entity response's type name for a given content type
   */
  const getEntityResponseName = (contentType: Struct.Schema) => {
    return `${getEntityName(contentType)}Response`;
  };

  /**
   * Build the entity response collection's type name for a given content type
   */
  const getEntityResponseCollectionName = (contentType: Struct.Schema) => {
    return `${getEntityName(contentType)}ResponseCollection`;
  };

  /**
   * Build the relation response collection's type name for a given content type
   */
  const getRelationResponseCollectionName = (contentType: Struct.Schema) => {
    return `${getTypeName(contentType)}RelationResponseCollection`;
  };

  /**
   * Build a component type name based on its definition
   */
  const getComponentName = (contentType: Struct.Schema) => {
    return contentType.globalId;
  };

  /**
   * Build a component type name based on a content type's attribute
   */
  const getComponentNameFromAttribute = (attribute: Schema.Attribute.Component) => {
    return strapi.components[attribute.component].globalId;
  };

  /**
   * Build a dynamic zone type name based on a content type and an attribute name
   */
  const getDynamicZoneName = (contentType: Struct.Schema, attributeName: string) => {
    const typeName = getTypeName(contentType);
    const dzName = upperFirst(camelCase(attributeName));
    const suffix = 'DynamicZone';

    return `${typeName}${dzName}${suffix}`;
  };

  /**
   * Build a dynamic zone input type name based on a content type and an attribute name
   */
  const getDynamicZoneInputName = (contentType: Struct.Schema, attributeName: string) => {
    const dzName = getDynamicZoneName(contentType, attributeName);

    return `${dzName}Input`;
  };

  /**
   * Build a component input type name based on a content type and an attribute name
   */
  const getComponentInputName = (contentType: Struct.Schema) => {
    const componentName = getComponentName(contentType);

    return `${componentName}Input`;
  };

  /**
   * Build a content type input name based on a content type and an attribute name
   */
  const getContentTypeInputName = (contentType: Struct.Schema) => {
    const typeName = getTypeName(contentType);

    return `${typeName}Input`;
  };

  /**
   * Build the queries type name for a given content type
   */
  const getEntityQueriesTypeName = (contentType: Struct.Schema) => {
    return `${getEntityName(contentType)}Queries`;
  };

  /**
   * Build the mutations type name for a given content type
   */
  const getEntityMutationsTypeName = (contentType: Struct.Schema) => {
    return `${getEntityName(contentType)}Mutations`;
  };

  /**
   * Build the filters type name for a given content type
   */
  const getFiltersInputTypeName = (contentType: Struct.Schema) => {
    const isComponent = contentType.modelType === 'component';

    const baseName = isComponent ? getComponentName(contentType) : getTypeName(contentType);

    return `${baseName}FiltersInput`;
  };

  /**
   * Build a filters type name for a given GraphQL scalar type
   */
  const getScalarFilterInputTypeName = (scalarType: string) => {
    return `${scalarType}FilterInput`;
  };

  /**
   * Build a type name for a given content type & polymorphic attribute
   */
  const getMorphRelationTypeName = (contentType: Struct.Schema, attributeName: string) => {
    const typeName = getTypeName(contentType);
    const formattedAttr = upperFirst(camelCase(attributeName));

    return `${typeName}${formattedAttr}Morph`;
  };

  /**
   * Build a custom type name generator with different customization options
   */
  const buildCustomTypeNameGenerator = (options: {
    prefix?: string;
    suffix?: string;
    firstLetterCase?: 'upper' | 'lower';
    plurality?: 'plural' | 'singular';
  }) => {
    // todo[v4]: use singularName & pluralName is available
    const { prefix = '', suffix = '', plurality = 'singular', firstLetterCase = 'upper' } = options;

    if (!['plural', 'singular'].includes(plurality)) {
      throw new ApplicationError(
        `"plurality" param must be either "plural" or "singular", but got: "${plurality}"`
      );
    }

    const getCustomTypeName = pipe(
      (ct) => getTypeName(ct, { plurality }),
      firstLetterCase === 'upper' ? upperFirst : lowerFirst
    );

    return (contentType: Struct.Schema) => `${prefix}${getCustomTypeName(contentType)}${suffix}`;
  };

  const getFindQueryName = buildCustomTypeNameGenerator({
    plurality: 'plural',
    firstLetterCase: 'lower',
  });

  const getFindConnectionQueryName = (contentType: Struct.Schema) => {
    return `${getFindQueryName(contentType)}_connection`;
  };

  const getFindOneQueryName = buildCustomTypeNameGenerator({ firstLetterCase: 'lower' });

  const getCreateMutationTypeName = buildCustomTypeNameGenerator({
    prefix: 'create',
    firstLetterCase: 'upper',
  });

  const getUpdateMutationTypeName = buildCustomTypeNameGenerator({
    prefix: 'update',
    firstLetterCase: 'upper',
  });

  const getDeleteMutationTypeName = buildCustomTypeNameGenerator({
    prefix: 'delete',
    firstLetterCase: 'upper',
  });

  return {
    getEnumName,
    getTypeName,
    getEntityName,
    getEntityMetaName,
    getEntityResponseName,
    getEntityResponseCollectionName,
    getRelationResponseCollectionName,
    getComponentName,
    getComponentNameFromAttribute,
    getDynamicZoneName,
    getDynamicZoneInputName,
    getComponentInputName,
    getContentTypeInputName,
    getEntityQueriesTypeName,
    getEntityMutationsTypeName,
    getFiltersInputTypeName,
    getScalarFilterInputTypeName,
    getMorphRelationTypeName,
    buildCustomTypeNameGenerator,
    getFindQueryName,
    getFindOneQueryName,
    getCreateMutationTypeName,
    getUpdateMutationTypeName,
    getDeleteMutationTypeName,
    getFindConnectionQueryName,
  };
};

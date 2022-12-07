import { ContentType } from '../../types/schema';

import { camelCase, upperFirst, lowerFirst, pipe, get } from 'lodash/fp';
import { singular } from 'pluralize';
import Utils from '@strapi/utils';
import { StrapiCTX } from '../../types/strapi-ctx';
import { ComponentAttribute } from '@strapi/strapi';

const { ApplicationError } = Utils.errors;

export default ({ strapi }: StrapiCTX) => {
  /**
   * Build a type name for a enum based on a content type & an attribute name
   */
  const getEnumName = (contentType: ContentType, attributeName: string): string => {
    const { attributes, modelType } = contentType;
    const enumField = attributes[attributeName];

    const typeName =
      modelType === 'component' ? getComponentName(contentType) : getTypeName(contentType);

    const defaultEnumName = `ENUM_${typeName.toUpperCase()}_${attributeName.toUpperCase()}`;

    return (enumField as any).enumName || defaultEnumName;
  };

  /**
   * Build the base type name for a given content type
   */
  const getTypeName = (
    contentType: ContentType,
    options?: { plurality: 'singular' | 'plural' }
  ) => {
    const plugin = get('plugin', contentType);
    const modelName = get('modelName', contentType);
    const name =
      options?.plurality === 'singular'
        ? get('info.singularName', contentType)
        : get('info.pluralName', contentType);

    const transformedPlugin = upperFirst(camelCase(plugin));
    const transformedModelName = upperFirst(camelCase(name || singular(modelName)));
    return `${transformedPlugin}${transformedModelName}`;
  };

  /**
   * Build the entity's type name for a given content type
   */
  const getEntityName = (contentType: ContentType) => {
    return `${getTypeName(contentType)}Entity`;
  };

  /**
   * Build the entity meta type name for a given content type
   */
  const getEntityMetaName = (contentType: ContentType) => {
    return `${getEntityName(contentType)}Meta`;
  };

  /**
   * Build the entity response's type name for a given content type
   */
  const getEntityResponseName = (contentType: ContentType) => {
    return `${getEntityName(contentType)}Response`;
  };

  /**
   * Build the entity response collection's type name for a given content type
   */
  const getEntityResponseCollectionName = (contentType: ContentType) => {
    return `${getEntityName(contentType)}ResponseCollection`;
  };
  /**
   * Build the relation response collection's type name for a given content type
   */
  const getRelationResponseCollectionName = (contentType: ContentType) => {
    return `${getTypeName(contentType)}RelationResponseCollection`;
  };

  /**
   * Build a component type name based on its definition
   */
  const getComponentName = (contentType: ContentType) => {
    return contentType.globalId;
  };
  /**
   * Build a component type name based on a content type's attribute
   */
  const getComponentNameFromAttribute = (attribute: ComponentAttribute<never>) => {
    return (strapi as any).components[attribute.component].globalId;
  };

  /**
   * Build a dynamic zone type name based on a content type and an attribute name
   */
  const getDynamicZoneName = (contentType: ContentType, attributeName: string) => {
    const typeName = getTypeName(contentType);
    const dzName = upperFirst(camelCase(attributeName));
    const suffix = 'DynamicZone';

    return `${typeName}${dzName}${suffix}`;
  };

  /**
   * Build a dynamic zone input type name based on a content type and an attribute name
   */
  const getDynamicZoneInputName = (contentType: ContentType, attributeName: string) => {
    const dzName = getDynamicZoneName(contentType, attributeName);

    return `${dzName}Input`;
  };

  /**
   * Build a component input type name based on a content type and an attribute name
   */
  const getComponentInputName = (contentType: ContentType) => {
    const componentName = getComponentName(contentType);

    return `${componentName}Input`;
  };

  /**
   * Build a content type input name based on a content type and an attribute name
   */
  const getContentTypeInputName = (contentType: ContentType) => {
    const typeName = getTypeName(contentType);

    return `${typeName}Input`;
  };

  /**
   * Build the queries type name for a given content type
   */
  const getEntityQueriesTypeName = (contentType: ContentType) => {
    return `${getEntityName(contentType)}Queries`;
  };
  /**
   * Build the mutations type name for a given content type
   */
  const getEntityMutationsTypeName = (contentType: ContentType) => {
    return `${getEntityName(contentType)}Mutations`;
  };

  /**
   * Build the filters type name for a given content type
   */
  const getFiltersInputTypeName = (contentType: ContentType) => {
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
  const getMorphRelationTypeName = (contentType: ContentType, attributeName: string) => {
    const typeName = getTypeName(contentType);
    const formattedAttr = upperFirst(camelCase(attributeName));

    return `${typeName}${formattedAttr}Morph`;
  };

  /**
   * Build a custom type name generator with different customization options
   */
  const buildCustomTypeNameGenerator = (
    options: {
      prefix?: string;
      suffix?: string;
      firstLetterCase?: 'upper' | 'lower';
      plurality?: 'plural' | 'singular';
    } = {}
  ) => {
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

    return (contentType: ContentType) => `${prefix}${getCustomTypeName(contentType)}${suffix}`;
  };

  const getFindQueryName = buildCustomTypeNameGenerator({
    plurality: 'plural',
    firstLetterCase: 'lower',
  });

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
  };
};

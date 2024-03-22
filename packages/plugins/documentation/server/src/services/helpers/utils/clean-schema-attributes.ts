import type { Struct } from '@strapi/types';
import type { OpenAPIV3 } from 'openapi-types';

import getSchemaData from './get-schema-data';
import pascalCase from './pascal-case';

interface Options {
  typeMap?: Map<string, boolean>;
  isRequest?: boolean;
  didAddStrapiComponentsToSchemas: (name: string, schema: object) => boolean;
}

/**
 * @description - Converts types found on attributes to OpenAPI acceptable data types
 *
 * @returns Attributes using OpenAPI acceptable data types
 */
const cleanSchemaAttributes = (
  attributes: Struct.SchemaAttributes,
  { typeMap = new Map(), isRequest = false, didAddStrapiComponentsToSchemas }: Options
) => {
  const schemaAttributes: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject> = {};

  for (const prop of Object.keys(attributes)) {
    const attribute = attributes[prop];

    switch (attribute.type) {
      case 'password': {
        if (!isRequest) {
          break;
        }

        schemaAttributes[prop] = { type: 'string', format: 'password', example: '*******' };
        break;
      }
      case 'email': {
        schemaAttributes[prop] = { type: 'string', format: 'email' };
        break;
      }
      case 'string':
      case 'text':
      case 'richtext': {
        schemaAttributes[prop] = { type: 'string' };
        break;
      }
      case 'timestamp': {
        schemaAttributes[prop] = { type: 'string', format: 'timestamp', example: Date.now() };
        break;
      }
      case 'time': {
        schemaAttributes[prop] = { type: 'string', format: 'time', example: '12:54.000' };
        break;
      }
      case 'date': {
        schemaAttributes[prop] = { type: 'string', format: 'date' };
        break;
      }
      case 'datetime': {
        schemaAttributes[prop] = { type: 'string', format: 'date-time' };
        break;
      }
      case 'boolean': {
        schemaAttributes[prop] = { type: 'boolean' };
        break;
      }
      case 'enumeration': {
        schemaAttributes[prop] = { type: 'string', enum: [...attribute.enum] };
        break;
      }
      case 'decimal':
      case 'float': {
        schemaAttributes[prop] = { type: 'number', format: 'float' };
        break;
      }
      case 'integer': {
        schemaAttributes[prop] = { type: 'integer' };
        break;
      }
      case 'biginteger': {
        schemaAttributes[prop] = { type: 'string', pattern: '^\\d*$', example: '123456789' };
        break;
      }
      case 'json':
      case 'blocks': {
        schemaAttributes[prop] = {};
        break;
      }
      case 'uid': {
        schemaAttributes[prop] = { type: 'string' };
        break;
      }
      case 'component': {
        const componentAttributes = strapi.components[attribute.component].attributes;
        const rawComponentSchema: OpenAPIV3.SchemaObject = {
          type: 'object',
          properties: {
            ...(isRequest ? {} : { id: { type: 'number' } }),
            ...cleanSchemaAttributes(componentAttributes, {
              typeMap,
              isRequest,
              didAddStrapiComponentsToSchemas,
            }),
          },
        };

        const refComponentSchema: OpenAPIV3.ReferenceObject = {
          $ref: `#/components/schemas/${pascalCase(attribute.component)}Component`,
        };

        const componentExists = didAddStrapiComponentsToSchemas(
          `${pascalCase(attribute.component)}Component`,
          rawComponentSchema
        );

        const finalComponentSchema = componentExists ? refComponentSchema : rawComponentSchema;
        if (attribute.repeatable) {
          schemaAttributes[prop] = {
            type: 'array',
            items: finalComponentSchema,
          };
        } else {
          schemaAttributes[prop] = finalComponentSchema;
        }
        break;
      }
      case 'dynamiczone': {
        const components = attribute.components.map((component) => {
          const componentAttributes = strapi.components[component].attributes;
          const rawComponentSchema: OpenAPIV3.SchemaObject = {
            type: 'object',
            properties: {
              ...(isRequest ? {} : { id: { type: 'number' } }),
              __component: { type: 'string' },
              ...cleanSchemaAttributes(componentAttributes, {
                typeMap,
                isRequest,
                didAddStrapiComponentsToSchemas,
              }),
            },
          };

          const refComponentSchema: OpenAPIV3.ReferenceObject = {
            $ref: `#/components/schemas/${pascalCase(component)}Component`,
          };

          const componentExists = didAddStrapiComponentsToSchemas(
            `${pascalCase(component)}Component`,
            rawComponentSchema
          );
          const finalComponentSchema = componentExists ? refComponentSchema : rawComponentSchema;
          return finalComponentSchema;
        });

        schemaAttributes[prop] = {
          type: 'array',
          items: {
            anyOf: components,
          },
        };
        break;
      }
      case 'media': {
        const imageAttributes = strapi.contentType('plugin::upload.file').attributes;
        const isListOfEntities = attribute.multiple ?? false;

        if (isRequest) {
          const oneOfType: OpenAPIV3.SchemaObject = {
            oneOf: [{ type: 'integer' }, { type: 'string' }],
            example: 'string or id',
          };

          schemaAttributes[prop] = isListOfEntities
            ? { type: 'array', items: oneOfType }
            : oneOfType;
          break;
        }

        schemaAttributes[prop] = getSchemaData(
          isListOfEntities,
          cleanSchemaAttributes(imageAttributes, { typeMap, didAddStrapiComponentsToSchemas })
        );
        break;
      }

      case 'relation': {
        const isListOfEntities = attribute.relation.includes('ToMany');

        if (isRequest) {
          const oneOfType: OpenAPIV3.SchemaObject = {
            oneOf: [{ type: 'integer' }, { type: 'string' }],
            example: 'string or id',
          };

          schemaAttributes[prop] = isListOfEntities
            ? { type: 'array', items: oneOfType }
            : oneOfType;
          break;
        }

        if (!('target' in attribute) || !attribute.target || typeMap.has(attribute.target)) {
          schemaAttributes[prop] = getSchemaData(isListOfEntities, {});

          break;
        }

        typeMap.set(attribute.target, true);
        const targetAttributes = strapi.contentType(attribute.target).attributes;

        schemaAttributes[prop] = getSchemaData(
          isListOfEntities,
          cleanSchemaAttributes(targetAttributes, {
            typeMap,
            isRequest,
            didAddStrapiComponentsToSchemas,
          })
        );

        break;
      }
      default: {
        // @ts-expect-error - This is a catch all for any other types
        throw new Error(`Invalid type ${attribute.type} while generating open api schema.`);
      }
    }
  }

  return schemaAttributes;
};

export default cleanSchemaAttributes;

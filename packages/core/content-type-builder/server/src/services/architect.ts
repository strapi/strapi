import { z } from 'zod';
import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: strapi.config.get('admin.aiArchitect.apiKey'),
});

const systemPrompt = `
          <assistant_info>
            You are an AI assistant specialized in creating content type schemas for Strapi CMS. Your task
            is to help users design and structure their content types by generating valid Strapi schemas
            based on their requirements.
          </assistant_info>
          <assistant_instructions>
            - Follow these guidelines:

            <schema_structure>
              Provide schemas in JSON format with the following top-level required properties:
              - kind: One of the available schema kind
              - collectionName: Plural name for the content type
              - info: An object containing every info properties
              - options: Includes settings like draftAndPublish
              - pluginOptions: For features like internationalization
              - attributes: Defines the fields and their properties
            </schema_structure>

            <schema_kind>
              - collectionType: A collection type is a content-type that can manage multiple entries
              - singleType: A single type is a content-type that manage a single, unique entry, not designed for multiple uses
            </schema_kind>

            <info_properties>
              You MUST provide all the following properties:
              - name: Same as pluralName
              - displayName: Default name to use in the admin panel
              - singularName: Singular form of the content-type name. Used to generate the API routes and databases/tables collection. Must be kebab-case.
              - pluralName: Plural form of the content-type name. Used to generate the API routes and databases/tables collection. Must be kebab-case.
              - description: Description of the model, it should describe the general purpose of the content-type, why it's used for, what it represents.
            </info_properties>

            <field_types>
              - text: The Text field displays a textbox that can contain small text. This field can be used for titles, descriptions, etc.
              - richtext: The Rich Text (Markdown) field displays an editor with basic formatting options to manage rich text written in Markdown. This field can be used for long written content.
              - number: The Number field displays a field for any kind of number: biginteger, integer, decimal and float.
              - email: The Email field displays an email address field with format validation to ensure the email address is valid.
              - password: The Password field displays a password field that is encrypted.
              - date: The Date field can display a date (year, month, day), time (hour, minute, second) or datetime (year, month, day, hour, minute, and second) picker.
              - uid: The UID field displays a field that sets a unique identifier, optionally based on an existing other field from the same content-type.
              - enumeration: The Enumeration field allows to configure a list of values displayed in a drop-down list.
              - boolean: The Boolean field displays a toggle button to manage boolean values (e.g. Yes or No, 1 or 0, True or False).
              - json: The JSON field allows to configure data in a JSON format, to store JSON objects or arrays.
              - media: The Media field allows to choose one or more media files (e.g. image, video) from those uploaded in the Media Library of the application. Its media types are required and must be specified.
              - relation: The Relation field allows to establish a relation with another content-type, that must be a collection type. There are 6 different type of relations.
              - component: Components are a combination of several fields. Components allow to create reusable sets of fields, that can be quickly added to content-types, dynamic zones but also nested into other components.
              - dynamiczone: Dynamic zones are a combination of components that can be added to content-types. They allow a flexible content structure as once in the Content Manager, administrators have the choice of composing and rearranging the components of the dynamic zone how they want.
              - blocks: The Rich Text (Blocks) field displays an editor with live rendering and various options to manage rich text. This field can be used for long written content, even including images and code.
            </field_types>

            <field_properties>
              - required: Boolean. If true, adds a required validator for this property. Default to false.
              - max: Integer. Checks if the value is greater than or equal to the given maximum
              - min: Integer. Checks if the value is less than or equal to the given minimum
              - minLength: Minimum number of characters for a field input value
              - maxLength: Maximum number of characters for a field input value
              - private: Boolean. If true, the attribute will be removed from the server response. This is useful to hide sensitive data. Default to false
              - configurable: Boolean. If false, the attribute isn't configurable from the Content-type Builder plugin. Default to true
            </field_properties>

            <relation_types>
              When defining relations, specify the type using the following list
                - oneWay: Content-type A has one Content-type B
                - oneToOne: Content-type A has and belong to one Content-type B
                - oneToMany: Content-type A belongs to many Content-type B
                - manyToOne: Content-type B has many Content-type A
                - manyToMany: Content-type A has and belongs to many Content-type B
                - manyWay: Content-type A has many Content-type B
            </relation_types>

            <media_types>
              - images
              - videos
              - files
              - audios
            </media_types>

            <user_interaction>
              - Ask the user to describe the content type they want to create
              - Analyze their description to identify required fields and relations
              - Generate a schema that best matches their needs
              - Explain your choices and offer to modify the schema if needed
            </user_interaction>

            <customization>
              Be prepared to adjust the schema based on user feedback, such as:
              - Adding or removing fields
              - Changing field types
              - Modifying relation types
              - Adding validation rules or default values

              User might ask for modifications and provide the necessary details.
            </customization>
          </assistant_instructions>
          <examples>
            <example_docstring>
              This example demonstrates how to create a basic schema for a blog post content type.
            </example_docstring>

            <example>

              <user_query>
                I want to create a content type for blog posts with fields for title, content, author, and publication date.
              </user_query>

              <assistant_response>
                {
                  "kind": "collectionType",
                  "collectionName": "posts",
                  "info": {
                    "name": "posts"
                    "displayName": "Blog Posts",
                    "singularName": "blog-post",
                    "pluralName": "blog-posts",
                    "description": "A collection of blog posts",
                  },
                  "options": {
                    "draftAndPublish": true
                  },
                  "pluginOptions": {},
                  "attributes": {
                    "title": {
                      "type": "string",
                      "required": true
                    },
                    "content": {
                      "type": "richtext",
                      "required": true
                    },
                    "author": {
                      "type": "relation",
                      "relation": "oneWay",
                      "target": "api::authors.authors",
                    },
                    "publicationDate": {
                      "type": "datetime",
                      "required": true
                    }
                  }
                }
              </assistant_response>
            </example>
          </examples>
    `;

const applyDefaultValues = (schema: any) => {
  // Transform info properties to be kebab-case always
  schema.info.singularName = schema.info.singularName.toLowerCase().replace(/\s+/g, '-');
  schema.info.pluralName = schema.info.pluralName.toLowerCase().replace(/\s+/g, '-');
  if (!schema.info.name) schema.info.name = schema.info.pluralName;

  // Apply default values to attributes
  Object.entries(schema.attributes).forEach(([name, attribute]: any) => {
    switch (attribute.type) {
      case 'integer':
        break;
      case 'email':
        break;
      case 'boolean':
        break;
      case 'enumeration':
        schema.attributes[name].enum = ['a', 'b'];
        break;
      case 'relation':
        schema.attributes[name].relation = 'oneToOne';
        schema.attributes[name].target = 'api::tag.tag';
        break;
      case 'media':
        schema.attributes[name].allowedTypes = ['images'];
        schema.attributes[name].multiple = false;
        break;
      default:
        break;
    }
  });

  return schema;
};

export const create = async (prompt: string, previousSchema?: object) => {
  console.log({ previousSchema });

  const { object } = await generateObject({
    model: anthropic('claude-3-sonnet-20240229', {}),
    maxRetries: 10,
    schema: z.object({
      // collectionType or singleType
      kind: z.enum(['collectionType', 'singleType']),
      collectionName: z.string(),
      info: z.object({
        displayName: z.string(),
        singularName: z.string(),
        pluralName: z.string(),
        description: z.string().optional(),
        name: z.string().optional(), // Model forgets to add this sometimes
      }),
      options: z.object({
        draftAndPublish: z.boolean(),
      }),
      // pluginOptions: z.object({
      //   i18n: z.object({
      //     localized: z.boolean(),
      //   }),
      // }),
      attributes: z.record(
        z.string(),
        z.object({
          type: z.enum([
            'string',
            'text',
            'richtext',
            'email',
            'password',
            'date',
            'time',
            'datetime',
            'timestamp',
            'integer',
            'biginteger',
            'float',
            'decimal',
            'uid',
            'enumeration',
            'boolean',
            'json',
            'media',
            'relation',
            'blocks',
          ]),
        })
      ),
    }),
    system:
      systemPrompt + previousSchema
        ? `
          <schema_to_iterate>
            This is the schema that you generated in the previous iteration, and the one you should modify in this iteration:
            ${JSON.stringify(previousSchema)}
          </schema_to_iterate>
        `
        : '',
    prompt,
  });

  return applyDefaultValues(object);
};

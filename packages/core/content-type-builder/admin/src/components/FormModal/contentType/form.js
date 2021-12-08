import getTrad from '../../../utils/getTrad';

const nameField = {
  name: 'displayName',
  type: 'text',
  intlLabel: {
    id: getTrad('contentType.displayName.label'),
    defaultMessage: 'Display name',
  },
};

const forms = {
  advanced: {
    default: () => {
      return {
        sections: [
          {
            sectionTitle: {
              id: getTrad('form.contentType.divider.draft-publish'),
              defaultMessage: 'Draft/Publish',
            },
            items: [
              {
                intlLabel: {
                  id: getTrad('contentType.draftAndPublish.label'),
                  defaultMessage: 'Draft/publish system',
                },
                description: {
                  id: getTrad('contentType.draftAndPublish.description'),
                  defaultMessage: 'Write a draft version of each entry before publishing it',
                },
                name: 'draftAndPublish',
                type: 'toggle-draft-publish',
                validations: {},
              },
            ],
          },
        ],
      };
    },
  },
  base: {
    create: () => {
      return {
        sections: [
          {
            sectionTitle: null,
            items: [
              nameField,
              {
                description: {
                  id: getTrad('contentType.apiId-singular.description'),
                  defaultMessage:
                    'Used to generate the API routes and databases tables/collections',
                },
                intlLabel: {
                  id: getTrad('contentType.apiId-singular.label'),
                  defaultMessage: 'API ID (Singular)',
                },
                name: 'singularName',
                type: 'text-singular',
              },
              {
                type: 'pushRight',
                size: 6,
                intlLabel: { id: '', defaultMessage: '' },
                name: 'pushRight',
              },
              {
                description: {
                  id: getTrad('contentType.apiId-plural.description'),
                  defaultMessage: 'Pluralized API ID',
                },
                intlLabel: {
                  id: getTrad('contentType.apiId-plural.label'),
                  defaultMessage: 'API ID (Plural)',
                },
                name: 'pluralName',
                type: 'text-plural',
              },
            ],
          },
        ],
      };
    },
    edit: () => {
      return {
        sections: [
          {
            sectionTitle: null,
            items: [
              nameField,
              {
                disabled: true,
                description: {
                  id: getTrad('contentType.apiId-singular.description'),
                  defaultMessage:
                    'Used to generate the API routes and databases tables/collections',
                },
                intlLabel: {
                  id: getTrad('contentType.apiId-singular.label'),
                  defaultMessage: 'API ID (Singular)',
                },
                name: 'singularName',
                type: 'text',
              },
              {
                type: 'pushRight',
                size: 6,
                intlLabel: { id: '', defaultMessage: '' },
                name: 'pushRight',
              },
              {
                disabled: true,
                description: {
                  id: getTrad('contentType.apiId-plural.description'),
                  defaultMessage: 'Pluralized API ID',
                },
                intlLabel: {
                  id: getTrad('contentType.apiId-plural.label'),
                  defaultMessage: 'API ID (Plural)',
                },
                name: 'pluralName',
                type: 'text',
              },
              {
                intlLabel: {
                  id: getTrad('modalForm.attribute.text.type-selection'),
                  defaultMessage: 'Type',
                },
                name: 'kind',
                type: 'content-type-radio-group',
                size: 12,
                radios: [
                  {
                    title: {
                      id: getTrad('menu.section.models.name.singular'),
                      defaultMessage: 'Collection Type',
                    },
                    description: {
                      id: getTrad('form.button.collection-type.description'),
                      defaultMessage:
                        'Best for multiple instances like articles, products, comments, etc.',
                    },
                    value: 'collectionType',
                  },
                  {
                    title: {
                      id: getTrad('menu.section.single-types.name.singular'),
                      defaultMessage: 'Single Type',
                    },
                    description: {
                      id: getTrad('form.button.single-type.description'),
                      defaultMessage: 'Best for single instance like about us, homepage, etc.',
                    },
                    value: 'singleType',
                  },
                ],
              },
            ],
          },
        ],
      };
    },
  },
};

export default forms;

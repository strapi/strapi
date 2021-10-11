import getTrad from '../../../utils/getTrad';

const nameField = {
  name: 'name',
  type: 'text',
  intlLabel: {
    id: getTrad('contentType.displayName.label'),
    defaultMessage: 'Display name',
  },
};

const forms = {
  advanced: {
    default: ({ actionType }) => {
      return {
        sections: [
          {
            sectionTitle: {
              id: getTrad('form.contentType.divider.draft-publish'),
              defaultMessage: 'DRAFT/PUBLISH',
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
                type: actionType === 'edit' ? 'toggle-draft-publish' : 'bool',
                // type: 'bool',
                validations: {},
              },
            ],
          },
        ],
      };
    },
  },
  base: {
    create: value => {
      return {
        sections: [
          {
            sectionTitle: null,
            items: [
              nameField,
              {
                description: {
                  id: getTrad('contentType.UID.description'),
                  defaultMessage:
                    'The UID is used to generate the API routes and databases tables/collections',
                },
                intlLabel: {
                  id: getTrad('contentType.UID.label'),
                  defaultMessage: 'UID',
                },
                name: 'uid',
                type: 'text',
                readOnly: true,
                disabled: true,
                value,
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
                intlLabel: {
                  id: getTrad('modalForm.attribute.text.type-selection'),
                  defaultMessage: 'Type',
                },
                name: 'kind',
                type: 'booleanBox',
                size: 12,
                // FIXME
                // onChangeCallback: ({ toggleNotification }) =>
                //   toggleNotification({
                //     type: 'info',
                //     message: { id: getTrad('contentType.kind.change.warning') },
                //   }),
                // options: [
                //   {
                //     headerId: getTrad('menu.section.models.name.singular'),
                //     descriptionId: getTrad('form.button.collection-type.description'),
                //     value: 'collectionType',
                //   },
                //   {
                //     headerId: getTrad('menu.section.single-types.name.singular'),
                //     descriptionId: getTrad('form.button.single-type.description'),
                //     value: 'singleType',
                //   },
                // ],
                // validations: {},
              },
            ],
          },
        ],
      };
    },
  },
};

export default forms;

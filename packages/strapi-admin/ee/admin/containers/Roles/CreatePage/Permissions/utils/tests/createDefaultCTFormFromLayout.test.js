import createDefaultCTFormFromLayout, {
  createConditionsForm,
  createDefaultFormForProperty,
  createDefaultPropertiesForm,
  findLayouts,
} from '../createDefaultCTFormFromLayout';

const conditions = [
  {
    id: 'admin::is-creator',
    displayName: 'Is creator',
    category: 'default',
  },
  {
    id: 'admin::has-same-role-as-creator',
    displayName: 'Has same role as creator',
    category: 'default',
  },
];

describe('ADMIN | COMPONENTS | Permissions | utils', () => {
  describe('createConditionGorm', () => {
    it('should return an object with all the values set to false', () => {
      const expected = {
        'admin::is-creator': false,
        'admin::has-same-role-as-creator': false,
      };

      expect(createConditionsForm(conditions)).toEqual(expected);
    });
  });

  describe('createDefaultFormForProperty,', () => {
    it('should return an object with keys corresponding to the property value and all the values set to false', () => {
      const data = {
        children: [
          {
            value: 'foo',
          },
          {
            value: 'bar',
          },
        ],
      };
      const expected = {
        foo: false,
        bar: false,
      };

      expect(createDefaultFormForProperty(data)).toEqual(expected);
    });

    it('should create the default form for a complex object', () => {
      const data = {
        children: [
          {
            value: 'foo',
          },
          {
            value: 'bar',
            children: [
              {
                value: 'name',
              },
              {
                value: 'foo',
                children: [
                  {
                    value: 'bar',
                  },
                ],
              },
            ],
          },
        ],
      };
      const expected = {
        foo: false,
        bar: {
          name: false,
          foo: {
            bar: false,
          },
        },
      };

      expect(createDefaultFormForProperty(data)).toEqual(expected);
    });
  });

  describe('createDefaultCTFormFromLayout', () => {
    it('should return an object', () => {
      const subjects = [];

      expect(createDefaultCTFormFromLayout(subjects, [])).toEqual({});
    });

    it('should create the default form for a simple layout', () => {
      const actions = [
        {
          label: 'Create',
          actionId: 'content-manager.explorer.create',
          subjects: ['address'],
          applyToProperties: ['fields', 'locales'],
        },
        {
          label: 'Read',
          actionId: 'content-manager.explorer.read',
          subjects: ['address'],
        },
        {
          label: 'Delete',
          actionId: 'content-manager.explorer.delete',
          subjects: [],
        },
      ];

      const subjects = [
        {
          uid: 'address',
          label: 'Address',
          properties: [
            {
              label: 'Fields',
              value: 'fields',
              children: [
                {
                  label: 'POST',
                  value: 'postal_coder',
                  required: true,
                },
                {
                  label: 'categories',
                  value: 'categories',
                },
                {
                  label: 'cover',
                  value: 'cover',
                },
                {
                  label: 'images',
                  value: 'images',
                },
                {
                  label: 'city',
                  value: 'city',
                },
              ],
            },
          ],
        },
      ];

      const expected = {
        address: {
          'content-manager.explorer.create': {
            fields: {
              postal_coder: false,
              categories: false,
              cover: false,
              images: false,
              city: false,
            },
            conditions: {
              'admin::is-creator': false,
              'admin::has-same-role-as-creator': false,
            },
          },
          'content-manager.explorer.read': {
            enabled: false,
            conditions: {
              'admin::is-creator': false,
              'admin::has-same-role-as-creator': false,
            },
          },
        },
      };

      expect(createDefaultCTFormFromLayout({ subjects }, actions, conditions)).toEqual(expected);
    });

    it('should create the default form a complex layout...', () => {
      const subjects = [
        {
          uid: 'address',
          label: 'Address',
          properties: [
            {
              label: 'Fields',
              value: 'fields',
              children: [
                {
                  label: 'POST',
                  value: 'postal_coder',
                  required: true,
                },
                {
                  label: 'categories',
                  value: 'categories',
                },
                {
                  label: 'cover',
                  value: 'cover',
                },
                {
                  label: 'images',
                  value: 'images',
                },
                {
                  label: 'city',
                  value: 'city',
                },
              ],
            },
          ],
        },
        {
          uid: 'restaurant',
          label: 'Restaurant',
          properties: [
            {
              label: 'Fields',
              value: 'fields',
              children: [
                {
                  label: 'f1',
                  value: 'f1',
                  required: true,
                },
                {
                  label: 'f2',
                  value: 'f2',
                },
                {
                  // nested compo
                  label: 'services',
                  value: 'services',
                  children: [
                    {
                      label: 'name',
                      value: 'name',
                    },
                    {
                      label: 'media',
                      value: 'media',
                      required: true,
                    },
                    {
                      label: 'closing',
                      value: 'closing',
                      children: [
                        {
                          label: 'name',
                          value: 'name',
                          children: [{ label: 'test', value: 'test' }],
                        },
                      ],
                    },
                  ],
                },
                {
                  label: 'dz',
                  value: 'dz',
                },
                {
                  label: 'relation',
                  value: 'relation',
                },
              ],
            },
            {
              label: 'Locales',
              value: 'locales',
              children: [
                {
                  label: 'French',
                  value: 'fr',
                },
                {
                  label: 'English',
                  required: true,
                  value: 'en',
                },
              ],
            },
          ],
        },
      ];
      const actions = [
        {
          label: 'Create',
          actionId: 'content-manager.explorer.create',
          subjects: ['address', 'restaurant'],
          applyToProperties: ['fields', 'locales'],
        },
        {
          label: 'Read',
          actionId: 'content-manager.explorer.read',
          subjects: ['address'],
        },
        {
          label: 'Delete',
          actionId: 'content-manager.explorer.delete',
          subjects: ['restaurant'],
          applyToProperties: ['locales'],
        },
      ];

      const expected = {
        address: {
          'content-manager.explorer.create': {
            fields: {
              postal_coder: false,
              categories: false,
              cover: false,
              images: false,
              city: false,
            },
            conditions: {
              'admin::is-creator': false,
              'admin::has-same-role-as-creator': false,
            },
          },
          'content-manager.explorer.read': {
            enabled: false,
            conditions: {
              'admin::is-creator': false,
              'admin::has-same-role-as-creator': false,
            },
          },
        },
        restaurant: {
          'content-manager.explorer.create': {
            fields: {
              f1: false,
              f2: false,
              services: { name: false, media: false, closing: { name: { test: false } } },
              dz: false,
              relation: false,
            },
            locales: {
              en: false,
              fr: false,
            },
            conditions: {
              'admin::is-creator': false,
              'admin::has-same-role-as-creator': false,
            },
          },
          'content-manager.explorer.delete': {
            locales: {
              en: false,
              fr: false,
            },
            conditions: {
              'admin::is-creator': false,
              'admin::has-same-role-as-creator': false,
            },
          },
        },
      };

      expect(createDefaultCTFormFromLayout({ subjects }, actions, conditions)).toEqual(expected);
    });
  });

  describe('createDefaultPropertiesForm', () => {
    it('should return an object with the values set to false', () => {
      const applyToProperties = ['fields'];
      const ctLayout = {
        properties: [
          { value: 'fields', children: [{ value: 'name' }] },
          { value: 'locales', children: [{ value: 'en' }] },
        ],
      };

      const expected = {
        fields: {
          name: false,
        },
      };

      expect(createDefaultPropertiesForm(applyToProperties, ctLayout)).toEqual(expected);
    });
  });

  describe('findLayouts', () => {
    it('should return an object containing only the content types find in the subjects array', () => {
      const subjects = ['found'];
      const layouts = [
        {
          uid: 'test',
        },
        { uid: 'found' },
        { uid: 'not-found' },
      ];

      expect(findLayouts(layouts, subjects)).toEqual({ found: { uid: 'found' } });
    });
  });
});

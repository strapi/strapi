import createDefaultCTFormFromLayout from '../createDefaultCTFormFromLayout';

describe('ADMIN | COMPONENTS | Permissions | utils | createDefaultCTFormFromLayout', () => {
  it('should return an object', () => {
    const subjects = [];

    expect(createDefaultCTFormFromLayout(subjects, [])).toEqual({});
  });

  it('should create the default form for a simple layout', () => {
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
});

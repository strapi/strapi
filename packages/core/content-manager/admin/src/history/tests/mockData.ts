import type { UID } from '@strapi/types';

const HISTORY_VERSIONS_MOCK_DATA = {
  data: [
    {
      id: 26,
      documentId: 'pcwmq3rlmp5w0be3cuplhnpr',
      contentType: 'api::kitchensink.kitchensink' as UID.ContentType,
      relatedDocumentId: 'b2t6guwt3z4cdfb4sufuswry',
      locale: null,
      status: 'draft' as const,
      data: {
        short_text: 'ktchnsnk',
        long_text:
          'Certainly! Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ac libero ac urna dictum eleifend. Nullam quis hendrerit dolor. Integer et bibendum mi. Sed at tristique lacus. Proin fermentum, neque eu sodales gravida, sem ex fringilla justo, at ultricies purus urna ac dui. Nulla facilisi.',
        rich_text:
          '\nCertainly! Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ac libero ac urna dictum eleifend. Nullam quis hendrerit dolor. Integer et bibendum mi. Sed at tristique lacus. Proin fermentum, neque eu sodales gravida, sem ex fringilla justo, at ultricies purus urna ac dui. Nulla facilisi.\n\nVivamus auctor justo nec massa varius, in consectetur justo cursus. Ut auctor accumsan tortor, nec convallis odio tempor eu. Sed venenatis dolor ut velit cursus, a aliquet metus ultricies. Curabitur pharetra nunc et neque faucibus, a euismod felis accumsan. Aliquam erat volutpat. Aenean vel justo ut urna fermentum pulvinar.\n\nPellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Integer ac justo sed metus tincidunt facilisis. Quisque vitae efficitur mi. In hac habitasse platea dictumst. Duis tincidunt elit id velit feugiat, ut hendrerit elit convallis. Suspendisse potenti. Sed in nisl a lacus varius fermentum.',
        integer: 303,
        biginteger: '30330030405050503000',
        decimal: 1.02,
        float: 3.30303,
        date: '2024-01-17',
        datetime: '2024-01-02T23:45:00.000Z',
        time: '00:45:00.000',
        timestamp: null,
        boolean: true,
        email: 'repeorpeo@test.com',
        enumeration: 'C',
        json: {
          marsu: 'pilami',
        },
        custom_field: null,
        custom_field_with_default_options: null,
        blocks: [
          {
            type: 'heading',
            children: [
              {
                type: 'text',
                text: 'My kitchen sink',
              },
            ],
            level: 1,
          },
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: 'Has all you need! ',
              },
            ],
          },
          {
            type: 'list',
            format: 'unordered',
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'a knife',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'some food',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'a mirror',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'a suitcase',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'umbrella',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'gun',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'icecream',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'banana',
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: '',
              },
            ],
          },
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: '',
              },
            ],
          },
        ],
        single_media: 1,
        multiple_media: [
          {
            id: 2,
            name: 'Screenshot 2023-10-18 at 15.03.11.png',
            alternativeText: null,
            caption: null,
            width: 437,
            height: 420,
            formats: {
              thumbnail: {
                name: 'thumbnail_Screenshot 2023-10-18 at 15.03.11.png',
                hash: 'thumbnail_Screenshot_2023_10_18_at_15_03_11_c6d21f899b',
                ext: '.png',
                mime: 'image/png',
                path: null,
                width: 162,
                height: 156,
                size: 45.75,
                url: '/uploads/thumbnail_Screenshot_2023_10_18_at_15_03_11_c6d21f899b.png',
              },
            },
            hash: 'Screenshot_2023_10_18_at_15_03_11_c6d21f899b',
            ext: '.png',
            mime: 'image/png',
            size: 47.67,
            url: '/uploads/Screenshot_2023_10_18_at_15_03_11_c6d21f899b.png',
            previewUrl: null,
            provider: 'local',
            provider_metadata: null,
            folderPath: '/',
            createdAt: '2023-10-18T15:54:33.504Z',
            updatedAt: '2023-11-29T14:11:39.636Z',
            documentId: null,
            publishedAt: null,
            locale: null,
            folder: null,
          },
          {
            id: 1,
            name: 'sad-paddington.png',
            alternativeText: null,
            caption: null,
            width: 768,
            height: 768,
            formats: {
              thumbnail: {
                name: 'thumbnail_sad-paddington.png',
                hash: 'thumbnail_sad_paddington_77bd2665be',
                ext: '.png',
                mime: 'image/png',
                path: null,
                width: 156,
                height: 156,
                size: 15.41,
                url: '/uploads/thumbnail_sad_paddington_77bd2665be.png',
              },
              small: {
                name: 'small_sad-paddington.png',
                hash: 'small_sad_paddington_77bd2665be',
                ext: '.png',
                mime: 'image/png',
                path: null,
                width: 500,
                height: 500,
                size: 110.82,
                url: '/uploads/small_sad_paddington_77bd2665be.png',
              },
              medium: {
                name: 'medium_sad-paddington.png',
                hash: 'medium_sad_paddington_77bd2665be',
                ext: '.png',
                mime: 'image/png',
                path: null,
                width: 750,
                height: 750,
                size: 211.3,
                url: '/uploads/medium_sad_paddington_77bd2665be.png',
              },
            },
            hash: 'sad_paddington_77bd2665be',
            ext: '.png',
            mime: 'image/png',
            size: 57.56,
            url: '/uploads/sad_paddington_77bd2665be.png',
            previewUrl: null,
            provider: 'local',
            provider_metadata: null,
            folderPath: '/',
            createdAt: '2023-10-18T07:49:02.880Z',
            updatedAt: '2023-11-29T14:07:06.759Z',
            documentId: null,
            publishedAt: null,
            locale: null,
            folder: null,
          },
        ],
        single_compo: {
          id: 1,
          name: 'Milhouse',
          test: 'plop',
          __temp_key__: 0,
        },
        repeatable_compo: [],
        dynamiczone: [],
        one_way_tag: {
          disconnect: [],
          connect: [],
        },
        one_to_one_tag: {
          disconnect: [],
          connect: [],
        },
        one_to_many_tags: {
          disconnect: [],
          connect: [],
        },
        many_to_one_tag: {
          disconnect: [],
          connect: [],
        },
        many_to_many_tags: {
          disconnect: [],
          connect: [],
        },
        many_way_tags: {
          disconnect: [],
          connect: [],
        },
        morph_to_one: null,
        morph_to_many: [],
        cats: [
          {
            __component: 'basic.simple',
            id: 2,
            name: 'Barney',
            test: 'plop',
            __temp_key__: 0,
          },
        ],
      },
      schema: {
        short_text: {
          type: 'string',
        },
        long_text: {
          type: 'text',
        },
        rich_text: {
          type: 'richtext',
        },
        blocks: {
          type: 'blocks',
        },
        integer: {
          type: 'integer',
        },
        biginteger: {
          type: 'biginteger',
        },
        decimal: {
          type: 'decimal',
        },
        float: {
          type: 'float',
        },
        date: {
          type: 'date',
        },
        datetime: {
          type: 'datetime',
        },
        time: {
          type: 'time',
        },
        timestamp: {
          type: 'timestamp',
        },
        boolean: {
          type: 'boolean',
        },
        email: {
          type: 'email',
        },
        password: {
          type: 'password',
        },
        enumeration: {
          type: 'enumeration',
          enum: ['A', 'B', 'C', 'D', 'E'],
        },
        single_media: {
          type: 'media',
          multiple: false,
          required: false,
          allowedTypes: ['images', 'files', 'videos'],
        },
        multiple_media: {
          type: 'media',
          multiple: true,
          required: false,
          allowedTypes: ['images', 'files', 'videos'],
        },
        json: {
          type: 'json',
        },
        single_compo: {
          type: 'component',
          repeatable: false,
          component: 'basic.simple',
        },
        repeatable_compo: {
          type: 'component',
          repeatable: true,
          component: 'basic.simple',
        },
        dynamiczone: {
          type: 'dynamiczone',
          components: ['basic.simple', 'blog.test-como', 'default.closingperiod'],
        },
        one_way_tag: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::tag.tag',
        },
        one_to_one_tag: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::tag.tag',
          private: true,
          inversedBy: 'one_to_one_kitchensink',
        },
        one_to_many_tags: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::tag.tag',
          mappedBy: 'many_to_one_kitchensink',
        },
        many_to_one_tag: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::tag.tag',
          inversedBy: 'one_to_many_kitchensinks',
        },
        many_to_many_tags: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::tag.tag',
          inversedBy: 'many_to_many_kitchensinks',
        },
        many_way_tags: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::tag.tag',
        },
        morph_to_one: {
          type: 'relation',
          relation: 'morphToOne',
        },
        morph_to_many: {
          type: 'relation',
          relation: 'morphToMany',
        },
        custom_field: {
          type: 'string',
          customField: 'plugin::color-picker.color',
        },
        custom_field_with_default_options: {
          type: 'string',
          regex: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
          customField: 'plugin::color-picker.color',
        },
        cats: {
          type: 'dynamiczone',
          components: ['basic.relation', 'basic.simple'],
        },
      },
      createdAt: '2024-02-01T13:13:40.157Z',
      updatedAt: '2024-02-01T13:13:40.157Z',
      publishedAt: '2024-02-01T13:13:40.159Z',
      createdBy: {
        id: 2,
        firstname: 'John',
        lastname: 'Doe',
        username: 'johndoe',
        email: 'johndoe@test.com',
      },
    },
    {
      id: 25,
      documentId: 'xsaucvmlbrc70th6oessklbe',
      contentType: 'api::kitchensink.kitchensink' as UID.ContentType,
      relatedDocumentId: 'b2t6guwt3z4cdfb4sufuswry',
      locale: null,
      status: 'draft' as const,
      data: {
        short_text: 'ktchnsnk',
        long_text:
          'Certainly! Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ac libero ac urna dictum eleifend. Nullam quis hendrerit dolor. Integer et bibendum mi. Sed at tristique lacus. Proin fermentum, neque eu sodales gravida, sem ex fringilla justo, at ultricies purus urna ac dui. Nulla facilisi.',
        rich_text:
          '\nCertainly! Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ac libero ac urna dictum eleifend. Nullam quis hendrerit dolor. Integer et bibendum mi. Sed at tristique lacus. Proin fermentum, neque eu sodales gravida, sem ex fringilla justo, at ultricies purus urna ac dui. Nulla facilisi.\n\nVivamus auctor justo nec massa varius, in consectetur justo cursus. Ut auctor accumsan tortor, nec convallis odio tempor eu. Sed venenatis dolor ut velit cursus, a aliquet metus ultricies. Curabitur pharetra nunc et neque faucibus, a euismod felis accumsan. Aliquam erat volutpat. Aenean vel justo ut urna fermentum pulvinar.\n\nPellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Integer ac justo sed metus tincidunt facilisis. Quisque vitae efficitur mi. In hac habitasse platea dictumst. Duis tincidunt elit id velit feugiat, ut hendrerit elit convallis. Suspendisse potenti. Sed in nisl a lacus varius fermentum.',
        integer: 303,
        biginteger: '30330030405050503000',
        decimal: 1.02,
        float: 3.30303,
        date: '2024-01-17',
        datetime: '2024-01-02T23:45:00.000Z',
        time: '00:45:00.000',
        timestamp: null,
        boolean: true,
        email: 'repeorpeo@test.com',
        enumeration: 'C',
        json: {
          marsu: 'pilami',
        },
        custom_field: null,
        custom_field_with_default_options: null,
        blocks: [
          {
            type: 'heading',
            children: [
              {
                type: 'text',
                text: 'My kitchen sink',
              },
            ],
            level: 1,
          },
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: 'Has all you need! ',
              },
            ],
          },
          {
            type: 'list',
            format: 'unordered',
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'a knife',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'some food',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'a mirror',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'a suitcase',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'umbrella',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'gun',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'icecream',
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: '',
              },
            ],
          },
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                text: '',
              },
            ],
          },
        ],
        single_media: 1,
        multiple_media: [
          {
            id: 2,
            name: 'Screenshot 2023-10-18 at 15.03.11.png',
            alternativeText: null,
            caption: null,
            width: 437,
            height: 420,
            formats: {
              thumbnail: {
                name: 'thumbnail_Screenshot 2023-10-18 at 15.03.11.png',
                hash: 'thumbnail_Screenshot_2023_10_18_at_15_03_11_c6d21f899b',
                ext: '.png',
                mime: 'image/png',
                path: null,
                width: 162,
                height: 156,
                size: 45.75,
                url: '/uploads/thumbnail_Screenshot_2023_10_18_at_15_03_11_c6d21f899b.png',
              },
            },
            hash: 'Screenshot_2023_10_18_at_15_03_11_c6d21f899b',
            ext: '.png',
            mime: 'image/png',
            size: 47.67,
            url: '/uploads/Screenshot_2023_10_18_at_15_03_11_c6d21f899b.png',
            previewUrl: null,
            provider: 'local',
            provider_metadata: null,
            folderPath: '/',
            createdAt: '2023-10-18T15:54:33.504Z',
            updatedAt: '2023-11-29T14:11:39.636Z',
            documentId: null,
            publishedAt: null,
            locale: null,
            folder: null,
          },
          {
            id: 1,
            name: 'sad-paddington.png',
            alternativeText: null,
            caption: null,
            width: 768,
            height: 768,
            formats: {
              thumbnail: {
                name: 'thumbnail_sad-paddington.png',
                hash: 'thumbnail_sad_paddington_77bd2665be',
                ext: '.png',
                mime: 'image/png',
                path: null,
                width: 156,
                height: 156,
                size: 15.41,
                url: '/uploads/thumbnail_sad_paddington_77bd2665be.png',
              },
              small: {
                name: 'small_sad-paddington.png',
                hash: 'small_sad_paddington_77bd2665be',
                ext: '.png',
                mime: 'image/png',
                path: null,
                width: 500,
                height: 500,
                size: 110.82,
                url: '/uploads/small_sad_paddington_77bd2665be.png',
              },
              medium: {
                name: 'medium_sad-paddington.png',
                hash: 'medium_sad_paddington_77bd2665be',
                ext: '.png',
                mime: 'image/png',
                path: null,
                width: 750,
                height: 750,
                size: 211.3,
                url: '/uploads/medium_sad_paddington_77bd2665be.png',
              },
            },
            hash: 'sad_paddington_77bd2665be',
            ext: '.png',
            mime: 'image/png',
            size: 57.56,
            url: '/uploads/sad_paddington_77bd2665be.png',
            previewUrl: null,
            provider: 'local',
            provider_metadata: null,
            folderPath: '/',
            createdAt: '2023-10-18T07:49:02.880Z',
            updatedAt: '2023-11-29T14:07:06.759Z',
            documentId: null,
            publishedAt: null,
            locale: null,
            folder: null,
          },
        ],
        single_compo: {
          id: 1,
          name: 'Milhouse',
          test: 'plop',
          __temp_key__: 0,
        },
        repeatable_compo: [],
        dynamiczone: [],
        one_way_tag: {
          disconnect: [],
          connect: [],
        },
        one_to_one_tag: {
          disconnect: [],
          connect: [],
        },
        one_to_many_tags: {
          disconnect: [],
          connect: [],
        },
        many_to_one_tag: {
          disconnect: [],
          connect: [],
        },
        many_to_many_tags: {
          disconnect: [],
          connect: [],
        },
        many_way_tags: {
          disconnect: [],
          connect: [],
        },
        morph_to_one: null,
        morph_to_many: [],
        cats: [
          {
            __component: 'basic.simple',
            id: 2,
            name: 'Barney',
            test: 'plop',
            __temp_key__: 0,
          },
        ],
      },
      schema: {
        short_text: {
          type: 'string',
        },
        long_text: {
          type: 'text',
        },
        rich_text: {
          type: 'richtext',
        },
        blocks: {
          type: 'blocks',
        },
        integer: {
          type: 'integer',
        },
        biginteger: {
          type: 'biginteger',
        },
        decimal: {
          type: 'decimal',
        },
        float: {
          type: 'float',
        },
        date: {
          type: 'date',
        },
        datetime: {
          type: 'datetime',
        },
        time: {
          type: 'time',
        },
        timestamp: {
          type: 'timestamp',
        },
        boolean: {
          type: 'boolean',
        },
        email: {
          type: 'email',
        },
        password: {
          type: 'password',
        },
        enumeration: {
          type: 'enumeration',
          enum: ['A', 'B', 'C', 'D', 'E'],
        },
        single_media: {
          type: 'media',
          multiple: false,
          required: false,
          allowedTypes: ['images', 'files', 'videos'],
        },
        multiple_media: {
          type: 'media',
          multiple: true,
          required: false,
          allowedTypes: ['images', 'files', 'videos'],
        },
        json: {
          type: 'json',
        },
        single_compo: {
          type: 'component',
          repeatable: false,
          component: 'basic.simple',
        },
        repeatable_compo: {
          type: 'component',
          repeatable: true,
          component: 'basic.simple',
        },
        dynamiczone: {
          type: 'dynamiczone',
          components: ['basic.simple', 'blog.test-como', 'default.closingperiod'],
        },
        one_way_tag: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::tag.tag',
        },
        one_to_one_tag: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::tag.tag',
          private: true,
          inversedBy: 'one_to_one_kitchensink',
        },
        one_to_many_tags: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::tag.tag',
          mappedBy: 'many_to_one_kitchensink',
        },
        many_to_one_tag: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::tag.tag',
          inversedBy: 'one_to_many_kitchensinks',
        },
        many_to_many_tags: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::tag.tag',
          inversedBy: 'many_to_many_kitchensinks',
        },
        many_way_tags: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::tag.tag',
        },
        morph_to_one: {
          type: 'relation',
          relation: 'morphToOne',
        },
        morph_to_many: {
          type: 'relation',
          relation: 'morphToMany',
        },
        custom_field: {
          type: 'string',
          customField: 'plugin::color-picker.color',
        },
        custom_field_with_default_options: {
          type: 'string',
          regex: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
          customField: 'plugin::color-picker.color',
        },
        cats: {
          type: 'dynamiczone',
          components: ['basic.relation', 'basic.simple'],
        },
      },
      createdAt: '2024-01-31T15:58:01.572Z',
      updatedAt: '2024-01-31T15:58:01.572Z',
      publishedAt: '2024-01-31T15:58:01.572Z',
      createdBy: {
        id: 1,
        firstname: 'Kai',
        lastname: 'Doe',
        email: 'kaidoe@test.com',
      },
    },
  ],
  meta: {
    pagination: {
      page: 1,
      pageSize: 10,
      pageCount: 2,
      total: 14,
    },
  },
};

const mockHistoryVersionsData = {
  historyVersions: HISTORY_VERSIONS_MOCK_DATA,
} as const;

export { mockHistoryVersionsData };

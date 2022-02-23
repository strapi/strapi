import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('https://market-api.strapi.io/plugins', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        data: [
          {
            id: 'recQHmaveQknjaIdv',
            attributes: {
              name: 'Cloudflare pages',
              description:
                'This plugin lets you easily trigger Cloudflare Pages builds from Strapi.',
              slug: 'strapi-plugin-cloudflare-pages',
              npmPackageName: 'strapi-plugin-cloudflare-pages',
              npmPackageUrl: 'https://www.npmjs.com/package/strapi-plugin-cloudflare-pages',
              repositoryUrl: 'https://github.com/sarhugo/strapi-plugin-cloudflare-pages',
              logo: {
                id: 'attzLRKpax5MIrMtq',
                width: 160,
                height: 160,
                url:
                  'https://dl.airtable.com/.attachments/3e586bbcdd7dc2effc3770fd49506aa6/ddbb2540/cf-logo-v-rgb.jpg',
                filename: 'cf-logo-v-rgb.jpg',
                size: 25615,
                type: 'image/jpeg',
                thumbnails: {
                  small: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/aa98b52525fdeb5767cf554563a9df14/7a03d156',
                    width: 36,
                    height: 36,
                  },
                  large: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/a0e91d3564a0f41d89799e352b06c8ee/3d45329e',
                    width: 160,
                    height: 160,
                  },
                  full: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/20b4afecf2bf8bc081c54eae92a7f599/d1e10f39',
                    width: 3000,
                    height: 3000,
                  },
                },
              },
              developerName: 'Hugo Sarti',
              validated: false,
              strapiCompatibility: 'v3',
            },
          },
          {
            id: 'recWQXzTM5e6Friiq',
            attributes: {
              name: 'Comments',
              description: 'Powerful Strapi based comments moderation tool for you and your users',
              slug: 'strapi-plugin-comments',
              npmPackageName: 'strapi-plugin-comments',
              npmPackageUrl: 'https://www.npmjs.com/package/strapi-plugin-comments',
              repositoryUrl: 'https://github.com/VirtusLab-Open-Source/strapi-plugin-comments',
              logo: {
                id: 'att1xGwmQzDOC2UwY',
                width: 1080,
                height: 1080,
                url:
                  'https://dl.airtable.com/.attachments/eb4cd59876565af77c9c3e5966b59f10/2111bfc8/vl_strapi-comments.png',
                filename: 'vl_strapi-comments.png',
                size: 344804,
                type: 'image/png',
                thumbnails: {
                  small: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/92ec34110ff65c0993eac95a4f9ee906/76443a36',
                    width: 36,
                    height: 36,
                  },
                  large: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/5136e180187206b2a90bfa9a5ca65149/64187ef0',
                    width: 512,
                    height: 512,
                  },
                  full: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/4c3fdf040d05779adf251a737adcae55/590ff600',
                    width: 3000,
                    height: 3000,
                  },
                },
              },
              screenshots: [
                {
                  id: 'att4y0AbotGdAOdEJ',
                  width: 1920,
                  height: 1080,
                  url:
                    'https://dl.airtable.com/.attachments/f6316615095b33ce67700a3810c1869c/a13c0ef1/screens.png',
                  filename: 'screens.png',
                  size: 625578,
                  type: 'image/png',
                  thumbnails: {
                    small: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/2ff8cdfc0f4c215ae63e96f21281b93d/d817fa87',
                      width: 64,
                      height: 36,
                    },
                    large: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/4ecf8b86b1af9061bcdf90f42253531b/1a88263e',
                      width: 910,
                      height: 512,
                    },
                    full: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/1f51a4dca550912863c9d43a8052ab77/e4fa5ec5',
                      width: 3000,
                      height: 3000,
                    },
                  },
                },
                {
                  id: 'att3k9vSnVo0KFSEA',
                  width: 2880,
                  height: 1578,
                  url:
                    'https://dl.airtable.com/.attachments/a3c3451815e017baa04f4b92f26c29ef/243d8656/Screenshot2022-01-27at07.48.19.png',
                  filename: 'Screenshot 2022-01-27 at 07.48.19.png',
                  size: 1545826,
                  type: 'image/png',
                  thumbnails: {
                    small: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/51d91e1e39eacf40f05fa193d367a306/1dbd8409',
                      width: 66,
                      height: 36,
                    },
                    large: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/392a6d72b82000b0b84d58c40319d3a0/2ccc6e5b',
                      width: 934,
                      height: 512,
                    },
                    full: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/45fc5b9d4bc83d2ef5e0aa36d2918b8d/a05010ef',
                      width: 3000,
                      height: 3000,
                    },
                  },
                },
                {
                  id: 'attKuQmvrbDnp1tm1',
                  width: 2880,
                  height: 1582,
                  url:
                    'https://dl.airtable.com/.attachments/d75abd544b3710060288547049d7bf22/1412b396/Screenshot2022-01-27at07.48.37.png',
                  filename: 'Screenshot 2022-01-27 at 07.48.37.png',
                  size: 1282068,
                  type: 'image/png',
                  thumbnails: {
                    small: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/c41517eac949e0da38f0f19344fe875b/cec423d6',
                      width: 66,
                      height: 36,
                    },
                    large: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/e7881ee4b0b75fc0f2d40c53efa94b01/6513dcc2',
                      width: 932,
                      height: 512,
                    },
                    full: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/60d7b535cc8b579ee09a64ce23ec607e/954df7b1',
                      width: 3000,
                      height: 3000,
                    },
                  },
                },
                {
                  id: 'att3iUd2fPh6xgsU4',
                  width: 2880,
                  height: 1580,
                  url:
                    'https://dl.airtable.com/.attachments/87efb22ce60c67971a16bac929bb24aa/ef2da9b7/Screenshot2022-01-27at07.48.47.png',
                  filename: 'Screenshot 2022-01-27 at 07.48.47.png',
                  size: 1386662,
                  type: 'image/png',
                  thumbnails: {
                    small: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/8e7ddb79f9ff320235a029df98872d74/85632ae0',
                      width: 66,
                      height: 36,
                    },
                    large: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/6d6ad9667c04b08709dc3e6f2f68f064/da46238e',
                      width: 933,
                      height: 512,
                    },
                    full: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/ebd28cadcab85bd217b066eeeb113723/6267c7e1',
                      width: 3000,
                      height: 3000,
                    },
                  },
                },
                {
                  id: 'attSRD1UvyPislYg4',
                  width: 2880,
                  height: 1580,
                  url:
                    'https://dl.airtable.com/.attachments/3b104067762dedac336a938f57676f93/4deb3bae/Screenshot2022-01-27at07.48.07.png',
                  filename: 'Screenshot 2022-01-27 at 07.48.07.png',
                  size: 1282540,
                  type: 'image/png',
                  thumbnails: {
                    small: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/c215d62e79d7d13d2c40016f3118a979/37e7af8e',
                      width: 66,
                      height: 36,
                    },
                    large: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/4895150e0da9ba7edfa32cf2348d79cb/f5e8af82',
                      width: 933,
                      height: 512,
                    },
                    full: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/8e7a00bd492421447458cd2ee739aba2/bc5f3759',
                      width: 3000,
                      height: 3000,
                    },
                  },
                },
              ],
              developerName: 'Mateusz Ziarko',
              validated: false,
              strapiCompatibility: 'v4',
            },
          },
          {
            id: 'rec0KouDUCBhydNW6',
            attributes: {
              name: 'Config Sync',
              description:
                'Migrate your config data across environments using the CLI or Strapi admin panel.',
              slug: 'strapi-plugin-config-sync',
              npmPackageName: 'strapi-plugin-config-sync',
              npmPackageUrl: 'https://www.npmjs.com/package/strapi-plugin-config-sync',
              repositoryUrl: 'https://github.com/boazpoolman/strapi-plugin-config-sync',
              logo: {
                id: 'att6OefK4471IpCZ5',
                width: 320,
                height: 320,
                url:
                  'https://dl.airtable.com/.attachments/e23a7231d12cce89cb4b05cbfe759d45/96f5f496/Screenshot2021-12-09at22.15.37.png',
                filename: 'Screenshot 2021-12-09 at 22.15.37.png',
                size: 11580,
                type: 'image/png',
                thumbnails: {
                  small: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/2f69cd2d5a884ad733c2e18bbe3d2e39/9cf40c6f',
                    width: 36,
                    height: 36,
                  },
                  large: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/8301d585b4aaa2977fa1e007feb02a17/1d121e13',
                    width: 320,
                    height: 320,
                  },
                  full: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/15d442f81a47ff6ff002fd25ce6788d6/395c8aea',
                    width: 3000,
                    height: 3000,
                  },
                },
              },
              screenshots: [
                {
                  id: 'att0QiAtNRfoz3mwF',
                  width: 2206,
                  height: 1284,
                  url:
                    'https://dl.airtable.com/.attachments/b6afdee7abfbf5c63ef3d2de243f99a4/a5f3f48c/config-diff.png',
                  filename: 'config-diff.png',
                  size: 332901,
                  type: 'image/png',
                  thumbnails: {
                    small: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/2135d552f535ead55971c9ae016bb178/5b71c76e',
                      width: 62,
                      height: 36,
                    },
                    large: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/4b972ba187e2bd589c10987871ef00df/35f22c62',
                      width: 880,
                      height: 512,
                    },
                    full: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/3b88bba22b7d9d9ec456bf849efeac53/423f1a93',
                      width: 3000,
                      height: 3000,
                    },
                  },
                },
              ],
              developerName: 'Boaz Poolman',
              validated: true,
              strapiCompatibility: 'v4',
            },
          },
          {
            id: 'rec0Z7KLBCtaD6rC3',
            attributes: {
              name: 'Content Versioning',
              description:
                'This plugin enables you to versioning Content Types. It allows multiple draft versions✅ Keeps history of all changes (with time travel) ✅ ',
              slug: '@notum-cz-strapi-plugin-content-versioning',
              npmPackageName: '@notum-cz/strapi-plugin-content-versioning',
              npmPackageUrl:
                'https://www.npmjs.com/package/@notum-cz/strapi-plugin-content-versioning',
              repositoryUrl: 'https://github.com/notum-cz/strapi-plugin-content-versioning',
              logo: {
                id: 'attaMdJdER0feFBuX',
                width: 1280,
                height: 1280,
                url:
                  'https://dl.airtable.com/.attachments/0b86f18e2606ed7f53bd54d536a1bea5/13a87f30/Artboard7copy.png',
                filename: 'Artboard 7 copy.png',
                size: 35705,
                type: 'image/png',
                thumbnails: {
                  small: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/4c0179127f923c0ce01866c92e9664a8/347fbe74',
                    width: 36,
                    height: 36,
                  },
                  large: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/0edca5708e30dc9fce6c962dcc28dbce/39b83021',
                    width: 512,
                    height: 512,
                  },
                  full: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/a44ea395865d5f6ba71dbcae814cfc83/31c3fffc',
                    width: 3000,
                    height: 3000,
                  },
                },
              },
              screenshots: [
                {
                  id: 'attGD52ggRIgnsUKp',
                  width: 1920,
                  height: 1080,
                  url:
                    'https://dl.airtable.com/.attachments/50126ddff8ef4ed7b7a693ecd156ae60/b6a9a4a6/Novprojekt15.png',
                  filename: 'Nový projekt (15).png',
                  size: 52163,
                  type: 'image/png',
                  thumbnails: {
                    small: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/60382a6542a77f90594526b68fe5182c/f54e7675',
                      width: 64,
                      height: 36,
                    },
                    large: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/05deee4e93b9b57e9cd4465e2c6622f1/1b377c4a',
                      width: 910,
                      height: 512,
                    },
                    full: {
                      url:
                        'https://dl.airtable.com/.attachmentThumbnails/87ef842cda9b0647e7dd4d2f8a086379/303ecd98',
                      width: 3000,
                      height: 3000,
                    },
                  },
                },
              ],
              developerName: 'Ondřej Janošík',
              validated: false,
              strapiCompatibility: 'v4',
            },
          },
          {
            id: 'recwrVXGrUoOHdSlO',
            attributes: {
              name: 'Documentation',
              description: 'Create an OpenAPI Document and visualize your API with SWAGGER UI',
              slug: '@strapi-plugin-documentation',
              npmPackageName: '@strapi/plugin-documentation',
              npmPackageUrl: 'https://www.npmjs.com/package/@strapi/plugin-documentation',
              repositoryUrl:
                'https://github.com/strapi/strapi/tree/master/packages/plugins/documentation',
              logo: {
                id: 'att22dETRlzkfVWAl',
                width: 225,
                height: 225,
                url:
                  'https://dl.airtable.com/.attachments/b6998ac52e8b0460b8a14ced8074b788/2a4d4a90/swagger.png',
                filename: 'swagger.png',
                size: 6052,
                type: 'image/png',
                thumbnails: {
                  small: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/71a6b03e03a6b26647991a617478cdfa/8e1d8d2b',
                    width: 36,
                    height: 36,
                  },
                  large: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/c249c4953d5bb0e2f58ed7174afecc2f/796dca09',
                    width: 225,
                    height: 225,
                  },
                  full: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/4b7bc3a765f3927b9fcd12809ddf82a8/d3a4b97b',
                    width: 3000,
                    height: 3000,
                  },
                },
              },
              developerName: 'Strapi team',
              validated: true,
              strapiCompatibility: 'v4',
            },
          },
          {
            id: 'recqR0rWAw5gZHc1c',
            attributes: {
              name: 'Documentation v3',
              description: 'Create an OpenAPI Document and visualize your API with SWAGGER UI',
              slug: 'strapi-plugin-documentation',
              npmPackageName: 'strapi-plugin-documentation',
              npmPackageUrl: 'https://www.npmjs.com/package/strapi-plugin-documentation',
              repositoryUrl:
                'https://github.com/strapi/strapi/tree/v3.6.9/packages/strapi-plugin-documentation',
              logo: {
                id: 'att22dETRlzkfVWAl',
                width: 225,
                height: 225,
                url:
                  'https://dl.airtable.com/.attachments/b6998ac52e8b0460b8a14ced8074b788/2a4d4a90/swagger.png',
                filename: 'swagger.png',
                size: 6052,
                type: 'image/png',
                thumbnails: {
                  small: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/71a6b03e03a6b26647991a617478cdfa/8e1d8d2b',
                    width: 36,
                    height: 36,
                  },
                  large: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/c249c4953d5bb0e2f58ed7174afecc2f/796dca09',
                    width: 225,
                    height: 225,
                  },
                  full: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/4b7bc3a765f3927b9fcd12809ddf82a8/d3a4b97b',
                    width: 3000,
                    height: 3000,
                  },
                },
              },
              developerName: 'Strapi team',
              validated: true,
              strapiCompatibility: 'v3',
            },
          },
          {
            id: 'rec5s49X99wA67Ubj',
            attributes: {
              name: 'Transformer',
              description:
                'A plugin for Strapi Headless CMS that provides the ability to transform the API response. ',
              slug: 'strapi-plugin-transformer',
              npmPackageName: 'strapi-plugin-transformer',
              npmPackageUrl: 'https://www.npmjs.com/package/strapi-plugin-transformer',
              repositoryUrl: 'https://github.com/ComfortablyCoding/strapi-plugin-transformer',
              logo: {
                id: 'attbggDs1BgpGByTz',
                width: 158,
                height: 158,
                url:
                  'https://dl.airtable.com/.attachments/5ffd1782a2fabf423ccd6f56c562f31a/b8f8598f/transformer-logo.png',
                filename: 'transformer-logo.png',
                size: 5787,
                type: 'image/png',
                thumbnails: {
                  small: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/53ee41b18d2f704257a483ea17de9020/07cabde5',
                    width: 36,
                    height: 36,
                  },
                  large: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/46185b0bddbd1684ac02d12d490a621b/37a04f6c',
                    width: 158,
                    height: 158,
                  },
                  full: {
                    url:
                      'https://dl.airtable.com/.attachmentThumbnails/1a6e9c656aacaca5536abbe2c2964d30/5e904c9c',
                    width: 3000,
                    height: 3000,
                  },
                },
              },
              developerName: 'Daedalus',
              validated: false,
              strapiCompatibility: 'v4',
            },
          },
        ],
      })
    );
  }),

  rest.get('*/admin/plugins', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        plugins: [
          {
            name: 'content-manager',
            displayName: 'Content Manager',
            description: 'Quick way to see, edit and delete the data in your database.',
          },
          {
            name: 'content-type-builder',
            displayName: 'Content Type Builder',
            description:
              'Modelize the data structure of your API. Create new fields and relations in just a minute. The files are automatically created and updated in your project.',
          },
          {
            name: 'email',
            displayName: 'Email',
            description: 'Configure your application to send emails.',
          },
          {
            name: 'upload',
            displayName: 'Media Library',
            description: 'Media file management.',
          },
          {
            name: 'graphql',
            displayName: 'GraphQL',
            description: 'Adds GraphQL endpoint with default API methods.',
            packageName: '@strapi/plugin-graphql',
          },
          {
            name: 'documentation',
            displayName: 'Documentation',
            description: 'Create an OpenAPI Document and visualize your API with SWAGGER UI.',
            packageName: '@strapi/plugin-documentation',
          },
          {
            name: 'my-plugin',
            displayName: 'my-plugin',
            description: 'Description of my plugin.',
          },
          {
            name: 'i18n',
            displayName: 'Internationalization',
            description:
              'This plugin enables to create, to read and to update content in different languages, both from the Admin Panel and from the API.',
            packageName: '@strapi/plugin-i18n',
          },
          {
            name: 'sentry',
            displayName: 'Sentry',
            description: 'Send Strapi error events to Sentry.',
            packageName: '@strapi/plugin-sentry',
          },
          {
            name: 'users-permissions',
            displayName: 'Roles & Permissions',
            description:
              'Protect your API with a full authentication process based on JWT. This plugin comes also with an ACL strategy that allows you to manage the permissions between the groups of users.',
            packageName: '@strapi/plugin-users-permissions',
          },
        ],
      })
    );
  }),

  rest.get('*/admin/information', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        data: {
          currentEnvironment: 'development',
          autoReload: true,
          strapiVersion: '4.1.0',
          nodeVersion: 'v14.18.1',
          communityEdition: true,
          useYarn: false,
        },
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;

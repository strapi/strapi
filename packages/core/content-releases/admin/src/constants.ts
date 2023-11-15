export const PERMISSIONS = {
  main: [
    {
      action: 'plugin::content-releases.read',
      subject: null,
    },
  ],
  create: [
    {
      action: 'plugin::content-releases.create',
      subject: null,
    },
  ],
};

export const MOCK_ALL_RELEASES_PERMISSIONS = [
  {
    id: 301,
    action: 'plugin::content-releases.read',
    subject: null,
    properties: {},
    conditions: [],
    actionParameters: {},
  },
  {
    id: 302,
    action: 'plugin::content-releases.create',
    subject: null,
    properties: {},
    conditions: [],
    actionParameters: {},
  },
];

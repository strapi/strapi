/* -------------------------------------------------------------------------------------------------
 * MOCK_DATA_EXPORTS
 * -----------------------------------------------------------------------------------------------*/

const mockData = {
  webhooks: [
    { id: 1, isEnabled: true, name: 'test', url: 'http:://strapi.io' },
    { id: 2, isEnabled: false, name: 'test2', url: 'http://me.io' },
  ],
} as const;

type MockData = typeof mockData;

export { mockData };
export type { MockData };

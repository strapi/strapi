export const config = {
  default: {
    enabled: true,
    provider: 'local',
    sizeLimit: 1000000000, // 1GB
    actionOptions: {},
    sharp: {
      cache: false,
      concurrency: 1,
    },
  },
  validator() {},
};

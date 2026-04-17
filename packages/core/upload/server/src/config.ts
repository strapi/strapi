export const config = {
  default: {
    enabled: true,
    provider: 'local',
    sizeLimit: 1000000000, // 1GB
    actionOptions: {},
    concurrentUploadSize: 1,
  },
  validator(config: { concurrentUploadSize?: unknown }) {
    if (config.concurrentUploadSize !== undefined) {
      if (
        typeof config.concurrentUploadSize !== 'number' ||
        !Number.isInteger(config.concurrentUploadSize) ||
        config.concurrentUploadSize < 1
      ) {
        throw new Error(
          'upload plugin config: "concurrentUploadSize" must be an integer greater than or equal to 1'
        );
      }
    }
  },
};
